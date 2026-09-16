# google-mcp-host

Every service, every account, one process, over MCP's Streamable HTTP
transport. Each client connection is its own MCP session (its own `Server`,
built from the same definition the stdio bin uses), so the wire surface is
identical to `google-mcp-<service>`; only the process count changes.

## Why

A stdio server is one process per service per account per client session. On a
machine running several agents that multiplies fast, and a client that spawns
MCP servers per thread and never closes them (Codex `app-server` does) leaves
hundreds of idle Node processes behind, paged out to swap. Here they are
sessions in one process, and idle sessions are reaped.

## Run

```sh
google-mcp-host                                 # every roster account, port 8765, loopback
google-mcp-host --account personal --port 9000  # a subset, another port
google-mcp-suite host                           # same thing via the front door
```

Sessions live at `http://127.0.0.1:8765/<account>/<service>`. Accounts come
from `~/.google-mcp/accounts.json` (or the token files on disk); services are
`gmail`, `calendar`, `drive`, `docs`, `sheets`. Run it under a process
supervisor (systemd user unit, launchd, a terminal you keep open).

## Point clients at it

Claude Code:

```sh
claude mcp add --scope user --transport http gmail-personal http://127.0.0.1:8765/personal/gmail
```

Codex CLI (`~/.codex/config.toml`):

```toml
[mcp_servers.gmail-personal]
url = "http://127.0.0.1:8765/personal/gmail"
```

Any `mcpServers` JSON client:

```json
{ "mcpServers": { "gmail-personal": { "url": "http://127.0.0.1:8765/personal/gmail" } } }
```

Keep the `<service>-<account>` instance names; identity is still one account
per session, chosen by the path instead of `GOOGLE_MCP_ACCOUNT`.

## Security

- Binds `127.0.0.1` by default; the OS limits callers to this machine.
- `--token <secret>` (or `GOOGLE_MCP_HOST_TOKEN`) requires
  `Authorization: Bearer <secret>` on every request. Anything on the machine can
  otherwise reach your mailbox through the port, so set one on shared hosts,
  and always when binding any other interface. Clients pass it as a header:
  Claude Code `--header "Authorization: Bearer <secret>"`, Codex
  `http_headers = { Authorization = "Bearer <secret>" }`.
- DNS-rebinding protection is on for loopback binds (the `Host` header must be
  this machine); off for other binds, where the token is the guard.
- `--idle <minutes>` (default 720) closes sessions with no traffic; a client
  that comes back after that gets 404 and re-initializes.

## Health

The host logs one line per session open and close to stderr, and any request
failure with its message (a missing token for an account shows up as a 500
carrying `no token ...`; run `google-mcp-doctor auth <account>` and reconnect;
each new session re-reads the token file).
