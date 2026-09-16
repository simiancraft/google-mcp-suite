/**
 * Authorize accounts through the browser consent flow, one at a time.
 *
 *   google-mcp-doctor auth you@example.com   # one account, works with no roster
 *   google-mcp-doctor auth --all             # every account in the roster
 *   google-mcp-doctor auth                   # re-auth only what is expired/due
 */

import { type Account, loadAccounts, toAccount } from '../auth/accounts.js';
import { runAuthFlow } from '../auth/oauth.js';
import { openInBrowser } from './browser.js';
import { statusFor } from './status.js';

export function selectTargets(
  args: string[],
  roster: Account[] = loadAccounts(),
  now: number = Date.now(),
): Account[] {
  const flags = new Set(args.filter((a) => a.startsWith('--')));
  const names = args.filter((a) => !a.startsWith('--'));
  if (names.length > 0) return names.map((n) => toAccount(n, roster));
  if (flags.has('--all')) {
    if (roster.length === 0) {
      throw new Error(
        'No accounts configured. Pass an email: google-mcp-doctor auth you@example.com',
      );
    }
    return roster;
  }
  return roster.filter((a) => statusFor(a, now).state !== 'fresh');
}

export type RunAuthDeps = {
  authorize?: typeof runAuthFlow;
  openBrowser?: (url: string) => void;
};

export async function runAuth(args: string[], deps: RunAuthDeps = {}): Promise<void> {
  const authorize = deps.authorize ?? runAuthFlow;
  const openBrowser = deps.openBrowser ?? openInBrowser;
  const targets = selectTargets(args);
  if (targets.length === 0) {
    console.log('Nothing due; all tokens are fresh. Pass an email/label, or --all to force.');
    return;
  }
  console.log(`Authorizing: ${targets.map((t) => t.label).join(', ')}\n`);
  for (const acct of targets) {
    console.log(`→ ${acct.label}${acct.email ? ` (${acct.email})` : ''}`);
    await authorize(acct.label, {
      openBrowser,
      ...(acct.email ? { loginHint: acct.email } : {}),
    });
    console.log('  done.\n');
  }
  console.log('Done. Confirm with: google-mcp-doctor status');
}
