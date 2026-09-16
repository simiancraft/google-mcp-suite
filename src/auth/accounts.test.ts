import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { accountsFile, loadAccounts, toAccount } from './accounts.js';

const ENV = [
  'GOOGLE_MCP_DIR',
  'GOOGLE_MCP_TOKEN',
  'GOOGLE_MCP_CLIENT_SECRET',
  'GOOGLE_MCP_ACCOUNT',
] as const;
const saved: Record<string, string | undefined> = {};
let dir: string;

beforeEach(() => {
  for (const k of ENV) saved[k] = process.env[k];
  dir = mkdtempSync(path.join(os.tmpdir(), 'auth-accounts-'));
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

describe('toAccount', () => {
  it('treats a bare email as its own label and login hint', () => {
    expect(toAccount('me@gmail.com', [])).toEqual({ label: 'me@gmail.com', email: 'me@gmail.com' });
  });

  it('treats a non-email as a label only', () => {
    expect(toAccount('personal', [])).toEqual({ label: 'personal' });
  });

  it('resolves a known roster label', () => {
    const roster = [{ label: 'work', email: 'me@corp.com' }];
    expect(toAccount('work', roster)).toEqual({ label: 'work', email: 'me@corp.com' });
  });

  it('resolves a known roster email', () => {
    const roster = [{ label: 'work', email: 'me@corp.com' }];
    expect(toAccount('me@corp.com', roster)).toEqual({ label: 'work', email: 'me@corp.com' });
  });
});

describe('accountsFile', () => {
  it('is accounts.json under the config dir', () => {
    expect(accountsFile()).toBe(path.join(dir, 'accounts.json'));
  });
});

describe('loadAccounts', () => {
  it('reads a valid roster file', () => {
    writeFileSync(
      path.join(dir, 'accounts.json'),
      JSON.stringify([{ label: 'a', email: 'a@x.com' }]),
    );
    expect(loadAccounts()).toEqual([{ label: 'a', email: 'a@x.com' }]);
  });

  it('throws on a malformed roster (and rethrows past the catch)', () => {
    writeFileSync(path.join(dir, 'accounts.json'), JSON.stringify({ not: 'an array' }));
    expect(() => loadAccounts()).toThrow(/array of/);
  });

  it('rethrows non-shape errors (broken JSON) untranslated', () => {
    writeFileSync(path.join(dir, 'accounts.json'), '{not json');
    expect(() => loadAccounts()).toThrow(SyntaxError);
  });

  it('infers labels from token files when no roster exists', () => {
    const tokens = path.join(dir, 'tokens');
    mkdirSync(tokens, { recursive: true });
    writeFileSync(path.join(tokens, 'simiancraft.json'), '{}');
    writeFileSync(path.join(tokens, 'personal.json'), '{}');
    writeFileSync(path.join(tokens, 'notes.txt'), 'ignore me');
    expect(
      loadAccounts()
        .map((a) => a.label)
        .sort(),
    ).toEqual(['personal', 'simiancraft']);
  });

  it('returns [] when neither roster nor tokens dir exist', () => {
    expect(loadAccounts()).toEqual([]);
  });
});
