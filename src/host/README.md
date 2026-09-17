# google-mcp-host

Every service, every account, one process, over MCP's Streamable HTTP
transport. Each client connection is its own MCP session (its own `Server`,
built from the same definition the stdio bin uses), so the wire surface is
identical to `google-mcp-<service>`; only the process count changes.

## Why one process

Stdio is fine for one client. Choose the shared host when more than one
agent or session runs on the box, or when a client spawns MCP servers per
thread and never closes them, as Codex `app-server` does. Stdio multiplies
processes by services, accounts, and client sessions; hundreds of idle Node
processes can consume memory and spill into swap. The host keeps those
client sessions in one process and reaps idle sessions, so a new agent does
not need another set of server processes.

## Why it is a peer

Host knows the services; no service imports host. Its repository dependencies
are exactly `src/<service>/service.ts` (nothing deeper), `src/auth`, and
`src/lib`; `src/suite/dispatch.ts` is imported only by the registry drift test.
The shared definitions let host serve the same operations over HTTP without
importing a service's stdio entry or reaching into its implementation.
`services.test.ts` pins this dependency direction as well as registry parity.

## Layout

```text
src/host/
  index.ts      # bin entry, account selection, startup errors, and shutdown
  cli.ts        # flags, defaults, validation, and usage
  host.ts       # HTTP routing, authentication, sessions, and idle reaping
  services.ts   # service definitions bound to per-account server factories
```

## Run

```sh
google-mcp-host                                 # every roster account, port 8765, loopback
google-mcp-host --account <account> --port 9000  # a subset, another port
google-mcp-suite host                           # same thing via the front door
```

Sessions live at `http://127.0.0.1:8765/<account>/<service>`. Accounts come
from `~/.google-mcp/accounts.json` (or the token files on disk); services are
`gmail`, `calendar`, `drive`, `docs`, and `sheets`. Run it under a process
supervisor, such as systemd or launchd.

## Run as a user service

Install with `npm install -g google-mcp-suite`. A supervisor does not see
your shell's PATH: a Node installed by nvm, fnm, or volta is invisible to it,
and even an absolute path to the npm shim fails at its `#!/usr/bin/env node`
line. Both templates below therefore take `<node-bin-directory>`, the
absolute directory holding `node` and the global `google-mcp-host` shim
(`dirname "$(command -v node)"` in a shell where the host runs).

Keep the bearer token in `$HOME/.google-mcp/host.env` with mode 0600. Both
supervisors below read that same file; use a random hex string, which needs
no quoting, in place of the placeholder:

```sh
umask 077
mkdir -p "$HOME/.google-mcp"
printf 'GOOGLE_MCP_HOST_TOKEN=%s\n' "<secret>" > "$HOME/.google-mcp/host.env"
chmod 600 "$HOME/.google-mcp/host.env"
```

### systemd user unit

Save as `$HOME/.config/systemd/user/google-mcp-host.service`:

```ini
[Unit]
Description=Google MCP shared host

[Service]
Environment=PATH=<node-bin-directory>:/usr/local/bin:/usr/bin:/bin
ExecStart=<node-bin-directory>/google-mcp-host
EnvironmentFile=%h/.google-mcp/host.env
Restart=on-failure
RestartSec=2

[Install]
WantedBy=default.target
```

`Restart=on-failure` also retries the exit-1 "port in use" case until
systemd's start limit trips, so if the unit flaps, probe the port first
(below); another host already owns it.

```sh
systemctl --user daemon-reload
systemctl --user enable --now google-mcp-host
```

