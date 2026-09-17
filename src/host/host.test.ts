import { afterEach, describe, expect, it, mock, spyOn } from 'bun:test';
import { request as httpRequest, IncomingMessage } from 'node:http';
import { Socket } from 'node:net';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { z } from 'zod';
import { operation } from '../lib/operation.js';
import { createServer } from '../lib/server.js';
import { allowedHosts, type Host, host, readBody, route, type ServiceFactory } from './host.js';

type FakeClient = { account: string };

const whoami = operation({
  description: 'Report the account this session is bound to.',
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  source: 'https://developers.google.com/example/reference/rest/v1/things/read',
  schema: { input: z.object({}), output: z.object({ account: z.string() }) },
  handler: async (client: FakeClient) => ({ account: client.account }),
});

const echo: ServiceFactory = (account) =>
  createServer(
    { name: 'echo', operations: { whoami }, client: async () => ({ account }) },
    account,
  );

const initialize = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 't', version: '0' },
  },
};
const headers = {
  'content-type': 'application/json',
  accept: 'application/json, text/event-stream',
};

const running: Host[] = [];
async function start(
  overrides: Partial<Parameters<typeof host>[0]> = {},
  { quiet = true } = {},
): Promise<Host> {
  const h = await host({
    services: { echo },
    accounts: ['personal', 'work'],
    port: 0,
    ...(quiet ? { log: () => {} } : {}),
    ...overrides,
  });
  running.push(h);
  return h;
}
afterEach(async () => {
  await Promise.all(running.splice(0).map((h) => h.close()));
});

async function connect(url: string, opts?: { headers?: Record<string, string> }) {
  const transport = new StreamableHTTPClientTransport(new URL(url), {
    requestInit: opts?.headers ? { headers: opts.headers } : {},
  });
  const mcp = new Client({ name: 'test-client', version: '0' });
  // Same get/set typing gap as the server side; see host.ts.
  await mcp.connect(transport as unknown as Transport);
  return { mcp, transport };
}

describe('route', () => {
  it('parses /<account>/<service>, decoding each segment', () => {
    expect(route('/personal/gmail')).toEqual({ account: 'personal', service: 'gmail' });
    expect(route('/me%40x.com/drive?x=1')).toEqual({ account: 'me@x.com', service: 'drive' });
    expect(route('/personal/gmail/')).toEqual({ account: 'personal', service: 'gmail' });
  });

  it('misses on any other depth, and on no URL at all', () => {
    expect(route('/')).toBeNull();
    expect(route('/personal')).toBeNull();
    expect(route('/personal/gmail/extra')).toBeNull();
    expect(route(undefined)).toBeNull();
  });
});

describe('readBody', () => {
  it('settles on stream errors and aborts without waiting for end', async () => {
    for (const event of ['error', 'aborted']) {
      const req = new IncomingMessage(new Socket());
      const pending = readBody(req, 64);
      req.emit('data', Buffer.from('{'));
      req.emit(event, new Error('connection interrupted'));
      expect(await pending).toBeNull();
      req.destroy();
    }
  });
});

describe('allowedHosts', () => {
  it('names the three loopback spellings for a loopback bind', () => {
    expect(allowedHosts('127.0.0.1', 8765)).toEqual([
      '127.0.0.1:8765',
      'localhost:8765',
      '[::1]:8765',
    ]);
    expect(allowedHosts('localhost', 1)).toContain('[::1]:1');
  });

  it('is undefined (guard off) for any other bind', () => {
    expect(allowedHosts('0.0.0.0', 8765)).toBeUndefined();
  });
});

