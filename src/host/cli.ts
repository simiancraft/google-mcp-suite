import { parseArgs } from 'node:util';

export type HostCli =
  | {
      port: number;
      hostname: string;
      idleMs: number;
      token: string | undefined;
      /** Explicit account labels; undefined means the whole roster. */
      accounts: string[] | undefined;
    }
  | { help: string };

export const DEFAULT_PORT = 8765;
export const DEFAULT_IDLE_MINUTES = 12 * 60;

export const usage = `google-mcp-host: every service, every account, one Streamable HTTP process

Usage:
  google-mcp-host [--port ${DEFAULT_PORT}] [--host 127.0.0.1] [--idle ${DEFAULT_IDLE_MINUTES}] [--token <secret>] [--account <label>]...

Serves each account's servers at http://<host>:<port>/<account>/<service>
(services: gmail, calendar, drive, docs, sheets). Accounts default to the
roster (~/.google-mcp/accounts.json, or the tokens on disk); --account narrows
it and may repeat.

  --port     TCP port (default ${DEFAULT_PORT})
  --host     interface to bind (default 127.0.0.1; bind anything else only with --token)
  --idle     minutes before an idle session is closed (default ${DEFAULT_IDLE_MINUTES})
  --token    bearer token every request must carry (default: $GOOGLE_MCP_HOST_TOKEN)
  --account  serve only this account label (repeatable)
  --help     this text`;

function positiveInt(name: string, raw: string): number {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`--${name} must be a non-negative integer, got ${JSON.stringify(raw)}`);
  }
  return value;
}

/** Parse the host's argv (without node and script). Throws on a bad value or an unknown flag. */
export function parse(argv: string[], env: NodeJS.ProcessEnv = process.env): HostCli {
  const { values } = parseArgs({
    args: argv,
    options: {
      port: { type: 'string' },
      host: { type: 'string' },
      idle: { type: 'string' },
      token: { type: 'string' },
      account: { type: 'string', multiple: true },
      help: { type: 'boolean', short: 'h' },
    },
    strict: true,
    allowPositionals: false,
  });
  if (values.help) return { help: usage };
  const port = values.port === undefined ? DEFAULT_PORT : positiveInt('port', values.port);
  const idle = values.idle === undefined ? DEFAULT_IDLE_MINUTES : positiveInt('idle', values.idle);
  return {
    port,
    hostname: values.host ?? '127.0.0.1',
    idleMs: idle * 60_000,
    token: values.token ?? env['GOOGLE_MCP_HOST_TOKEN'],
    accounts: values.account,
  };
}
