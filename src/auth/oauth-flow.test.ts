import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer, Server } from 'node:http';
import { type AddressInfo, connect } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { OAuth2Client } from 'google-auth-library';
import { runAuthFlow } from './oauth.js';

const ENV = ['GOOGLE_MCP_DIR', 'GOOGLE_MCP_CLIENT_SECRET', 'GOOGLE_MCP_TOKEN'] as const;
let dir: string;
const saved: Record<string, string | undefined> = {};
let errSpy: ReturnType<typeof spyOn>;

beforeEach(() => {
  dir = mkdtempSync(path.join(os.tmpdir(), 'oauth-flow-'));
  writeFileSync(
    path.join(dir, 'client_secret.json'),
    JSON.stringify({ installed: { client_id: 'id', client_secret: 'secret' } }),
  );
  for (const k of ENV) saved[k] = process.env[k];
  process.env['GOOGLE_MCP_DIR'] = dir;
  process.env['GOOGLE_MCP_CLIENT_SECRET'] = path.join(dir, 'client_secret.json');
  process.env['GOOGLE_MCP_TOKEN'] = path.join(dir, 'token.json');
  errSpy = spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  for (const k of ENV) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  rmSync(dir, { recursive: true, force: true });
  errSpy.mockRestore();
});

function stateOf(authUrl: string): string {
  return new URL(authUrl).searchParams.get('state') ?? '';
}

/**
 * The consent URL is handed to `openBrowser` only after the async PKCE
 * challenge is generated, so tests must await the capture rather than read a
 * variable synchronously.
 */
function captureAuthUrl(): { url: Promise<string>; openBrowser: (u: string) => void } {
  let resolve!: (u: string) => void;
  const url = new Promise<string>((r) => {
    resolve = r;
  });
  return { url, openBrowser: resolve };
}

async function hitCallback(port: number, query: string): Promise<number> {
  for (let i = 0; i < 40; i++) {
    try {
      return (await fetch(`http://127.0.0.1:${port}/oauth2callback${query}`)).status;
    } catch {
      await new Promise((r) => setTimeout(r, 25));
    }
  }
  throw new Error('callback server never came up');
}

