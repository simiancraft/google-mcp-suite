import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ENV = [
  'GOOGLE_MCP_DIR',
  'GOOGLE_MCP_TOKEN',
  'GOOGLE_MCP_CLIENT_SECRET',
  'GOOGLE_MCP_ACCOUNT',
] as const;

/**
 * A throwaway `~/.google-mcp` with a fake OAuth client secret and one stored
 * token for `account`, pointed at through `GOOGLE_MCP_DIR`, so a service's
 * `client(account)` can build its authenticated Google client from disk in a
 * test. Nothing here talks to Google: the token is only ever set on the
 * OAuth2 client, never refreshed. Call the returned function to restore the
 * environment and delete the directory.
 */
export function fakeCredentials(account: string): () => void {
  const saved: Record<string, string | undefined> = {};
  for (const key of ENV) saved[key] = process.env[key];
  const dir = mkdtempSync(path.join(os.tmpdir(), 'google-mcp-fake-'));
  for (const key of ENV) delete process.env[key];
  process.env['GOOGLE_MCP_DIR'] = dir;
  writeFileSync(
    path.join(dir, 'client_secret.json'),
    JSON.stringify({ installed: { client_id: 'fake-id', client_secret: 'fake-secret' } }),
  );
  mkdirSync(path.join(dir, 'tokens'), { recursive: true });
  writeFileSync(
    path.join(dir, 'tokens', `${account}.json`),
    JSON.stringify({ refresh_token: 'fake-refresh', access_token: 'fake-access' }),
  );
  return () => {
    for (const key of ENV) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
    rmSync(dir, { recursive: true, force: true });
  };
}
