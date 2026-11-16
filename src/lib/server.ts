import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import {
  CallToolRequestSchema,
  type CallToolResult,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import pkg from '../../package.json' with { type: 'json' };
import { type AnyOperation, SOURCE_META_KEY } from './operation.js';
import { errorMessage } from './utils/error.js';
import { ownLookup } from './utils/lookup.js';

/**
 * Everything that makes a service a service, independent of how it is started:
 * its identity, its operations, and how to build an authenticated client for an
 * account. The stdio bin (`server()`) and the shared HTTP host (`src/host`) both
 * consume this shape, so one definition serves both transports.
 */
export type ServiceDefinition<Client> = {
  /** MCP server name (the service, e.g. 'gmail'). */
  name: string;
  /** Server version; defaults to the package version. */
  version?: string;
  /**
   * Human-readable server name for client UIs (MCP `Implementation.title`).
   * `description` and `websiteUrl` postdate the 2025-06-18 `Implementation`
   * (the shipped SDK carries them); clients that predate them ignore them.
   * @see https://modelcontextprotocol.io/specification/2025-06-18/schema (Implementation)
   */
  title?: string;
  /** One-line server summary for client UIs (MCP `Implementation.description`). */
  description?: string;
  /** Project URL for client UIs (MCP `Implementation.websiteUrl`); defaults to the package homepage. */
  websiteUrl?: string;
  /**
   * Usage notes served in the MCP initialize result (`InitializeResult.instructions`);
   * clients typically inject this into the agent's context at connect time,
   * making it the primary server-authored channel for usage guidance (support
   * varies by client; it is a hint, like the tool annotations).
   * @see https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle
   */
  instructions?: string;
  /** Every operation this server exposes, keyed by wire name (tools and methods merged). */
  operations: Record<string, AnyOperation<Client>>;
  /** Build the authenticated client for the account this instance is bound to. */
  client: (account: string | undefined) => Promise<Client>;
  /** Optional consent flow, invoked by the `auth` subcommand. */
  runAuth?: (account: string | undefined) => Promise<void>;
  /**
   * Certify an error as stale stored credentials (e.g. OAuth `invalid_grant`).
   * A certified failure rebuilds the client from disk, so a re-auth heals a
   * running instance, and retries once only when the operation's annotations
   * make a second attempt safe (read-only or idempotent); otherwise the error
   * envelope tells the agent to retry. Typed like `runAuth`: the auth layer
   * supplies the predicate, this generic layer never inspects error shapes.
   */
  staleCredentials?: (error: unknown) => boolean;
};

export type ServerOptions<Client> = ServiceDefinition<Client> & {
  /** Transport to connect; defaults to stdio. Injectable for tests. */
  transport?: Transport;
};

function errorResult(message: string): CallToolResult {
  return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
}

/**
 * Build the MCP `tools/list` payload from the operations: each one's input and
 * output JSON Schema, the four-hint annotations quad declared on its
 * definition, and the source reference page under `_meta[SOURCE_META_KEY]`.
 * On the wire, every operation is a "tool" (MCP has no other word). Pure;
 * exported for tests.
 */
export function toolDefinitions<Client>(operations: Record<string, AnyOperation<Client>>) {
  return Object.entries(operations).map(([name, op]) => ({
    name,
    description: op.description,
    inputSchema: z.toJSONSchema(op.schema.input, { io: 'input' }),
    outputSchema: z.toJSONSchema(op.schema.output, { io: 'output' }),
    annotations: op.annotations,
    _meta: { [SOURCE_META_KEY]: op.source },
  }));
}

/**
 * Run one operation by name: resolve it, validate input against its schema, run
 * the handler, validate the output, and return both a structured result and a text
 * rendering (for clients that do not yet read `structuredContent`). All failure
 * paths return an `isError` result rather than throwing, with one exception:
 * a handler error that `rethrows` certifies escapes untouched, so the
 * credential-healing layer in `createServer()` can see it typed rather than
 * flattened into envelope text. Exported for tests.
 */
export async function callOperation<Client>(
  operations: Record<string, AnyOperation<Client>>,
  client: Client,
  name: string,
  rawArgs: unknown,
  rethrows?: (error: unknown) => boolean,
): Promise<CallToolResult> {
  // ownLookup: a bare `operations[name]` would resolve inherited keys
  // (`__proto__`, `toString`, ...) to truthy non-operations and throw past the
  // error envelope when an agent sends one as a tool name.
  // Deliberate spec deviation: MCP files unknown tools and invalid arguments
  // under protocol error -32602, but this server answers every operation-level
  // failure as a uniform isError tool result so an agent can read the message
  // and self-correct instead of hitting a protocol-layer failure.
  const op = ownLookup(operations, name);
  if (!op) {
    return errorResult(`Unknown tool: ${name}`);
  }

  const parsed = op.schema.input.safeParse(rawArgs ?? {});
  if (!parsed.success) {
    // prettifyError renders "✖ <issue> → at <path>" lines; the raw ZodError
    // message is a JSON dump of the issue array, which agents misread.
    return errorResult(`Invalid arguments for ${name}:\n${z.prettifyError(parsed.error)}`);
  }

  try {
    // `parsed.data` was just validated against this op's input schema, so it is
    // the handler's real input shape. The `AnyOperation` boundary types the
    // handler's args as `never` (so any concrete Operation stays assignable; see
    // operation.ts), and `as never` is the only call form. The validation above
    // is what makes this safe: do not call the handler before parsing.
    const result = await op.handler(client, parsed.data as never);
    const validated = op.schema.output.parse(result);
    return {
      content: [{ type: 'text', text: JSON.stringify(validated, null, 2) }],
      structuredContent: validated,
    };
  } catch (error) {
    if (rethrows?.(error)) {
      throw error;
    }
    if (error instanceof z.ZodError) {
      return errorResult(`Invalid output from ${name}:\n${z.prettifyError(error)}`);
    }
    return errorResult(errorMessage(error));
  }
}

/**
 * Wire a service definition into an MCP `Server` bound to one account: the
 * `tools/list` payload, dispatch, validation, error wrapping, and
 * stale-credential healing. Transport-agnostic and not yet connected: the
 * stdio runner (`server()`) connects it to stdio, and the shared HTTP host
 * builds one per client session. The client is built up front, so a missing
 * or unreadable token surfaces here, before anything is served.
 */
export async function createServer<Client>(
  definition: ServiceDefinition<Client>,
  account: string | undefined,
): Promise<Server> {
  const { name, version = pkg.version, operations, client, staleCredentials } = definition;
  const { title, description, websiteUrl = pkg.homepage, instructions } = definition;

  let authed = await client(account);
  const mcp = new Server(
    {
      name,
      version,
      websiteUrl,
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
    },
    { capabilities: { tools: {} }, ...(instructions ? { instructions } : {}) },
  );

  mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: toolDefinitions(operations),
  }));

  mcp.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name: opName, arguments: args } = request.params;
    try {
      return await callOperation(operations, authed, opName, args, staleCredentials);
    } catch (error) {
      const recovery =
        'An AI agent can run google-mcp-doctor auth to renew due accounts, or google-mcp-doctor auth <account> for this account; the person only approves browser consent. Run one account at a time, then rerun google-mcp-doctor.';
      // Only a staleCredentials-certified error reaches here: the stored
      // refresh token died, and this long-lived process never re-reads its
      // token file, so a `google-mcp-doctor auth` re-auth cannot heal it
      // without a rebuild. invalid_grant is raised while refreshing the
      // access token, normally before the operation executes, but a
      // multi-call handler can die mid-flight, so the retry is gated on the
      // operation's own annotations: read-only or idempotent retries here;
      // anything else hands the retry decision back to the agent.
      try {
        authed = await client(account);
      } catch (rebuildError) {
        return errorResult(`${errorMessage(rebuildError)} ${recovery}`);
      }
      const hints = ownLookup(operations, opName)?.annotations;
      if (hints?.readOnlyHint !== true && hints?.idempotentHint !== true) {
        return errorResult(
          `${errorMessage(error)} (stale credentials, now reloaded from disk; retry ${opName})`,
        );
      }
      try {
        return await callOperation(operations, authed, opName, args, staleCredentials);
      } catch (retryError) {
        return errorResult(`${errorMessage(retryError)} ${recovery}`);
      }
    }
  });

  return mcp;
}

/**
 * Turn a service definition into a running stdio MCP server bound to the
 * `GOOGLE_MCP_ACCOUNT` account. Identical for every service; only the bound
 * `Client` type and the operations differ. Owns the process-level concerns
 * (the `auth` subcommand and the account env var); `createServer()` owns the
 * protocol wiring.
 */
export async function server<Client>(options: ServerOptions<Client>): Promise<void> {
  const { name, runAuth } = options;

  if (process.argv[2] === 'auth') {
    if (!runAuth) {
      console.error(`${name}: no auth flow configured.`);
      process.exit(1);
    }
    await runAuth(process.argv[3] ?? process.env['GOOGLE_MCP_ACCOUNT']);
    process.exit(0);
  }

  const mcp = await createServer(options, process.env['GOOGLE_MCP_ACCOUNT']);
  await mcp.connect(options.transport ?? new StdioServerTransport());
}