On a headless box, `loginctl enable-linger` keeps the user manager running
after logout and starts it at boot. On WSL2, enable systemd in `/etc/wsl.conf`
with `[boot]` and `systemd=true`, then restart the distribution as described
in [Microsoft's systemd guide](https://learn.microsoft.com/en-us/windows/wsl/systemd).

### launchd user agent

Save as `$HOME/Library/LaunchAgents/com.simiancraft.google-mcp-host.plist`.
Replace `<node-bin-directory>` with the absolute directory containing
Node and the globally installed host, or list their directories separated by
colons. Plist values do not expand `$HOME`; the shell command below does.
The wrapper exports the same `host.env` file used by systemd and clients.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.simiancraft.google-mcp-host</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/sh</string>
    <string>-c</string>
    <string>set -a; . "$HOME/.google-mcp/host.env"; exec google-mcp-host</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>&lt;node-bin-directory&gt;:/usr/bin:/bin</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
</dict>
</plist>
```

```sh
launchctl bootstrap "gui/$(id -u)" "$HOME/Library/LaunchAgents/com.simiancraft.google-mcp-host.plist"
```

The agent starts at login and stays running for that user's login session;
see [Apple's launchd guide](https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html).

## Detect an already-running host

Probe before starting another process. A GET without a session id (or a
non-initialize POST) to any served route returns HTTP 400 with
`No session; send an initialize request first`. This is a liveness signal;
it does not initialize a session or call Google:

```sh
curl -i --header "Authorization: Bearer <secret>" 'http://127.0.0.1:8765/<account>/gmail'
```

HTTP 404 means the route is not served; connection refused means no host is
listening at that address and port. HTTP 401 means the host needs the correct
token. If a second launch fails with EADDRINUSE, the CLI exits 1 and prints
`port 8765 is in use; a google-mcp-host is probably already running; point clients at it`
(with the selected port substituted). Probe the listener to confirm it is
the host, then reuse it.

## Point clients at it

Moving to the host is **one name, one transport**. Remove each old stdio
registration first, then register its URL under the same `<service>-<account>`
name. Otherwise the client spawns the stdio copy AND connects to the host.

- Claude Code: `claude mcp remove --scope user <name>`.
- Codex TOML: delete the `command`, `args`, and `env` lines or tables from the
  corresponding `[mcp_servers]` entry before setting its URL.
- `mcpServers` JSON: delete the old command entry, including its `command`,
  `args`, and `env` fields, then replace it with the URL entry below.

Restart existing client sessions after saving the replacement so old stdio
processes can shut down. Substitute placeholders before running these examples.

Use `<url>` = `http://127.0.0.1:8765/<account>/<service>` and the token from
`$HOME/.google-mcp/host.env` (0600), the same file the supervisor reads.

Claude Code:

```sh
claude mcp add --scope user --transport http <name> <url> --header "Authorization: Bearer <secret>"
```

Codex CLI:

```sh
codex mcp add <name> --url <url> --bearer-token-env-var GOOGLE_MCP_HOST_TOKEN
```

This writes the equivalent of the following into `$HOME/.codex/config.toml`:

```toml
[mcp_servers.<name>]
url = "http://127.0.0.1:8765/<account>/<service>"
bearer_token_env_var = "GOOGLE_MCP_HOST_TOKEN"
```

The variable must be exported in the environment of the running Codex client,
not only the supervisor or the registration command. Load it before launching
the client; GUI clients need the same variable in their launch environment:

```sh
set -a
. "$HOME/.google-mcp/host.env"
set +a
codex
```

Use `bearer_token_env_var` for the bearer credential, as described in the
[official OpenAI MCP documentation](https://developers.openai.com/codex/mcp).

For `mcpServers` JSON clients that support HTTP headers:

```json
{
  "mcpServers": {
    "<name>": {
      "url": "http://127.0.0.1:8765/<account>/<service>",
      "headers": { "Authorization": "Bearer <secret>" }
    }
  }
}
```

For the literal Claude and JSON header examples, substitute the secret from
`host.env`; those entries do not read the file themselves. Update them when
the token changes, and restart the host and clients with the matching value.

Keep the `<service>-<account>` instance names; identity is still one account
per session, chosen by the path instead of `GOOGLE_MCP_ACCOUNT`.

## Security

- Binds `127.0.0.1` by default; the OS limits callers to this machine.
- `--token <secret>` (or `GOOGLE_MCP_HOST_TOKEN`) requires
  `Authorization: Bearer <secret>` on every request. Anything on the machine can
  otherwise reach your mailbox through the port, so set one on shared hosts,
  and always when binding any other interface. A non-loopback bind without
  a nonempty token is refused. Use the per-client token settings above.
- DNS-rebinding protection is on for loopback binds (the `Host` header must be
  an allowed loopback authority, and any `Origin` must be a loopback HTTP
  origin on the bound port). Both checks run before routing; on other binds,
  the required token is the guard.

## Session semantics

Each logical client connection has its own MCP session, bound to the account
and service path where it initialized. Idle time is measured from the last
request; leaving an SSE stream open does not count as activity. After
`--idle` minutes (default 720; minimum 1), the next reaper pass closes the
session, and requests with its old id receive HTTP 404. The client must send
a new initialize request without that id, as required by the
[MCP session specification](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#session-management).
This recovery is spec-mandated and unverified per client.

## Health

The host logs one line per session open and close to stderr, and any request
failure with its message (a missing token for an account shows up as a 500
carrying `ENOENT: no such file or directory, open '.../tokens/<account>.json'`;
run `google-mcp-doctor auth <account>` and reconnect; each new session
re-reads the token file). Observed once, with three
concurrent `codex exec` runs and two concurrent `claude -p` runs: Codex closes
its sessions on exit (one DELETE per server entry); Claude Code's
non-interactive runs leave theirs open, so the reaper is what returns that
memory. Neither client spawned a stdio process.
