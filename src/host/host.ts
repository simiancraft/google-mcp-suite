import { randomUUID, timingSafeEqual } from 'node:crypto';
import {
  createServer as createHttpServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';

/** Builds a wired MCP `Server` for one account; see `createServer()` in lib/server.ts. */
export type ServiceFactory = (account: string) => Promise<Server>;

export type HostOptions = {
  /** Services to serve, keyed by the path segment that names them (`gmail`, `drive`, ...). */
  services: Record<string, ServiceFactory>;
  /** Account labels to serve; each becomes the first path segment. */
  accounts: string[];
  /** Interface to bind; defaults to the loopback address. */
  hostname?: string;
  /** TCP port; 0 picks a free one (tests). Defaults to 8765. */
  port?: number;
  /**
   * Shared secret every request must present as `Authorization: Bearer <token>`.
   * Optional on loopback, where the OS already limits callers to this machine;
   * required when binding anything else.
   */
  token?: string;
  /** Idle time after which a session is closed; defaults to 12 hours. */
  idleMs?: number;
  /** Largest request body accepted, in bytes; defaults to 16 MiB. */
  maxBodyBytes?: number;
  /** Clock, injectable for tests. */
  now?: () => number;
  /** Line logger; defaults to stderr. */
  log?: (line: string) => void;
};

export type Host = {
  /** Base URL the host is reachable at; sessions live under `/<account>/<service>`. */
  url: string;
  port: number;
  /** Live session count. */
  sessions: () => number;
  /** Close every session idle longer than `idleMs`; returns how many. Runs on a timer. */
  reap: () => number;
  /** Close every session and the listener. */
  close: () => Promise<void>;
};

type Session = {
  transport: StreamableHTTPServerTransport;
  route: string;
  lastSeen: number;
};

const LOOPBACK = new Set(['127.0.0.1', 'localhost', '::1']);

/**
 * The `Host` header values the SDK's DNS-rebinding guard accepts. On a loopback
 * bind, the three spellings of this machine; anywhere else the guard is off
 * (the bound hostname is not enumerable from here), so the token is the guard.
 */
export function allowedHosts(hostname: string, port: number): string[] | undefined {
  if (!LOOPBACK.has(hostname)) return undefined;
  return [`127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`];
}

function allowedOrigins(hostname: string, port: number): string[] | undefined {
  return allowedHosts(hostname, port)?.map((host) => `http://${host}`);
}

/** Parse `/<account>/<service>` from a request URL; null for any other shape. */
export function route(url: string | undefined): { account: string; service: string } | null {
  const path = new URL(url ?? '/', 'http://host').pathname;
  const segments = path.split('/').filter((s) => s.length > 0);
  if (segments.length !== 2) return null;
  const [account, service] = segments as [string, string];
  return { account: decodeURIComponent(account), service: decodeURIComponent(service) };
}

function bearerMatches(header: string | undefined, token: string): boolean {
  const presented = header?.slice(0, 7).toLowerCase() === 'bearer ' ? header.slice(7) : '';
  const a = Buffer.from(presented);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Read a bounded body; null means overflow or an interrupted stream. */
export function readBody(req: IncomingMessage, limit: number): Promise<string | null> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.once('error', () => resolve(null));
    req.once('aborted', () => resolve(null));
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        req.pause();
        req.removeAllListeners('data');
        req.removeAllListeners('end');
        resolve(null);
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

function reply(res: ServerResponse, status: number, message: string): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message }, id: null }));
}

/**
 * One process, every service, every account: a Streamable HTTP MCP host. Each
 * client connection is its own MCP session with its own `Server` (the SDK
 * binds one transport per `Server`), built by the service factory for the
 * account in the path, so the wire surface is exactly the stdio bin's. The
 * point is the process count: a machine running several agents forks one
 * stdio server per service per account per client session, and clients that
 * spawn per thread and never close leave hundreds of idle Node processes
 * behind; here they are sessions in one process, and idle ones are reaped.
 */
