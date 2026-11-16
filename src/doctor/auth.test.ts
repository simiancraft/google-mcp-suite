import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { runAuth, selectTargets } from './auth.js';

const ENV = [
  'GOOGLE_MCP_DIR',
  'GOOGLE_MCP_TOKEN',
  'GOOGLE_MCP_CLIENT_SECRET',
  'GOOGLE_MCP_ACCOUNT',
] as const;
const saved: Record<string, string | undefined> = {};
let dir: string;
const DAY = 24 * 3600 * 1000;

beforeEach(() => {
  for (const k of ENV) saved[k] = process.env[k];
  dir = mkdtempSync(path.join(os.tmpdir(), 'doctor-auth-'));
  for (const k of ENV) delete process.env[k];
  process.env['GOOGLE_MCP_DIR'] = dir;
});

afterEach(() => {
  for (const k of ENV) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  rmSync(dir, { recursive: true, force: true });
});

function freshToken(label: string): void {
  const tokens = path.join(dir, 'tokens');
  mkdirSync(tokens, { recursive: true });
  const file = path.join(tokens, `${label}.json`);
  writeFileSync(file, JSON.stringify({ access_token: 'a', refresh_token: 'r' }));
  const t = (Date.now() - DAY) / 1000;
  utimesSync(file, t, t);
}

function writeRoster(accounts: { label: string; email?: string }[]): void {
  writeFileSync(path.join(dir, 'accounts.json'), JSON.stringify(accounts));
}

describe('selectTargets', () => {
  it('maps explicit names through the roster (ad-hoc allowed)', () => {
    expect(selectTargets(['me@x.com'], [])).toEqual([{ label: 'me@x.com', email: 'me@x.com' }]);
  });

  it('returns the whole roster for --all', () => {
    const roster = [{ label: 'a', email: 'a@x.com' }];
    expect(selectTargets(['--all'], roster)).toEqual(roster);
  });

  it('throws on --all with an empty roster', () => {
    expect(() => selectTargets(['--all'], [])).toThrow(/No accounts configured/);
  });

  it('defaults to the accounts that are not fresh', () => {
    freshToken('fresh');
    const due = selectTargets([], [{ label: 'fresh' }, { label: 'gone' }], Date.now());
    expect(due.map((a) => a.label)).toEqual(['gone']);
  });
});

describe('runAuth', () => {
  it('reports nothing due when every token is fresh', async () => {
    writeRoster([{ label: 'fresh' }]);
    freshToken('fresh');
    const authorize = mock(async (_a?: string, _o?: unknown) => {});
    const log = spyOn(console, 'log').mockImplementation(() => {});
    await runAuth([], { authorize });
    expect(authorize).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(expect.stringContaining('Nothing due'));
    log.mockRestore();
  });

  it('authorizes each target, prefilling login hint for emails only', async () => {
    const authorize = mock(
      async (_a?: string, _o?: { openBrowser?: (u: string) => unknown; loginHint?: string }) => {
        _o?.openBrowser?.('https://example.com');
      },
    );
    const openBrowser = (): void => {};
    const log = spyOn(console, 'log').mockImplementation(() => {});
    await runAuth(['x@y.com', 'plain'], { authorize, openBrowser });
    expect(authorize.mock.calls[0]?.[0]).toBe('x@y.com');
    expect(authorize.mock.calls[0]?.[1]?.loginHint).toBe('x@y.com');
    expect(authorize.mock.calls[1]?.[0]).toBe('plain');
    expect(authorize.mock.calls[1]?.[1]?.loginHint).toBeUndefined();
    expect(log).toHaveBeenCalledWith(
      'Browser opened for x@y.com (x@y.com); waiting for consent approval. This command times out after 300 seconds.',
    );
    expect(log).toHaveBeenCalledWith(
      'Browser opened for plain; waiting for consent approval. This command times out after 300 seconds.',
    );
    expect(log).toHaveBeenCalledWith(expect.stringContaining('Done.'));
    log.mockRestore();
  });
  it('passes --port separately from account selection, including --all', async () => {
    writeRoster([{ label: 'plain' }]);
    const authorize = mock(async (_a?: string, _o?: { port?: number }) => {});
    await runAuth(['--all', '--port', '0'], { authorize });
    expect(authorize.mock.calls).toHaveLength(1);
    expect(authorize.mock.calls[0]?.[0]).toBe('plain');
    expect(authorize.mock.calls[0]?.[1]?.port).toBe(0);
  });

  it('rejects invalid or missing ports before starting auth', async () => {
    const authorize = mock(async () => {});
    for (const raw of ['abc', '-1', '1.5', '65536', '', ' ']) {
      await expect(runAuth(['plain', '--port', raw], { authorize })).rejects.toThrow('--port');
    }
    await expect(runAuth(['plain', '--port'], { authorize })).rejects.toThrow();
    expect(authorize).not.toHaveBeenCalled();
  });

  it('fails clearly when an explicit --port is occupied', async () => {
    const blocker = createServer();
    await new Promise<void>((resolve) => blocker.listen(0, '127.0.0.1', resolve));
    const port = (blocker.address() as AddressInfo).port;
    const openBrowser = mock(() => {});
    try {
      await expect(runAuth(['plain', '--port', String(port)], { openBrowser })).rejects.toThrow(
        `Callback port ${port} is already in use; choose another --port.`,
      );
      expect(openBrowser).not.toHaveBeenCalled();
    } finally {
      blocker.close();
    }
  });
});
