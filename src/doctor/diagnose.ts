/**
 * The doctor's diagnostic: a state-aware, version-accurate health check that an
 * agent (or human) reads to know what to do next. Three subjects, then a single
 * next action: provisioning, accounts, services.
 */
import { existsSync } from 'node:fs';
import { type Account, loadAccounts } from '../auth/accounts.js';
import { loadConfig, SCOPES } from '../auth/config.js';
import { errorMessage } from '../lib/utils/error.js';
import { requiredApis, SERVICES, type ServiceInfo, scopeRegistryDrift } from './services.js';
import { grantedScopes, humanizeRemaining, ICON, statusFor } from './status.js';

export type DiagnoseOptions = { probe?: boolean; services?: ServiceInfo[]; now?: number };

/** `doctor scopes`: the provisioning quick reference, version-accurate. */
export function renderScopes(): void {
  console.log('Enable these Google Cloud APIs:');
  for (const a of requiredApis()) console.log(`  ${a}`);
  console.log('\nDeclare these OAuth scopes on the consent screen:');
  for (const s of SCOPES) console.log(`  ${s}`);
}

export async function diagnose(options: DiagnoseOptions = {}): Promise<void> {
  const probe = options.probe ?? true;
  const services = options.services ?? SERVICES;
  const now = options.now ?? Date.now();
  console.log('google-mcp doctor\n');

  // 1. Provisioning
  console.log('Provisioning');
  const secret = loadConfig().clientSecretPath;
  const hasSecret = existsSync(secret);
  console.log(`  [${hasSecret ? '✓' : '✗'}] OAuth client secret  ${secret}`);
  if (!hasSecret) {
    console.log('       → Create an OAuth Desktop client in Google Cloud and save it here.');
    console.log(`       → Enable APIs: ${requiredApis().join(', ')}`);
    console.log(
      '       → Declare these scopes on the consent screen, add yourself as a test user:',
    );
    for (const s of SCOPES) console.log(`           ${s}`);
    console.log('       → Full walkthrough: PROVISIONING.md');
  }
  const drift = scopeRegistryDrift(
    [...SCOPES],
    services.flatMap((s) => s.scopes),
  );
  const driftClean = drift.missing.length === 0 && drift.extra.length === 0;
  console.log(
    `  [${driftClean ? '✓' : '✗'}] Scope registry  ${SCOPES.length} scopes across ${services.length} services`,
  );
  if (drift.missing.length)
    console.log(`       unattributed in services.ts: ${drift.missing.join(', ')}`);
  if (drift.extra.length) console.log(`       not in auth SCOPES: ${drift.extra.join(', ')}`);

  // 2. Accounts
  const accounts = loadAccounts();
  console.log(`\nAccounts (${accounts.length})`);
  if (accounts.length === 0) {
    console.log('  none yet; authorize one: google-mcp-doctor auth you@example.com');
  }
  const authorized: Account[] = [];
  for (const acct of accounts) {
    const st = statusFor(acct, now);
    if (st.state === 'missing') {
      console.log(
        `  ${ICON.missing} ${acct.label}  no token; run: google-mcp-doctor auth ${acct.label}`,
      );
      continue;
    }
    authorized.push(acct);
    const granted = new Set(grantedScopes(acct.label) ?? []);
    const missing = SCOPES.filter((s) => !granted.has(s));
    const note =
      missing.length === 0
        ? `${SCOPES.length}/${SCOPES.length} scopes`
        : `MISSING ${missing.length} scope(s)`;
    console.log(
      `  ${ICON[st.state]} ${acct.label}  ${note}  ${humanizeRemaining(st.remainingMs)} left`,
    );
    for (const s of missing) console.log(`       missing: ${s}`);
    if (missing.length)
      console.log(`       → re-auth to pick them up: google-mcp-doctor auth ${acct.label}`);
  }

  // 3. Services (live probe per authorized account)
  console.log('\nServices');
  for (const svc of services) {
    if (!svc.implemented) {
      console.log(`  · ${svc.name}  planned`);
      continue;
    }
    if (!probe || authorized.length === 0 || !svc.probe) {
      console.log(
        `  ${svc.name}  implemented${probe && authorized.length === 0 ? ' (no account to probe)' : ''}`,
      );
      continue;
    }
    for (const acct of authorized) {
      try {
        const who = await svc.probe(acct.label);
        console.log(`  ✓ ${svc.name}  ${acct.label} → ${who}`);
      } catch (err) {
        console.log(`  ✗ ${svc.name}  ${acct.label} → ${errorMessage(err)}`);
      }
    }
  }

  // 4. Next action
  console.log('');
  const due = accounts.filter((a) => statusFor(a, now).state !== 'fresh');
  if (!hasSecret) {
    console.log('Next: finish provisioning above, then re-run doctor.');
  } else if (accounts.length === 0) {
    console.log('Next: authorize an account → google-mcp-doctor auth you@example.com');
  } else if (due.length) {
    console.log(`Next: authorize ${due.length} account(s) → google-mcp-doctor auth`);
  } else {
    console.log('All set: client secret present, accounts fresh, services reachable.');
  }
}
