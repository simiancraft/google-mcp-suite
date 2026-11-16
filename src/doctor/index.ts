#!/usr/bin/env node
import { errorMessage } from '../lib/utils/error.js';
/**
 * google-mcp-doctor: a micro-CLI for provisioning and auth health.
 *
 * Doctor knows the services; the services never know doctor. It imports the auth
 * layer and stable `@googleapis/*` surfaces only, never a service's internals.
 */
import { runAuth } from './auth.js';
import { diagnose, renderScopes } from './diagnose.js';
import { renderStatus } from './status.js';

const usage = `google-mcp-doctor: provisioning & auth health for google-mcp-suite

Usage:
  google-mcp-doctor [check]          full diagnostic: provisioning, accounts, services
  google-mcp-doctor status           refresh-token countdown table
  google-mcp-doctor auth [<acct>…]   authorize accounts
                                       no args  → re-auth what is expired/due
                                       --all    → every account in the roster
                                       <acct>   → an email (no config needed) or roster label
  google-mcp-doctor scopes           the APIs + scopes to enable in Google Cloud
  google-mcp-doctor help

Flags:
  --no-probe   skip the live service health checks (offline/fast)
  --port <n>   auth callback port (default: 3000, falls back if busy; explicit port must be free; 0 selects a free port)

If you are an AI agent, run the auth command yourself; it opens the person's browser and waits for the callback, and the person only approves the consent screen. Run one account at a time, then rerun google-mcp-doctor.`;

const [cmd = 'check', ...rest] = process.argv.slice(2);

try {
  switch (cmd) {
    case 'check':
    case 'diagnose':
      await diagnose({ probe: !rest.includes('--no-probe') });
      break;
    case 'status':
    case 'tokens':
      renderStatus();
      break;
    case 'auth':
      await runAuth(rest);
      break;
    case 'scopes':
      renderScopes();
      break;
    case 'help':
    case '--help':
    case '-h':
      console.log(usage);
      break;
    default:
      console.error(`Unknown command: ${cmd}\n\n${usage}`);
      process.exit(1);
  }
} catch (err) {
  console.error(errorMessage(err));
  process.exit(1);
}
