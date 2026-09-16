/**
 * Account roster: the doctor drives the OAuth flow across it, and the shared
 * HTTP host (src/host) serves every account on it.
 *
 * The roster lives outside the repo at `<GOOGLE_MCP_DIR>/accounts.json`, so real
 * email addresses never land in version control. Shape:
 *
 *   [
 *     { "label": "personal",    "email": "you@gmail.com" },
 *     { "label": "simiancraft", "email": "you@your-domain.com" }
 *   ]
 *
 * `label` is the GOOGLE_MCP_ACCOUNT value and the token filename
 * (`tokens/<label>.json`); `email` is optional and used as the consent
 * `login_hint` so the right Google account is preselected.
 *
 * The roster is optional. Single-account auth works with no file at all (the
 * email is its own label); the roster only powers `--all`, status, and prefill.
 * When absent, it is inferred from the token files already in `tokens/`.
 */
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { loadConfig } from '../auth/config.js';
import { readJsonFile } from '../lib/utils/json.js';

const AccountsFile = z.array(z.object({ label: z.string(), email: z.string().optional() }));

export type Account = z.infer<typeof AccountsFile>[number];

export function accountsFile(): string {
  return path.join(loadConfig().dir, 'accounts.json');
}

export function loadAccounts(): Account[] {
  try {
    return readJsonFile(accountsFile(), AccountsFile);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return inferFromTokens();
    if (err instanceof z.ZodError) {
      throw new Error('accounts.json must be an array of { label, email? }.');
    }
    throw err;
  }
}

/**
 * Turn a CLI argument into an account, even with no roster: a bare email is its
 * own label and its own login hint, so `doctor auth you@gmail.com` works from a
 * cold start. A known label resolves to its roster entry (with email prefill).
 */
export function toAccount(arg: string, roster: Account[]): Account {
  const known = roster.find((a) => a.label === arg || a.email === arg);
  if (known) return known;
  return arg.includes('@') ? { label: arg, email: arg } : { label: arg };
}

function inferFromTokens(): Account[] {
  try {
    return readdirSync(loadConfig().tokensDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => ({ label: f.replace(/\.json$/, '') }));
  } catch {
    return [];
  }
}