describe('host', () => {
  it('serves one session per client under /<account>/<service>, bound to that account', async () => {
    const h = await start();
    const a = await connect(`${h.url}/personal/echo`);
    const b = await connect(`${h.url}/work/echo`);
    expect(h.sessions()).toBe(2);

    expect((await a.mcp.listTools()).tools.map((t) => t.name)).toEqual(['whoami']);
    expect((await a.mcp.callTool({ name: 'whoami', arguments: {} })).structuredContent).toEqual({
      account: 'personal',
    });
    expect((await b.mcp.callTool({ name: 'whoami', arguments: {} })).structuredContent).toEqual({
      account: 'work',
    });

    await a.transport.terminateSession();
    expect(h.sessions()).toBe(1);
    await b.mcp.close();
  });

  it('rejects a session on another account or service path', async () => {
    const h = await start({ services: { echo, other: echo } });
    const { mcp, transport } = await connect(`${h.url}/personal/echo`);
    for (const path of ['/work/echo', '/personal/other']) {
      for (const method of ['POST', 'GET', 'DELETE']) {
        const res = await fetch(`${h.url}${path}`, {
          method,
          headers: { ...headers, 'mcp-session-id': transport.sessionId! },
          ...(method === 'POST'
            ? { body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }) }
            : {}),
        });
        expect(res.status).toBe(404);
        expect(await res.json()).toEqual({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Session not found on this path; initialize a new one' },
          id: null,
        });
      }
    }
    expect(h.sessions()).toBe(1);
    expect((await mcp.callTool({ name: 'whoami', arguments: {} })).structuredContent).toEqual({
      account: 'personal',
    });
    await mcp.close();
  });

  it('rejects a listen failure and reports an occupied port from the CLI', async () => {
    const h = await start();
    await expect(start({ port: h.port })).rejects.toMatchObject({ code: 'EADDRINUSE' });
    const child = Bun.spawn(
      ['node', 'dist/host/index.js', '--port', String(h.port), '--account', 'test'],
      {
        stdout: 'pipe',
        stderr: 'pipe',
      },
    );
    expect(await child.exited).toBe(1);
    expect(await new Response(child.stderr).text()).toBe(
      `google-mcp-host: port ${h.port} is in use; a google-mcp-host is probably already running; point clients at it\n`,
    );
  });

  it('requires a nonempty token for a non-loopback bind, including the CLI', async () => {
    for (const hostname of ['0.0.0.0', '::', '192.0.2.1']) {
      await expect(start({ hostname })).rejects.toThrow(
        'a non-loopback --host requires --token or GOOGLE_MCP_HOST_TOKEN',
      );
      await expect(start({ hostname, token: '' })).rejects.toThrow(
        'a non-loopback --host requires',
      );
    }
    const child = Bun.spawn(
      ['node', 'dist/host/index.js', '--host', '0.0.0.0', '--account', 'test'],
      {
        env: { ...process.env, GOOGLE_MCP_HOST_TOKEN: '' },
        stdout: 'pipe',
        stderr: 'pipe',
      },
    );
    expect(await child.exited).toBe(1);
    expect(await new Response(child.stderr).text()).toBe(
      'google-mcp-host: a non-loopback --host requires --token or GOOGLE_MCP_HOST_TOKEN\n',
    );
    const h = await start({ hostname: '0.0.0.0', token: 'secret' });
    const res = await fetch(`http://127.0.0.1:${h.port}/personal/echo`, {
      headers: { authorization: 'Bearer secret' },
    });
    expect(res.status).toBe(400);
  });

  it('hands the account label to the service factory', async () => {
    const factory = mock(echo);
    const h = await start({ services: { echo: factory } });
    const { mcp } = await connect(`${h.url}/work/echo`);
    expect(factory).toHaveBeenCalledWith('work');
    await mcp.close();
  });

  it('answers 404 for unknown accounts, services, and path shapes', async () => {
    const h = await start();
    for (const path of ['/nope/echo', '/personal/nope', '/personal', '/personal/echo/extra', '/']) {
      const res = await fetch(`${h.url}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(initialize),
      });
      expect(res.status).toBe(404);
      expect(((await res.json()) as { error: { message: string } }).error.message).toContain(
        '/<account>/<service>',
      );
    }
  });

  it('answers 404 for a session id it does not know', async () => {
    const h = await start();
    const res = await fetch(`${h.url}/personal/echo`, {
      method: 'POST',
      headers: { ...headers, 'mcp-session-id': 'stale' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    });
    expect(res.status).toBe(404);
    expect(h.sessions()).toBe(0);
  });

  it('answers 405 for methods the transport does not define', async () => {
    const h = await start();
    const res = await fetch(`${h.url}/personal/echo`, { method: 'PUT', headers, body: '{}' });
    expect(res.status).toBe(405);
  });

  it('answers 400 when there is no session and the request is not an initialize', async () => {
    const h = await start();
    const post = await fetch(`${h.url}/personal/echo`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    });
    expect(post.status).toBe(400);
    const get = await fetch(`${h.url}/personal/echo`, { headers });
    expect(get.status).toBe(400);
    expect(h.sessions()).toBe(0);
  });

  it('answers 400 for a body that is not JSON', async () => {
    const h = await start();
    const res = await fetch(`${h.url}/personal/echo`, { method: 'POST', headers, body: '{nope' });
    expect(res.status).toBe(400);
  });

  it('answers 413 past the body limit', async () => {
    const h = await start({ maxBodyBytes: 64 });
    const res = await fetch(`${h.url}/personal/echo`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...initialize,
        params: { ...initialize.params, pad: 'x'.repeat(200) },
      }),
    });
    expect(res.status).toBe(413);
  });

  it('closes an overflowing stream before the client finishes sending', async () => {
    const h = await start({ maxBodyBytes: 64 });
    const status = await new Promise<number>((resolve, reject) => {
      let responseStatus = 0;
      const req = httpRequest(
        `${h.url}/personal/echo`,
        {
          method: 'POST',
          headers: { ...headers, 'content-length': '1000000', connection: 'keep-alive' },
        },
        (res) => {
          res.resume();
          responseStatus = res.statusCode!;
        },
      );
      req.on('socket', (socket) => socket.once('close', () => resolve(responseStatus)));
      req.on('error', reject);
      req.write('x'.repeat(65));
    });
    expect(status).toBe(413);
    expect(h.sessions()).toBe(0);
  });

  it('keeps serving after a client aborts a partial body', async () => {
    const h = await start();
    await new Promise<void>((resolve) => {
      const req = httpRequest(`${h.url}/personal/echo`, {
        method: 'POST',
        headers: { ...headers, 'content-length': '1000' },
      });
      req.on('error', () => {});
      req.on('close', resolve);
      req.write('{');
      setTimeout(() => req.destroy(), 20);
    });
    const { mcp } = await connect(`${h.url}/personal/echo`);
    expect((await mcp.listTools()).tools).toHaveLength(1);
    await mcp.close();
  });

  it('requires the bearer token when one is configured', async () => {
    const h = await start({ token: 'secret' });
    const bare = await fetch(`${h.url}/personal/echo`, {
      method: 'POST',
      headers,
      body: JSON.stringify(initialize),
    });
    expect(bare.status).toBe(401);
    const wrong = await fetch(`${h.url}/personal/echo`, {
      method: 'POST',
      headers: { ...headers, authorization: 'Bearer nope' },
      body: JSON.stringify(initialize),
    });
    expect(wrong.status).toBe(401);
    const longer = await fetch(`${h.url}/personal/echo`, {
      method: 'POST',
      headers: { ...headers, authorization: 'Bearer secret-but-longer' },
      body: JSON.stringify(initialize),
    });
    expect(longer.status).toBe(401);

    const { mcp } = await connect(`${h.url}/personal/echo`, {
      headers: { authorization: 'Bearer secret' },
    });
    expect((await mcp.listTools()).tools).toHaveLength(1);
    await mcp.close();
  });

  it('accepts any bearer scheme casing but compares the token exactly', async () => {
    const h = await start({ token: 'Secret' });
    for (const scheme of ['bearer', 'Bearer', 'BEARER', 'bEaReR']) {
      const { mcp } = await connect(`${h.url}/personal/echo`, {
        headers: { authorization: `${scheme} Secret` },
      });
      expect((await mcp.listTools()).tools).toHaveLength(1);
      await mcp.close();
    }
    for (const authorization of ['bearer secret', 'Basic Secret', 'BearerSecret']) {
      const res = await fetch(`${h.url}/personal/echo`, { headers: { authorization } });
      expect(res.status).toBe(401);
    }
  });

  it('rejects a Host header that is not this machine (DNS rebinding)', async () => {
    const h = await start();
    const status = await new Promise<number>((resolve) => {
      const req = httpRequest(
        {
          host: '127.0.0.1',
          port: h.port,
          path: '/personal/echo',
          method: 'POST',
          headers: { ...headers, host: 'evil.example' },
        },
        (res) => {
          res.resume();
          resolve(res.statusCode ?? 0);
        },
      );
      req.end(JSON.stringify(initialize));
    });
    expect(status).toBe(403);
  });

  it('validates Host and Origin before authentication, routing, methods, and body parsing', async () => {
    const factory = mock(echo);
    const h = await start({ token: 'secret', maxBodyBytes: 64, services: { echo: factory } });
    for (const untrusted of [
      { host: 'evil.example' },
      { origin: 'https://evil.example' },
      { origin: 'null' },
      { origin: 'http://localhost:1' },
    ]) {
      for (const [path, method, authorization, body] of [
        ['/personal/echo', 'GET', '', ''],
        ['/unknown/echo', 'GET', 'Bearer secret', ''],
        ['/personal/echo', 'PUT', 'Bearer secret', ''],
        ['/personal/echo', 'POST', 'Bearer secret', '{invalid'],
        ['/personal/echo', 'POST', 'Bearer secret', 'x'.repeat(100)],
      ]) {
        const status = await new Promise<number>((resolve) => {
          const req = httpRequest(
            {
              host: '127.0.0.1',
              port: h.port,
              path,
              method,
              headers: { ...headers, authorization, ...untrusted },
            },
            (res) => {
              res.resume();
              resolve(res.statusCode!);
            },
          );
          req.end(body);
        });
        expect(status).toBe(403);
      }
    }
    expect(factory).not.toHaveBeenCalled();
    expect(h.sessions()).toBe(0);
  });

  it('accepts each loopback origin through initialization and session requests', async () => {
    const h = await start();
    for (const authority of allowedHosts('127.0.0.1', h.port)!) {
      const { mcp } = await connect(`${h.url}/personal/echo`, {
        headers: { origin: `http://${authority}` },
      });
      expect((await mcp.listTools()).tools).toHaveLength(1);
      await mcp.close();
    }
  });

  it('reaps sessions idle past the limit, and the client then sees 404', async () => {
    let clock = 1_000_000;
    const h = await start({ idleMs: 1000, now: () => clock });
    const { mcp } = await connect(`${h.url}/personal/echo`);
    expect(h.reap()).toBe(0);
    clock += 500;
    await mcp.listTools(); // activity refreshes the session
    clock += 800;
    expect(h.reap()).toBe(0);
    clock += 300;
    expect(h.reap()).toBe(1);
    await new Promise((r) => setTimeout(r, 20));
    expect(h.sessions()).toBe(0);
    await expect(mcp.listTools()).rejects.toThrow();
    await mcp.close();
  });

  it('surfaces a factory failure as a 500 with the message, and keeps serving', async () => {
    const lines: string[] = [];
    const broken: ServiceFactory = async () => {
      throw new Error('no token on disk for personal');
    };
    const h = await start({ services: { echo, broken }, log: (l) => lines.push(l) });
    const res = await fetch(`${h.url}/personal/broken`, {
      method: 'POST',
      headers,
      body: JSON.stringify(initialize),
    });
    expect(res.status).toBe(500);
    expect(((await res.json()) as { error: { message: string } }).error.message).toBe(
      'no token on disk for personal',
    );
    expect(lines.some((l) => l.includes('no token on disk'))).toBe(true);
    const { mcp } = await connect(`${h.url}/personal/echo`);
    expect((await mcp.listTools()).tools).toHaveLength(1);
    await mcp.close();
  });

  it('logs to stderr by default and reports its listening line', async () => {
    const err = spyOn(console, 'error').mockImplementation(() => {});
    try {
      const h = await start({}, { quiet: false });
      expect(err).toHaveBeenCalledWith(expect.stringContaining(`listening on ${h.url}`));
      expect(err).toHaveBeenCalledWith(expect.stringContaining('accounts: personal, work'));
    } finally {
      err.mockRestore();
    }
  });

  it('close() ends every session and stops listening', async () => {
    const lines: string[] = [];
    const h = await start({ log: (l) => lines.push(l) });
    const { mcp } = await connect(`${h.url}/personal/echo`);
    expect(h.sessions()).toBe(1);
    await h.close();
    expect(h.sessions()).toBe(0);
    expect(lines.some((l) => /session .* closed/.test(l))).toBe(true);
    await expect(fetch(`${h.url}/personal/echo`)).rejects.toThrow();
    await mcp.close();
  });
});
