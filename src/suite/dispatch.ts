/**
 * The suite's front door: one bin named after the package, so `npx google-mcp-suite
 * <service>` works. Registry-fed MCP clients construct exactly `npx <package>` from a
 * server.json entry, and npx can only run a bin whose name matches the package, so the
 * package name must be runnable; the service argument is what lets one registry entry
 * cover every server in the suite. The suite knows the services; no service imports it.
 */
export const services = ['gmail', 'calendar', 'drive', 'docs', 'sheets'] as const;

/** The peer CLIs that dispatch alongside the services: provisioning, and the shared host. */
export const peers = ['doctor', 'host'] as const;

// A Map, not an object literal: lookup must miss on inherited keys ('constructor').
const entries = new Map<string, string>(
  [...services, ...peers].map((name) => [name, `../${name}/index.js`] as const),
);

/**
 * The module specifier to import for a dispatchable name, or undefined. Specifiers
 * resolve against the importing module, so they are only correct from inside this
 * directory (index.ts is a sibling); the drift test pins each one to its bin's target.
 */
export function resolve(name: string): string | undefined {
  return entries.get(name);
}

export const usage = `google-mcp-suite: per-account Google MCP servers, one process per service

Usage:
  google-mcp-suite <service>    start a server on stdio (${services.join(', ')})
  google-mcp-suite host [...]   serve every service and account over Streamable HTTP (same as google-mcp-host)
  google-mcp-suite doctor [...] provisioning + auth health (same as google-mcp-doctor)
  google-mcp-suite help

On stdio the account is chosen by the GOOGLE_MCP_ACCOUNT environment variable;
run one instance per service per account. Each server also ships as its own bin
(${services.map((service) => `google-mcp-${service}`).join(', ')}). The host
serves them all from one process at http://127.0.0.1:8765/<account>/<service>.`;
