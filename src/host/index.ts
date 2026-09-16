#!/usr/bin/env node
import { loadAccounts } from '../auth/accounts.js';
import { errorMessage } from '../lib/utils/error.js';
import { type HostCli, parse, usage } from './cli.js';
import { host } from './host.js';
import { services } from './services.js';

let cli: HostCli;
try {
  cli = parse(process.argv.slice(2));
} catch (error) {
  console.error(`${errorMessage(error)}\n\n${usage}`);
  process.exit(1);
}
if ('help' in cli) {
  console.log(cli.help);
  process.exit(0);
}

const accounts = cli.accounts ?? loadAccounts().map((account) => account.label);
if (accounts.length === 0) {
  console.error(
    'google-mcp-host: no accounts to serve. Authorize one with `google-mcp-doctor auth <account>` or pass --account.',
  );
  process.exit(1);
}

const running = await host({
  services,
  accounts,
  hostname: cli.hostname,
  port: cli.port,
  idleMs: cli.idleMs,
  ...(cli.token === undefined ? {} : { token: cli.token }),
});
for (const account of accounts) {
  for (const service of Object.keys(services)) {
    console.error(`  ${running.url}/${account}/${service}`);
  }
}

const stop = () => {
  void running.close().then(() => process.exit(0));
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