export async function host(options: HostOptions): Promise<Host> {
  const {
    services,
    accounts,
    hostname = '127.0.0.1',
    token,
    idleMs = 12 * 60 * 60 * 1000,
    maxBodyBytes = 16 * 1024 * 1024,
    now = Date.now,
    log = (line) => console.error(line),
  } = options;
  if (!allowedHosts(hostname, options.port ?? 8765) && !token) {
    throw new Error('a non-loopback --host requires --token or GOOGLE_MCP_HOST_TOKEN');
  }
  const sessions = new Map<string, Session>();
  const accountSet = new Set(accounts);
  // Bound port, known only after listen(); the rebinding allow-list needs it.
  let port = options.port ?? 8765;

  async function open(
    req: IncomingMessage,
    res: ServerResponse,
    body: unknown,
    target: { account: string; service: string },
    factory: ServiceFactory,
  ): Promise<void> {
    const routeName = `${target.account}/${target.service}`;
    const hosts = allowedHosts(hostname, port);
    const origins = allowedOrigins(hostname, port);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: randomUUID,
      ...(hosts && origins
        ? { allowedHosts: hosts, allowedOrigins: origins, enableDnsRebindingProtection: true }
        : {}),
      onsessioninitialized: (id) => {
        sessions.set(id, { transport, route: routeName, lastSeen: now() });
        log(`session ${id} opened on /${routeName} (${sessions.size} live)`);
      },
    });
    const server = await factory(target.account);
    server.onclose = () => {
      const id = transport.sessionId;
      if (id !== undefined && sessions.delete(id)) {
        log(`session ${id} closed on /${routeName} (${sessions.size} live)`);
      }
    };
    // The SDK types the HTTP transport's callbacks as get/set pairs returning
    // `T | undefined`, which exactOptionalPropertyTypes refuses against
    // `Transport`'s optional properties; the object satisfies the contract.
    await server.connect(transport as unknown as Transport);
    await transport.handleRequest(req, res, body);
  }

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const hosts = allowedHosts(hostname, port);
    if (hosts && !hosts.includes(req.headers.host ?? '')) {
      reply(res, 403, 'Forbidden: invalid Host header');
      return;
    }
    const origins = allowedOrigins(hostname, port);
    if (origins && req.headers.origin !== undefined && !origins.includes(req.headers.origin)) {
      reply(res, 403, 'Forbidden: invalid Origin header');
      return;
    }
    if (token !== undefined && !bearerMatches(req.headers.authorization, token)) {
      reply(res, 401, 'Unauthorized: a bearer token is required');
      return;
    }
    const target = route(req.url);
    const factory =
      target && Object.hasOwn(services, target.service) && accountSet.has(target.account)
        ? services[target.service]
        : undefined;
    if (!target || !factory) {
      reply(res, 404, 'Not found: expected /<account>/<service>');
      return;
    }
    if (req.method !== 'POST' && req.method !== 'GET' && req.method !== 'DELETE') {
      reply(res, 405, 'Method not allowed');
      return;
    }

    const sessionId = req.headers['mcp-session-id'];
    const session = typeof sessionId === 'string' ? sessions.get(sessionId) : undefined;
    if (typeof sessionId === 'string' && !session) {
      reply(res, 404, 'Session not found; initialize a new one');
      return;
    }

    if (session && session.route !== `${target.account}/${target.service}`) {
      reply(res, 404, 'Session not found on this path; initialize a new one');
      return;
    }

    let body: unknown;
    if (req.method === 'POST') {
      const raw = await readBody(req, maxBodyBytes);
      if (raw === null) {
        if (req.destroyed) return;
        reply(res, 413, `Request body exceeds ${maxBodyBytes} bytes`);
        req.destroy();
        return;
      }
      try {
        body = JSON.parse(raw);
      } catch {
        reply(res, 400, 'Request body is not JSON');
        return;
      }
    }

    if (session) {
      session.lastSeen = now();
      await session.transport.handleRequest(req, res, body);
      return;
    }
    if (req.method !== 'POST' || !isInitializeRequest(body)) {
      reply(res, 400, 'No session; send an initialize request first');
      return;
    }
    await open(req, res, body, target, factory);
  }

  const listener = createHttpServer((req, res) => {
    handle(req, res).catch((error: unknown) => {
      // A factory failure (no token on disk for that account, say) lands here;
      // the message is the diagnosis, so it goes to the client, not just the log.
      const message = error instanceof Error ? error.message : String(error);
      log(`request failed: ${message}`);
      if (res.headersSent) res.end();
      else reply(res, 500, message);
    });
  });
  await new Promise<void>((resolve, reject) => {
    listener.once('error', reject);
    listener.listen(port, hostname, resolve);
  });
  const address = listener.address();
  port = typeof address === 'object' && address !== null ? address.port : port;
  const url = `http://${hostname}:${port}`;

  function reap(): number {
    const cutoff = now() - idleMs;
    let count = 0;
    for (const session of sessions.values()) {
      if (session.lastSeen < cutoff) {
        count += 1;
        void session.transport.close();
      }
    }
    return count;
  }
  const timer = setInterval(reap, Math.min(idleMs, 60_000));
  timer.unref();

  log(
    `google-mcp-host: listening on ${url} (accounts: ${accounts.join(', ')}; services: ${Object.keys(services).join(', ')}; idle sessions reaped after ${Math.round(idleMs / 60_000)} min)`,
  );

  return {
    url,
    port,
    sessions: () => sessions.size,
    reap,
    close: async () => {
      clearInterval(timer);
      await Promise.all([...sessions.values()].map((s) => s.transport.close()));
      listener.closeAllConnections();
      await new Promise<void>((resolve) => listener.close(() => resolve()));
    },
  };
}
