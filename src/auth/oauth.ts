import { randomBytes } from 'node:crypto';
import { chmodSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { CodeChallengeMethod, OAuth2Client } from 'google-auth-library';
import open from 'open';
import { z } from 'zod';
import { forGoogle } from '../lib/optionality.js';
import { readJsonFile } from '../lib/utils/json.js';
import { loadConfig, resolveAccount, SCOPES, tokenPath } from './config.js';

export const AUTH_TIMEOUT_MS = 5 * 60 * 1000;

// The loopback IP literal, not `localhost` (RFC 8252 section 8.3, and Google's
// loopback guidance): name resolution is host-file-manipulable and can point
// `localhost` at ::1 where nothing listens.
const redirectUri = (port: number) => `http://127.0.0.1:${port}/oauth2callback`;

const ClientKeys = z.object({
  client_id: z.string().optional(),
  client_secret: z.string().optional(),
});

/** The two shapes Google's console downloads use; everything else is rejected below. */
const ClientSecretFile = z.object({
  installed: ClientKeys.optional(),
  web: ClientKeys.optional(),
});

type ClientSecret = { client_id: string; client_secret: string };

function loadClientSecret(): ClientSecret {
  const secretPath = loadConfig().clientSecretPath;
  let raw: z.infer<typeof ClientSecretFile>;
  try {
    raw = readJsonFile(secretPath, ClientSecretFile);
  } catch (err) {
    if (err instanceof z.ZodError) {
      throw new Error(
        `Invalid OAuth client secret at ${secretPath} (expected "installed" or "web").`,
      );
    }
    throw err;
  }
  const keys = raw.installed ?? raw.web;
  if (!keys?.client_id || !keys.client_secret) {
    throw new Error(
      `Invalid OAuth client secret at ${secretPath} (expected "installed" or "web").`,
    );
  }
  return { client_id: keys.client_id, client_secret: keys.client_secret };
}

/**
 * The token fields the library refreshes from; everything else Google stores
 * in the file rides along untyped (the file is this suite's own write).
 */
const StoredToken = z.looseObject({
  access_token: z.string().optional(),
  refresh_token: z.string().optional(),
});

function newClient(port = 3000): OAuth2Client {
  const { client_id, client_secret } = loadClientSecret();
  return new OAuth2Client(client_id, client_secret, redirectUri(port));
}

/**
 * Build an authenticated client for `account` (default: GOOGLE_MCP_ACCOUNT) from
 * its stored token. The library auto-refreshes the access token from the refresh
 * token as needed.
 */
export async function authorizedClient(account?: string): Promise<OAuth2Client> {
  const client = newClient();
  const config = loadConfig();
  const token = readJsonFile(tokenPath(resolveAccount(account, config), config), StoredToken);
  // forGoogle drops undefined-valued keys, reconciling zod's `?: T | undefined`
  // with the library's exactOptionalPropertyTypes-strict Credentials.
  client.setCredentials(forGoogle(token));
  return client;
}

/**
 * The shape gaxios gives an error when Google's token endpoint rejects a
 * refresh: `response.data.error` carries the OAuth 2.0 error code (RFC 6749
 * section 5.2). Typed on the response body, never on message text, so an
 * operation error that merely mentions "invalid_grant" cannot match.
 */
const TokenEndpointError = z.object({
  response: z.object({ data: z.object({ error: z.string() }) }),
});

/**
 * True when an error is Google's token endpoint refusing the stored refresh
 * token (`invalid_grant`: expired or revoked). No retry with the same client
 * can succeed, but a rebuild from disk heals the instance after a re-auth.
 * A false negative degrades to the plain error envelope; the shape check
 * makes a false positive structurally impossible.
 */
export function isInvalidGrant(error: unknown): boolean {
  const parsed = TokenEndpointError.safeParse(error);
  return parsed.success && parsed.data.response.data.error === 'invalid_grant';
}

/**
 * Run the browser consent flow for `account` and persist its token. The token
 * file is written 0600 inside a 0700 tokens dir; the consent requests offline
 * access and forces the screen so a refresh token is always returned. The flow
 * carries a random `state` (verified at the callback: any browser tab can fire
 * requests at the loopback port, since CORS blocks reads, not sends, so only
 * the redirect Google issued for this flow is accepted) and PKCE (RFC 8252
 * section 8.1: a local process that wins a race for the port cannot exchange
 * an intercepted code without the verifier). The default port falls back to a
 * free loopback port if busy; an explicit `port` must be free. The bound port
 * determines the redirect URI. `port`, `openBrowser`, and
 * `timeoutMs` are injectable for testing; the callback server is closed on
 * every exit path, including an abandoned consent. `loginHint` prefills the
 * Google account chooser when the account label is not itself an email
 * (e.g. a short alias like `personal`).
 */
export async function runAuthFlow(
  account?: string,
  options: {
    port?: number;
    openBrowser?: (url: string) => unknown;
    loginHint?: string;
    timeoutMs?: number;
  } = {},
): Promise<void> {
  let port = options.port ?? 3000;
  const openBrowser = options.openBrowser ?? open;
  const timeoutMs = options.timeoutMs ?? AUTH_TIMEOUT_MS;
  const config = loadConfig();
  const acct = resolveAccount(account, config);
  const server = createServer();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const listen = (preferred: number) =>
    new Promise<void>((resolve, reject) => {
      const onError = (error: NodeJS.ErrnoException) => {
        server.off('listening', onListening);
        reject(error);
      };
      const onListening = () => {
        server.off('error', onError);
        resolve();
      };
      server.once('error', onError);
      server.once('listening', onListening);
      // Loopback only: never expose the consent callback to the LAN.
      server.listen(preferred, '127.0.0.1');
    });
  try {
    try {
      await listen(port);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EADDRINUSE') throw error;
      if (options.port !== undefined) {
        throw new Error(`Callback port ${port} is already in use; choose another --port.`);
      }
      await listen(0);
    }
    port = (server.address() as AddressInfo).port;
    console.error(`OAuth callback listening on 127.0.0.1:${port}.`);
    const client = newClient(port);
    const loginHint = options.loginHint ?? (acct.includes('@') ? acct : undefined);
    const { codeVerifier, codeChallenge } = await client.generateCodeVerifierAsync();
    if (!codeChallenge) {
      throw new Error('PKCE challenge generation failed; cannot start the consent flow.');
    }
    const state = randomBytes(16).toString('hex');
    const authUrl = client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: SCOPES,
      state,
      code_challenge_method: CodeChallengeMethod.S256,
      code_challenge: codeChallenge,
      ...(loginHint ? { login_hint: loginHint } : {}),
    });

    await new Promise<void>((resolve, reject) => {
      server.on('request', async (req, res) => {
        // Absolute-form request targets reach req.url verbatim, and an
        // unparseable one (proxy-style "GET http:// HTTP/1.1") would throw in
        // the URL constructor; answer 400 rather than crash the flow on an
        // unhandled rejection.
        let requested: URL;
        try {
          requested = new URL(req.url ?? '/', redirectUri(port));
        } catch {
          res.writeHead(400);
          res.end();
          return;
        }
        if (requested.pathname !== '/oauth2callback') {
          // Browsers probe for favicons; answer rather than leave sockets hanging.
          res.writeHead(404);
          res.end();
          return;
        }
        const finish = (status: number, body: string, err?: unknown) => {
          res.writeHead(status);
          res.end(body);
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        };
        const params = requested.searchParams;
        if (params.get('state') !== state) {
          finish(403, 'State mismatch.', new Error('OAuth state mismatch; possible CSRF.'));
          return;
        }
        const code = params.get('code');
        if (!code) {
          finish(
            400,
            'No authorization code provided.',
            new Error('No authorization code provided.'),
          );
          return;
        }
        try {
          const { tokens } = await client.getToken({ code, codeVerifier });
          mkdirSync(config.tokensDir, { recursive: true, mode: 0o700 });
          // mkdir's mode applies only on create; tighten a pre-existing dir so
          // token filenames (account labels) stay unreadable to other users.
          chmodSync(config.tokensDir, 0o700);
          const file = tokenPath(acct, config);
          // Recreate rather than overwrite: writeFileSync applies mode only on
          // create, and tightening afterwards would leave fresh token bytes
          // briefly readable through a pre-existing looser mode.
          rmSync(file, { force: true });
          writeFileSync(file, JSON.stringify(tokens), { mode: 0o600 });
          finish(200, `Authorized ${acct}. You can close this window.`);
        } catch (error) {
          finish(500, 'Authentication failed.', error);
        }
      });
      timer = setTimeout(() => {
        reject(new Error(`Authorization timed out after ${timeoutMs}ms; rerun doctor auth.`));
      }, timeoutMs);
      server.on('error', reject);
      console.error(`Visit this URL to authorize ${acct}:\n${authUrl}`);
      Promise.resolve()
        .then(() => openBrowser(authUrl))
        .catch(reject);
    });
  } finally {
    clearTimeout(timer);
    server.close();
  }
}
