import os from 'node:os';
import path from 'node:path';
import { z } from 'zod';

/**
 * One typed, validated view of the runtime configuration.
 *
 * `loadConfig()` is the single place configuration is read from `process.env`;
 * everything else reads the returned `Config`. (Two sanctioned non-Config
 * reads elsewhere: `server()` in src/lib/server.ts reads `GOOGLE_MCP_ACCOUNT`
 * at startup, where instance identity is bound, and the doctor's `detectWsl`
 * probes `WSL_DISTRO_NAME` for host detection.) It is read lazily (on call,
 * not at import) so a host can set the environment before first use, and so
 * tests can vary it.
 *
 * Canonical credential layout (all overridable by env):
 *
 *   <dir>/client_secret.json     shared OAuth app
 *   <dir>/tokens/<account>.json  per-account token
 *
 * Env overrides (empty/whitespace values are treated as unset):
 *   GOOGLE_MCP_DIR            the config dir (default ~/.google-mcp)
 *   GOOGLE_MCP_CLIENT_SECRET  path to the client secret JSON
 *   GOOGLE_MCP_TOKEN          a specific token file (single-account override)
 *   GOOGLE_MCP_ACCOUNT        which account this instance is bound to
 */

// Account names become path segments (`tokens/<account>.json`), so they must not
// contain separators or traversal. Allow letters, digits, and the punctuation
// that appears in email addresses and simple slugs.
const accountSchema = z
  .string()
  .regex(/^[A-Za-z0-9._%+@-]+$/)
  .refine((v) => !v.includes('..'));

const EnvSchema = z.object({
  GOOGLE_MCP_DIR: z.string().optional(),
  GOOGLE_MCP_CLIENT_SECRET: z.string().optional(),
  GOOGLE_MCP_TOKEN: z.string().optional(),
  GOOGLE_MCP_ACCOUNT: z.string().optional(),
});

export type Config = {
  dir: string;
  tokensDir: string;
  clientSecretPath: string;
  tokenOverride?: string;
  account?: string;
};

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Parse and validate the environment into one typed `Config`; consumers read
 * the returned object, not `process.env` (see the module note for the two
 * sanctioned exceptions).
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const e = EnvSchema.parse(env);
  const dir = clean(e.GOOGLE_MCP_DIR) ?? path.join(os.homedir(), '.google-mcp');
  const tokenOverride = clean(e.GOOGLE_MCP_TOKEN);
  const account = clean(e.GOOGLE_MCP_ACCOUNT);
  return {
    dir,
    tokensDir: path.join(dir, 'tokens'),
    clientSecretPath: clean(e.GOOGLE_MCP_CLIENT_SECRET) ?? path.join(dir, 'client_secret.json'),
    ...(tokenOverride ? { tokenOverride } : {}),
    ...(account ? { account } : {}),
  };
}

/** The token file for `account`: the single-account override, or the per-account default. */
export function tokenPath(account: string, config: Config = loadConfig()): string {
  return config.tokenOverride ?? path.join(config.tokensDir, `${account}.json`);
}

/** The account to act as (explicit arg wins over env), validated as a safe path segment. */
export function resolveAccount(account?: string, config: Config = loadConfig()): string {
  const resolved = account ?? config.account;
  if (!resolved) {
    throw new Error('No account selected; set GOOGLE_MCP_ACCOUNT or pass an account.');
  }
  if (!accountSchema.safeParse(resolved).success) {
    throw new Error(
      `Invalid account name "${resolved}": only letters, digits, and . _ % + @ - are allowed.`,
    );
  }
  return resolved;
}

/**
 * Front-loaded union of every planned service's OAuth scopes (the B1 model): each
 * account consents once and is authorized for everything. Google only issues a
 * refresh token on a fresh grant, so adding a scope here later forces re-consent
 * of every account. The OAuth consent screen must list these same scopes.
 */
export const SCOPES = [
  // Gmail: mail.google.com is full access incl. permanent delete (gmail.modify
  // cannot delete); settings.basic covers filters, forwarding reads, vacation, IMAP, POP, and language.
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.settings.basic',
  // Drive
  'https://www.googleapis.com/auth/drive',
  // Sheets
  'https://www.googleapis.com/auth/spreadsheets',
  // Docs
  'https://www.googleapis.com/auth/documents',
  // Calendar
  'https://www.googleapis.com/auth/calendar',
  // Meet (REST API v2): space.created manages app-created spaces and reads their
  // conference records; space.readonly reads any accessible space plus conference
  // records, recordings, transcripts, and participants; space.settings edits space
  // settings (e.g. moderation).
  'https://www.googleapis.com/auth/meetings.space.created',
  'https://www.googleapis.com/auth/meetings.space.readonly',
  'https://www.googleapis.com/auth/meetings.space.settings',
];
