/**
 * Refresh-token countdown for every known account.
 *
 * In an External + Testing OAuth app, refresh tokens expire 7 days after they
 * are issued. Google does not return an issuance timestamp, so the token file's
 * modification time (written at the end of the consent flow) is the reliable
 * "authorized at" signal. Consumer tokens also carry `refresh_token_expires_in`;
 * when present it is preferred over the flat 7-day assumption.
 */
import { statSync } from 'node:fs';
import { z } from 'zod';
import { type Account, loadAccounts } from '../auth/accounts.js';
import { tokenPath } from '../auth/config.js';
import { readJsonFile } from '../lib/utils/json.js';

// The two token-file fields the doctor reads; tolerant of every other key.
const TokenFile = z.object({
  refresh_token_expires_in: z.number().optional(),
  scope: z.string().optional(),
});

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const DUE_SOON_MS = 48 * 60 * 60 * 1000;

export type TokenState = 'fresh' | 'due-soon' | 'expired' | 'missing';

export type TokenStatus = {
  account: Account;
  authorizedAt?: Date;
  expiresAt?: Date;
  remainingMs?: number;
  state: TokenState;
};

export const ICON: Record<TokenState, string> = {
  fresh: '✓',
  'due-soon': '⚠',
  expired: '✗',
  missing: '·',
};

export function statusFor(account: Account, now: number): TokenStatus {
  let stat: ReturnType<typeof statSync>;
  try {
    stat = statSync(tokenPath(account.label));
  } catch {
    return { account, state: 'missing' };
  }
  const authorizedAt = stat.mtime;
  let lifetimeMs = SEVEN_DAYS_MS;
  try {
    const raw = readJsonFile(tokenPath(account.label), TokenFile);
    if (raw.refresh_token_expires_in !== undefined) {
      lifetimeMs = raw.refresh_token_expires_in * 1000;
    }
  } catch {
    // keep the 7-day default
  }
  const expiresAt = new Date(authorizedAt.getTime() + lifetimeMs);
  const remainingMs = expiresAt.getTime() - now;
  const state: TokenState =
    remainingMs <= 0 ? 'expired' : remainingMs <= DUE_SOON_MS ? 'due-soon' : 'fresh';
  return { account, authorizedAt, expiresAt, remainingMs, state };
}

export function allStatuses(now: number): TokenStatus[] {
  return loadAccounts().map((a) => statusFor(a, now));
}

/** Scopes Google actually granted this account, or null if no token exists. */
export function grantedScopes(label: string): string[] | null {
  try {
    const raw = readJsonFile(tokenPath(label), TokenFile);
    return raw.scope ? raw.scope.split(' ').filter(Boolean) : [];
  } catch {
    return null;
  }
}

export function humanizeRemaining(ms: number | undefined): string {
  if (ms === undefined) return '-';
  if (ms <= 0) return 'expired';
  const hours = Math.floor(ms / 3_600_000);
  const days = Math.floor(hours / 24);
  return days >= 1 ? `${days}d ${hours % 24}h` : `${hours}h`;
}

function stamp(d: Date | undefined): string {
  return d ? d.toISOString().slice(0, 16).replace('T', ' ') : '-';
}

/** `doctor status`: the at-a-glance countdown table. */
export function renderStatus(): void {
  const statuses = allStatuses(Date.now());
  if (statuses.length === 0) {
    console.log('No accounts found. Authorize one: google-mcp-doctor auth you@example.com');
    return;
  }
  console.table(
    statuses.map((s) => ({
      account: s.account.label,
      authorized: stamp(s.authorizedAt),
      expires: stamp(s.expiresAt),
      'time left': humanizeRemaining(s.remainingMs),
      state: `${ICON[s.state]} ${s.state}`,
    })),
  );
  const due = statuses.filter((s) => s.state !== 'fresh');
  if (due.length > 0) {
    console.log(
      `\n${due.length} account(s) need re-auth: ${due.map((d) => d.account.label).join(', ')}`,
    );
    console.log('Run: google-mcp-doctor auth');
  }
}
