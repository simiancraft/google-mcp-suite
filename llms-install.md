# Installing google-mcp-suite (for AI agents)

You are installing a suite of Google MCP servers: Gmail, Calendar, Drive,
Sheets, and Docs, one stdio server per service per Google account. Identity is
bound at startup via the `GOOGLE_MCP_ACCOUNT` environment variable; there is no
per-call account parameter.

**Cloud-sandboxed agents (Google Jules and similar) are out of scope**: the
suite runs on the machine where the human consented, and OAuth credentials
must never enter a cloud VM.

The full agent playbook, including superseding a client's built-in Google
connectors and a clean decommission, is
[ADOPTING.md](https://github.com/simiancraft/google-mcp-suite/blob/main/ADOPTING.md).
The condensed path:

## 1. Install

```sh
npm install -g google-mcp-suite
```

Requires Node >= 22. Bins: `google-mcp-gmail`, `google-mcp-calendar`,
`google-mcp-drive`, `google-mcp-sheets`, `google-mcp-docs`, and the
`google-mcp-doctor` setup CLI.

## 2. Provision and authorize (human-in-the-loop)

The suite needs a Google Cloud OAuth client; this is a one-time human step.

```sh
google-mcp-doctor scopes              # the APIs + scopes to enable in Google Cloud
# human follows PROVISIONING.md, drops client_secret.json in ~/.google-mcp/
google-mcp-doctor auth you@example.com   # browser consent; writes the account token
google-mcp-doctor                        # provisioned, authorized, reachable?
```

## 3. Configure your MCP client

One instance per service per account, named `<service>-<account>`:

```json
{
  "mcpServers": {
    "gmail-personal": {
      "command": "google-mcp-gmail",
      "env": { "GOOGLE_MCP_ACCOUNT": "personal" }
    },
    "calendar-personal": {
      "command": "google-mcp-calendar",
      "env": { "GOOGLE_MCP_ACCOUNT": "personal" }
    }
  }
}
```

For Claude Code, register with `claude mcp add --scope user <name> --env
GOOGLE_MCP_ACCOUNT=<account> -- <bin>`; for OpenAI Codex CLI, `codex mcp add
<name> --env GOOGLE_MCP_ACCOUNT=<account> -- <bin>`.

If several agents or sessions share the machine, run `google-mcp-host` once
instead (one process, every service, every account) and register each
`<service>-<account>` name by URL: `http://127.0.0.1:8765/<account>/<service>`
(`claude mcp add --scope user --transport http <name> <url>`; Codex
`url = "<url>"`). See
[ADOPTING.md](https://github.com/simiancraft/google-mcp-suite/blob/main/ADOPTING.md)
for every client's path and for superseding a client's first-party Google
surface (claude.ai connectors, OpenAI-curated plugins, Gemini's Workspace
extension).

## 4. Verify

Restart the client, confirm each `<service>-<account>` server connects, and
call one read-only tool per service (Gmail `list_labels`, Calendar
`list_calendars`). `google-mcp-doctor` diagnoses any failure.