describe('runAuthFlow', () => {
  it('exchanges the code and writes a 0600 token', async () => {
    const spy = spyOn(OAuth2Client.prototype, 'getToken').mockResolvedValue({
      tokens: { access_token: 'a', refresh_token: 'r' },
    } as never);
    const { url, openBrowser } = captureAuthUrl();
    const flow = runAuthFlow('me@example.com', { port: 31731, openBrowser });
    const authUrl = await url;
    const status = await hitCallback(31731, `?code=fake&state=${stateOf(authUrl)}`);
    await flow;
    expect(status).toBe(200);
    expect(authUrl).toContain('code_challenge=');
    expect(authUrl).toContain('code_challenge_method=S256');
    const token = JSON.parse(readFileSync(path.join(dir, 'token.json'), 'utf8'));
    expect(token.refresh_token).toBe('r');
    expect(statSync(path.join(dir, 'token.json')).mode & 0o777).toBe(0o600);
    spy.mockRestore();
  });

  it('uses loginHint to prefill the consent account', async () => {
    const spy = spyOn(OAuth2Client.prototype, 'getToken').mockResolvedValue({
      tokens: { access_token: 'a', refresh_token: 'r' },
    } as never);
    const { url, openBrowser } = captureAuthUrl();
    const flow = runAuthFlow('personal', {
      port: 31734,
      openBrowser,
      loginHint: 'someone@gmail.com',
    });
    const authUrl = await url;
    await hitCallback(31734, `?code=fake&state=${stateOf(authUrl)}`);
    await flow;
    expect(authUrl).toContain('login_hint=someone%40gmail.com');
    spy.mockRestore();
  });

  it('rejects when the callback has no code', async () => {
    const { url, openBrowser } = captureAuthUrl();
    const flow = runAuthFlow('acct', { port: 31732, openBrowser });
    const rejection = flow.then<Error | undefined>(
      () => undefined,
      (e) => e,
    );
    const authUrl = await url;
    const status = await hitCallback(31732, `?state=${stateOf(authUrl)}`);
    expect(status).toBe(400);
    expect((await rejection)?.message).toMatch(/No authorization code/);
  });

  it('rejects a callback whose state does not match (CSRF guard)', async () => {
    const flow = runAuthFlow('acct', { port: 31735, openBrowser: () => {} });
    const rejection = flow.then<Error | undefined>(
      () => undefined,
      (e) => e,
    );
    const status = await hitCallback(31735, '?code=attacker&state=wrong');
    expect(status).toBe(403);
    expect((await rejection)?.message).toMatch(/state mismatch/i);
  });

  it('passes the PKCE verifier to the token exchange', async () => {
    let got: unknown;
    const spy = spyOn(OAuth2Client.prototype, 'getToken').mockImplementation((async (
      opts: unknown,
    ) => {
      got = opts;
      return { tokens: { access_token: 'a', refresh_token: 'r' } };
    }) as never);
    const { url, openBrowser } = captureAuthUrl();
    const flow = runAuthFlow('acct', { port: 31736, openBrowser });
    const authUrl = await url;
    await hitCallback(31736, `?code=fake&state=${stateOf(authUrl)}`);
    await flow;
    expect((got as { code?: string }).code).toBe('fake');
    expect(typeof (got as { codeVerifier?: string }).codeVerifier).toBe('string');
    spy.mockRestore();
  });

  it('recreates a pre-existing loose token file at 0600', async () => {
    const spy = spyOn(OAuth2Client.prototype, 'getToken').mockResolvedValue({
      tokens: { access_token: 'a', refresh_token: 'r' },
    } as never);
    writeFileSync(path.join(dir, 'token.json'), '{}', { mode: 0o644 });
    const { url, openBrowser } = captureAuthUrl();
    const flow = runAuthFlow('acct', { port: 31741, openBrowser });
    const authUrl = await url;
    await hitCallback(31741, `?code=fake&state=${stateOf(authUrl)}`);
    await flow;
    expect(statSync(path.join(dir, 'token.json')).mode & 0o777).toBe(0o600);
    spy.mockRestore();
  });

  it('answers an unparseable absolute-form request target with 400 instead of crashing', async () => {
    const spy = spyOn(OAuth2Client.prototype, 'getToken').mockResolvedValue({
      tokens: { access_token: 'a', refresh_token: 'r' },
    } as never);
    const { url, openBrowser } = captureAuthUrl();
    const flow = runAuthFlow('acct', { port: 31742, openBrowser });
    const authUrl = await url;
    // fetch cannot send a proxy-style request line; write one raw.
    const statusLine = await new Promise<string>((resolve, reject) => {
      const socket = connect(31742, '127.0.0.1', () => {
        socket.write('GET http:// HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n');
      });
      socket.on('data', (chunk) => {
        resolve(chunk.toString('utf8').split('\r\n')[0] ?? '');
        socket.end();
      });
      socket.on('error', reject);
    });
    expect(statusLine).toContain('400');
    const status = await hitCallback(31742, `?code=fake&state=${stateOf(authUrl)}`);
    expect(status).toBe(200);
    await flow;
    spy.mockRestore();
  });

  it('answers non-callback paths with 404 and keeps the flow alive', async () => {
    const spy = spyOn(OAuth2Client.prototype, 'getToken').mockResolvedValue({
      tokens: { access_token: 'a', refresh_token: 'r' },
    } as never);
    const { url, openBrowser } = captureAuthUrl();
    const flow = runAuthFlow('acct', { port: 31740, openBrowser });
    const authUrl = await url;
    let favicon: Response | undefined;
    for (let i = 0; i < 40 && !favicon; i++) {
      favicon = await fetch('http://127.0.0.1:31740/favicon.ico').catch(() => undefined);
      if (!favicon) await new Promise((r) => setTimeout(r, 25));
    }
    expect(favicon?.status).toBe(404);
    const status = await hitCallback(31740, `?code=fake&state=${stateOf(authUrl)}`);
    expect(status).toBe(200);
    await flow;
    spy.mockRestore();
  });

  it('refuses to start when no PKCE challenge can be generated', async () => {
    const spy = spyOn(OAuth2Client.prototype, 'generateCodeVerifierAsync').mockResolvedValue({
      codeVerifier: 'v',
      codeChallenge: undefined,
    } as never);
    const rejection = runAuthFlow('acct', { port: 31739, openBrowser: () => {} }).then<
      Error | undefined
    >(
      () => undefined,
      (e) => e,
    );
    expect((await rejection)?.message).toMatch(/PKCE challenge/);
    spy.mockRestore();
  });

  it('rejects when the callback port is already in use', async () => {
    const blocker = createServer(() => {});
    await new Promise<void>((r) => blocker.listen(31738, r));
    const rejection = runAuthFlow('acct', { port: 31738, openBrowser: () => {} }).then<
      Error | undefined
    >(
      () => undefined,
      (e) => e,
    );
    // Node says "EADDRINUSE: address already in use"; Bun says "Is port N in use?".
    expect((await rejection)?.message).toMatch(/in use/i);
    blocker.close();
  });

  it('times out an abandoned consent and frees the port', async () => {
    const flow = runAuthFlow('acct', { port: 31737, openBrowser: () => {}, timeoutMs: 100 });
    const rejection = flow.then<Error | undefined>(
      () => undefined,
      (e) => e,
    );
    expect((await rejection)?.message).toMatch(/timed out/);
    const probe = createServer();
    await new Promise<void>((resolve) => probe.listen(31737, '127.0.0.1', resolve));
    probe.close();
  });

  it('falls back from an occupied preferred port and uses the bound port in the redirect URI', async () => {
    const blocker = createServer();
    await new Promise<void>((resolve) => blocker.listen(0, '127.0.0.1', resolve));
    const occupiedPort = (blocker.address() as AddressInfo).port;
    // Exercise a real bind failure without depending on whether a dev server owns 3000.
    const listen = Server.prototype.listen;
    const binding = spyOn(Server.prototype, 'listen').mockImplementation(function (
      this: Server,
      ...args: unknown[]
    ) {
      if (args[0] === 3000) args[0] = occupiedPort;
      return Reflect.apply(listen, this, args);
    });
    try {
      const { url, openBrowser } = captureAuthUrl();
      const flow = runAuthFlow('acct', { openBrowser });
      const rejection = flow.catch((error: Error) => error);
      const authUrl = new URL(await url);
      const redirect = new URL(authUrl.searchParams.get('redirect_uri') ?? '');
      expect(redirect.hostname).toBe('127.0.0.1');
      expect(redirect.pathname).toBe('/oauth2callback');
      expect(Number(redirect.port)).toBeGreaterThan(0);
      expect(Number(redirect.port)).not.toBe(occupiedPort);
      expect(errSpy).toHaveBeenCalledWith(
        `OAuth callback listening on 127.0.0.1:${redirect.port}.`,
      );
      expect(await hitCallback(Number(redirect.port), '?state=wrong')).toBe(403);
      expect(await rejection).toBeInstanceOf(Error);
    } finally {
      binding.mockRestore();
      blocker.close();
    }
  });

  it('surfaces other listen errors without opening a browser', async () => {
    const spy = spyOn(Server.prototype, 'listen').mockImplementation(function (this: Server) {
      queueMicrotask(() =>
        this.emit('error', Object.assign(new Error('listen denied'), { code: 'EACCES' })),
      );
      return this;
    });
    try {
      await expect(
        runAuthFlow('acct', {
          openBrowser: () => {
            throw new Error('browser must not open');
          },
        }),
      ).rejects.toThrow('listen denied');
    } finally {
      spy.mockRestore();
    }
  });

  it('closes the bound server when opening the browser fails', async () => {
    let port = 0;
    await expect(
      runAuthFlow('acct', {
        port: 0,
        openBrowser: async (url) => {
          port = Number(new URL(new URL(url).searchParams.get('redirect_uri') ?? '').port);
          throw new Error('browser failed');
        },
      }),
    ).rejects.toThrow('browser failed');
    const probe = createServer();
    await new Promise<void>((resolve) => probe.listen(port, '127.0.0.1', resolve));
    probe.close();
  });

  it('rejects when the token exchange fails', async () => {
    const spy = spyOn(OAuth2Client.prototype, 'getToken').mockRejectedValue(
      new Error('bad code') as never,
    );
    const { url, openBrowser } = captureAuthUrl();
    const flow = runAuthFlow('acct', { port: 31733, openBrowser });
    const rejection = flow.then<Error | undefined>(
      () => undefined,
      (e) => e,
    );
    const authUrl = await url;
    const status = await hitCallback(31733, `?code=fake&state=${stateOf(authUrl)}`);
    expect(status).toBe(500);
    expect((await rejection)?.message).toContain('bad code');
    spy.mockRestore();
  });
});
