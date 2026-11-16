import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SCOPES } from '../auth/config.js';
import { diagnose, renderScopes } from './diagnose.js';
import type { ServiceInfo } from './services.js';

const ENV = [
  'GOOGLE_MCP_DIR',
  'GOOGLE_MCP_TOKEN',
  'GOOGLE_MCP_CLIENT_SECRET',
  'GOOGLE_MCP_ACCOUNT',
] as const;
const saved: Record<string, string | undefined> = {};
let dir: string;
const DAY = 24 * 3600 * 1000;
const allScopes = SCOPES.join(' ');

beforeEach(() => {
  for (const k of ENV) saved[k] = process.env[k];
  dir = mkdtempSync(path.join(os.tmpdir(), 'doctor-diagnose-'));
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

function writeSecret(): void {
  writeFileSync(
    path.join(dir, 'client_secret.json'),
    JSON.stringify({ installed: { client_id: 'i', client_secret: 's' } }),
  );
}

function writeRoster(accounts: { label: string; email?: string }[]): void {
  writeFileSync(path.join(dir, 'accounts.json'), JSON.stringify(accounts));
}

function writeToken(label: string, scope?: string): void {
  const tokens = path.join(dir, 'tokens');
  mkdirSync(tokens, { recursive: true });
  const file = path.join(tokens, `${label}.json`);
  writeFileSync(file, JSON.stringify(scope !== undefined ? { scope } : {}));
  const t = (Date.now() - DAY) / 1000;
  utimesSync(file, t, t);
}

function capture(): ReturnType<typeof spyOn> {
  return spyOn(console, 'log').mockImplementation(() => {});
}

function output(log: ReturnType<typeof spyOn>): string {
  return log.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
}

describe('diagnose', () => {
  it('flags missing provisioning and scope drift, and points to provisioning', async () => {
    const log = capture();
    await diagnose({ services: [], now: Date.now(), probe: true });
    const out = output(log);
    expect(out).toContain('[✗] OAuth client secret');
    expect(out).toContain('Create an OAuth Desktop client');
    expect(out).toContain('unattributed in services.ts');
    expect(out).toContain('none yet');
    expect(out).toContain('Next: finish provisioning');
    log.mockRestore();
  });

  it('flags scopes declared but not in the canonical union', async () => {
    writeSecret();
    const services: ServiceInfo[] = [
      {
        name: 'x',
        api: 'x.googleapis.com',
        scopes: [...SCOPES, 'https://extra/'],
        implemented: false,
      },
    ];
    const log = capture();
    await diagnose({ services, now: Date.now(), probe: true });
    const out = output(log);
    expect(out).toContain('not in auth SCOPES');
    expect(out).toContain('Next: authorize an account');
    log.mockRestore();
  });

  it('reports per-account scope coverage and probes services', async () => {
    writeSecret();
    writeRoster([{ label: 'full' }, { label: 'gone' }, { label: 'partial' }]);
    writeToken('full', allScopes);
    writeToken('partial', SCOPES.slice(1).join(' '));
    const services: ServiceInfo[] = [
      {
        name: 'ok',
        api: 'a.googleapis.com',
        scopes: [...SCOPES],
        implemented: true,
        probe: async (a) => `who-${a}`,
      },
      {
        name: 'fail',
        api: 'b.googleapis.com',
        scopes: [],
        implemented: true,
        probe: async () => {
          throw new Error('boom');
        },
      },
      { name: 'planned', api: 'c.googleapis.com', scopes: [], implemented: false },
      { name: 'noprobe', api: 'd.googleapis.com', scopes: [], implemented: true },
    ];
    const log = capture();
    await diagnose({ services, now: Date.now(), probe: true });
    const out = output(log);
    expect(out).toContain('[✓] OAuth client secret');
    expect(out).toContain('[✓] Scope registry');
    expect(out).toContain(`full  ${SCOPES.length}/${SCOPES.length} scopes`);
    expect(out).toContain('gone  no token');
    expect(out).toContain('MISSING 1 scope');
    expect(out).toContain('✓ ok  full → who-full');
    expect(out).toContain('✗ fail  full → boom');
    expect(out).toContain('· planned  planned');
    expect(out).toContain('noprobe  implemented');
    expect(out).toContain('Next: authorize 1 account');
    expect(out).toContain(
      "If you are an AI agent, run the auth command yourself; it opens the person's browser and waits for the callback, and the person only approves the consent screen. Run one account at a time, then rerun google-mcp-doctor.",
    );
    log.mockRestore();
  });

  it('notes when there is no authorized account to probe', async () => {
    writeSecret();
    writeRoster([{ label: 'gone' }]);
    const services: ServiceInfo[] = [
      {
        name: 'ok',
        api: 'a.googleapis.com',
        scopes: [...SCOPES],
        implemented: true,
        probe: async () => 'x',
      },
    ];
    const log = capture();
    await diagnose({ services, now: Date.now(), probe: true });
    expect(output(log)).toContain('(no account to probe)');
    log.mockRestore();
  });

  it('skips probes and reports all-set when fresh with --no-probe', async () => {
    writeSecret();
    writeRoster([{ label: 'full' }]);
    writeToken('full', allScopes);
    const probe = mock(async () => 'x');
    const services: ServiceInfo[] = [
      { name: 'ok', api: 'a.googleapis.com', scopes: [...SCOPES], implemented: true, probe },
    ];
    const log = capture();
    await diagnose({ services, now: Date.now(), probe: false });
    const out = output(log);
    expect(probe).not.toHaveBeenCalled();
    expect(out).toContain('ok  implemented');
    expect(out).toContain('All set');
    log.mockRestore();
  });
});

describe('renderScopes', () => {
  it('prints the APIs and scopes to enable', () => {
    const log = capture();
    renderScopes();
    const out = output(log);
    expect(out).toContain('Enable these Google Cloud APIs');
    expect(out).toContain('gmail.googleapis.com');
    expect(out).toContain('https://mail.google.com/');
    log.mockRestore();
  });
});
