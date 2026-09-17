# Adopting google-mcp-suite

How an agent takes this suite into service as its client's Google surface, and
how it hands it back cleanly. Written to be followed literally, by a person or
by an agent; every step states what it changes, and [Decommission](#decommission)
removes exactly that set and nothing else.

If you are a human: paste the [hand-off prompt](#the-hand-off-prompt) into your
agent and supervise the two steps that are yours (a Google Cloud console visit
and a browser consent). If you are an agent: follow the playbook top to bottom,
verify each gate before moving on, and stop for the human where the playbook
says to.

## Why adopt this instead of a built-in connector

Most agent clients ship, or will ship, some built-in Google integration. This
suite exists because a thin slice is not enough to actually run an account, and
the differences are concrete:

- **MCP and then some.** The Gmail, Calendar, and Drive servers expose
  Google's curated MCP toolset *plus* the broader REST method surface;
  Sheets and Docs are REST-sourced throughout: [210 operations](./README.md#services)
  across Gmail (33), Calendar (31), Drive (35), Sheets (76), and Docs (35). Each
  service's `CAPABILITIES.md` enumerates its operations with provenance.
  Built-in connectors document a narrower surface; as of this writing,
  Anthropic documents its claude.ai Gmail connector as searching, reading,
  and drafting, but not sending. This suite's Gmail server sends mail,
  manages filters and labels, and downloads attachments.
- **Multiple accounts, in parallel, safely.** Identity is bound to a running
  instance at startup via `GOOGLE_MCP_ACCOUNT`; no operation takes an account
  parameter, so an agent commanding three accounts runs three instances and
  cannot act on the wrong one. The claude.ai Google connector binds one
  Google account at a time; switching accounts means disconnecting and
  reconnecting it.
- **Self-describing to the wire.** Every operation carries all four MCP
  `ToolAnnotations` hints (read-only, destructive, idempotent, open-world),
  links its source Google reference page under
  `_meta['com.simiancraft.google-mcp/source']`, validates input and output
  schemas on every call, and each server serves usage instructions in its MCP
  initialize result. An agent can audit what a tool does before calling it.
- **Verifiable by construction.** Test coverage is pinned at 100% in `bunfig.toml`,
  every operation has a colocated stub-client unit test, and destructive
  operations are live-verified pairwise against antecedents the test pass
  itself created.

## The contract

Adoption changes an enumerable set of things. Decommissioning removes that set.

1. **One global npm package**: `google-mcp-suite` (bins `google-mcp-gmail`,
   `google-mcp-calendar`, `google-mcp-sheets`, `google-mcp-docs`,
   `google-mcp-drive`, and `google-mcp-doctor`).
2. **Credentials outside any repo**: `~/.google-mcp/client_secret.json` plus
   one token per account under `~/.google-mcp/tokens/`. Created by
   provisioning and `doctor auth`, **not** removed by decommission (removing
   credentials is a separate, destructive choice; see
   [Removing credentials](#removing-credentials-optional-destructive)).
3. **MCP server entries**, named `<service>-<account>` (`gmail-personal`,
   `calendar-work`), one per service per account, registered at the client's
   user/global scope; either a stdio command per entry, or (with the shared
   host) a `url` per entry pointing at `http://127.0.0.1:8765/<account>/<service>`.
4. **Client-specific supersession settings** that stop the client preferring
   its own first-party Google surface (Claude Code: three `permissions.deny`
   strings; Codex CLI: `enabled = false` lines for any installed
   OpenAI-curated Google plugin; Gemini CLI: the Workspace extension stays
   uninstalled, or the human's recorded choice).
5. **One marker-delimited block** in the client's instruction/memory file,
   fenced by `<!-- google-mcp-suite:begin -->` and
   `<!-- google-mcp-suite:end -->`, so it can be removed exactly.

Adoption is idempotent: every step checks before it writes, and running the
playbook twice changes nothing the second time.

## Adopt

### 0. Preflight

> **Cloud-sandboxed agents (Google Jules and similar): stop here; you are out
> of scope.** This playbook runs only on the machine where the human consents,
> and OAuth credentials must never enter a cloud VM. Step 4 has the detail.

```sh
node --version    # >= 22
npm --version
```

Decide the account list with the human: each Google account gets a short label
(`personal`, `work`) or the bare email; the label becomes the
`GOOGLE_MCP_ACCOUNT` value and part of each server's name.

### 1. Install

```sh
npm install -g google-mcp-suite
google-mcp-doctor help    # proves the bins are on PATH
```

### 2. Provision the OAuth app (human-in-the-loop, once)

The suite needs a Google Cloud OAuth client. This is roughly ten minutes of
console clicks, once, and it is the only part an agent cannot do alone.

```sh
google-mcp-doctor scopes   # the exact APIs + scopes to enable
```

`doctor scopes` reads the shipped scope list, so it is authoritative for the
installed version; PROVISIONING.md's inline list may lag behind it.

Hand the human [PROVISIONING.md](./PROVISIONING.md) (it is written click by
click) and wait until `~/.google-mcp/client_secret.json` exists. `doctor`
reports which step is missing at any point:

```sh
google-mcp-doctor check --no-probe
```

### 3. Authorize each account (human consents, once per account)

First write the roster, so each label from step 0 maps to the email it stands
for. The label is the token filename and the `GOOGLE_MCP_ACCOUNT` value; the
email is only the browser login hint:

```sh
mkdir -p ~/.google-mcp
cat > ~/.google-mcp/accounts.json <<'EOF'
[
  { "label": "personal", "email": "you@example.com" },
  { "label": "work", "email": "you@company.com" }
]
EOF
google-mcp-doctor auth --all     # browser consent per roster account, writes each token
google-mcp-doctor                # all accounts authorized and reachable?
```

(Skipping the roster also works: `doctor auth you@example.com` makes the bare
email its own label, and the instance names in step 4 then carry the email.)

At each consent, the browser's account chooser must pick the email that
matches the label being authorized. The login hint preselects it, but a
mis-click binds the wrong mailbox to the label; step 7's identity check
catches that, so verify there rather than trusting the click.

Gate: `doctor` ends with its `All set:` line and no `Next:` action before you
continue; its live probes also catch APIs left un-enabled in step 2. One
expectation to set with the human: while the OAuth app is in Testing mode,
Google expires each refresh token 7 days after consent. `doctor status` shows
the countdown, and a bare `google-mcp-doctor auth` re-authorizes whatever is
due.

### 4. Register the servers

Name every instance `<service>-<account>`. Register at **user scope** so the
servers are available in every project, not just the current directory.

Whatever the client, register only the service-and-account pairs the human
actually wants; the pattern is the contract, not the worked example below.
Adding a shipped service later is one more registration, not a new consent:
accounts authorize the full scope union once, so a token already serving
Gmail also serves Calendar the moment its instance is registered. (A future
service that adds new scopes forces re-consent of every account;
PROVISIONING.md explains why.)

**Claude Code:**

```sh
claude mcp add --scope user gmail-personal    --env GOOGLE_MCP_ACCOUNT=personal -- google-mcp-gmail
claude mcp add --scope user calendar-personal --env GOOGLE_MCP_ACCOUNT=personal -- google-mcp-calendar
claude mcp add --scope user gmail-work        --env GOOGLE_MCP_ACCOUNT=work     -- google-mcp-gmail
claude mcp add --scope user calendar-work     --env GOOGLE_MCP_ACCOUNT=work     -- google-mcp-calendar
claude mcp add --scope user drive-work        --env GOOGLE_MCP_ACCOUNT=work     -- google-mcp-drive
claude mcp add --scope user sheets-work       --env GOOGLE_MCP_ACCOUNT=work     -- google-mcp-sheets
claude mcp add --scope user docs-work         --env GOOGLE_MCP_ACCOUNT=work     -- google-mcp-docs
```

User-scope entries land in `~/.claude.json`; `~/.claude/settings.json` holds
permissions, never servers, so do not hand-write server entries there. These
commands are not self-checking either: `claude mcp add` errors on an existing
name rather than overwriting, so on a re-run, check `claude mcp get <name>`
and add only what is missing.

**Any client that reads `mcpServers` JSON** (Cursor, Cline, and most others):

```json
{
  "mcpServers": {
    "gmail-personal": {
      "command": "google-mcp-gmail",
      "env": { "GOOGLE_MCP_ACCOUNT": "personal" }
    },
    "calendar-work": {
      "command": "google-mcp-calendar",
      "env": { "GOOGLE_MCP_ACCOUNT": "work" }
    }
  }
}
```

**OpenAI Codex CLI:**

```sh
codex mcp add gmail-personal --env GOOGLE_MCP_ACCOUNT=personal -- google-mcp-gmail
```

or the equivalent table in `~/.codex/config.toml`:

```toml
[mcp_servers.gmail-personal]
command = "google-mcp-gmail"

[mcp_servers.gmail-personal.env]
GOOGLE_MCP_ACCOUNT = "personal"
```

`~/.codex/config.toml` is user-global by nature, so the user-scope
requirement is satisfied by default; there is no scope flag to hunt for.

**Gemini CLI**: the `mcpServers` JSON shape above, inside
`~/.gemini/settings.json` (`gemini mcp add` also works).

**Shared host (optional; one process for everything):** stdio is fine for
one client. Choose the host when more than one agent or session runs on the
box, or when the client spawns MCP servers per thread and never closes them
(Codex `app-server` does). Process count and memory otherwise multiply by
services, accounts, and sessions. Run `google-mcp-host` once under a supervisor
and register the same `<service>-<account>` names by URL. The host serves every
roster account at `http://127.0.0.1:8765/<account>/<service>`.

Moving to HTTP is **one name, one transport**: remove the stdio entry first,
then register the URL under that same name. For Claude Code, run
`claude mcp remove --scope user <name>`. In Codex TOML, delete the entry's
`command`, `args`, and `env` lines or tables. In `mcpServers` JSON, delete the
old command entry before replacing it with the URL entry. Otherwise the
client spawns the stdio copy AND connects to the host. Restart existing
client sessions after replacement so their stdio processes can shut down.

For persistent sharing, use the [systemd user unit or launchd user agent
template](./src/host/README.md#run-as-a-user-service). Install the package
globally and give the template the absolute directory holding `node` and the
`google-mcp-host` shim; a supervisor does not see your shell's PATH, so a
version-managed Node (nvm, fnm, volta) is invisible to it otherwise.
Both templates read `$HOME/.google-mcp/host.env` (mode 0600) containing
`GOOGLE_MCP_HOST_TOKEN=<secret>`. On Linux, enable the unit with
`systemctl --user enable --now google-mcp-host`; use `loginctl enable-linger`
for headless operation. WSL2 requires `[boot]` with `systemd=true` in
`/etc/wsl.conf`. On macOS, bootstrap the user agent as shown in the template.

Before launching, probe a served route without a session id:

```sh
curl -i --header "Authorization: Bearer <secret>" 'http://127.0.0.1:8765/<account>/gmail'
```

HTTP 400 with `No session; send an initialize request first` confirms liveness;
404 means the route is not served, 401 means the token is missing or wrong,
and connection refused means no host is listening there. The startup message
`port 8765 is in use; a google-mcp-host is probably already running; point clients at it`
(the selected port replaces 8765) is another signal; probe and reuse that
listener instead of launching a duplicate.

Use `<url>` = `http://127.0.0.1:8765/<account>/<service>`. Register each
replacement with the token from `host.env`:

```sh
# Claude Code
claude mcp add --scope user --transport http <name> <url> --header "Authorization: Bearer <secret>"
# Codex CLI
codex mcp add <name> --url <url> --bearer-token-env-var GOOGLE_MCP_HOST_TOKEN
```

Codex writes `bearer_token_env_var = "GOOGLE_MCP_HOST_TOKEN"` beside the URL
in its TOML entry. Export the variable from `$HOME/.google-mcp/host.env`
(mode 0600) before starting Codex: `set -a; . "$HOME/.google-mcp/host.env"; set +a`.
The supervisor reads the same file; a GUI client must inherit the variable
from its launch environment too.

For JSON clients that support HTTP headers:

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

Claude and JSON header entries hold the literal secret from `host.env`;
update them when it changes.

Identity is unchanged (one account per session, chosen by the path), the
operations and instructions are the stdio bins', and step 7 verifies it the
same way. On a shared machine set `--token` (or `GOOGLE_MCP_HOST_TOKEN`) and
pass it as an `Authorization: Bearer` header from each client; see
[src/host/README.md](./src/host/README.md).

Each logical client connection has its own session. Idle time runs from the
last request; an open SSE stream does not keep it alive. After `--idle`
minutes (default 720), the host reaps the session, and its old id receives
404. The client must initialize again without that id, as required by the
[MCP session specification](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#session-management).
Recovery is spec-mandated and unverified per client.

**Cloud-sandboxed agents (Google Jules and similar):** out of scope. Jules
connects only to an allowlist of hosted MCP servers, with no way to run an
arbitrary stdio server, and its tasks execute in a fresh VM that does not have
your `~/.google-mcp/` credentials and must never be given them; do not copy
OAuth tokens into a cloud sandbox. Adopt the suite in clients that run on the
machine where the human consented.

### 5. Supersede the first-party Google surfaces

Several clients ship or offer their own Google integration. Two Google
surfaces in one client means the agent may pick the shallower one, or one
bound to a different account than the human intended. Supersession is
client-specific, and the mechanics below are current as of this writing;
vendor surfaces move, so if a knob named here is missing, check the client's
own documentation before improvising.

**Claude Code.** If the human has claude.ai's Google connectors attached,
deny them by adding exactly these three strings to `permissions.deny` in
`~/.claude/settings.json` (create the array if absent, skip any string
already present):

```json
{
  "permissions": {
    "deny": [
      "mcp__claude_ai_Gmail",
      "mcp__claude_ai_Google_Calendar",
      "mcp__claude_ai_Google_Drive"
    ]
  }
}
```

The block above shows the shape, not a file to write: merge the three strings
into the existing `settings.json` (creating the file if absent) rather than
replacing it.

A server-level deny removes every tool of that server from the model's
context, and deny rules win over allow rules at every settings level. The
rules are harmless when the connectors are not attached, and decisive when
they are. This is a local block, not a disconnect; the connectors stay
attached to the claude.ai account until the human removes them at claude.ai →
Settings → Connectors.

Two facts worth knowing rather than acting on: claude.ai connectors load only
when Claude Code is authenticated with a claude.ai subscription (API-key,
Bedrock, and Vertex sessions never see them), and
`ENABLE_CLAUDEAI_MCP_SERVERS=false` disables all claude.ai connectors at
once. The deny rules above are still the right mechanism: they are targeted
to the Google connectors, survive auth-method changes, and leave the human's
other connectors alone.

**OpenAI Codex CLI.** OpenAI curates Gmail and Google Drive plugins (backed
by ChatGPT apps), and curated identifiers follow the `<name>@openai-curated`
pattern. Enumerate the `[plugins.*]` tables in `~/.codex/config.toml` to find
every installed Google plugin, then disable each one:

```toml
[plugins."gmail@openai-curated"]
enabled = false
```

If a plugin's table already existed, set `enabled = false` in place and
record the prior value; either way, list what you superseded in the step 6
block, which is the manifest decommission reads back.

**Gemini CLI.** Google's Workspace extension (Gmail, Calendar, Drive, Docs,
Sheets, and more) is opt-in. If it is installed it overlaps every service
here, with a different identity model: the extension binds whichever account
its OAuth flow captured, while these servers fix one account per process.
Ask the human to uninstall it, or to choose; do not run both surfaces for
the same service. Record the outcome in the step 6 block.

**Cursor, Cline, and Windsurf** ship no first-party Google connector as of
this writing; there is nothing to supersede.

### 6. State the preference where the agent reads it

Write this block into the client's user-level instruction file (for Claude
Code: `~/.claude/CLAUDE.md`; for Codex CLI: `~/.codex/AGENTS.md`; for Gemini
CLI: `~/.gemini/GEMINI.md`), keeping the markers verbatim, filling in the
instance list actually registered, and listing what step 5 superseded. The
block doubles as the manifest decommission reads back. Create the file if it
does not exist; if the markers are already present from an earlier run,
replace the block's contents instead of appending a second copy:

```markdown
<!-- google-mcp-suite:begin -->
## Google services (MCP)

Use the google-mcp-suite servers for all Google work; never a built-in Google
connector. One server per service per account; identity is fixed at startup,
so to act on a different account, use that account's instance.

Configured instances: gmail-personal, calendar-personal, gmail-work,
calendar-work, drive-work, sheets-work, docs-work.

Superseded: the claude.ai Gmail, Google Calendar, and Google Drive connectors
(three deny rules in ~/.claude/settings.json).

Setup and health: `google-mcp-doctor` (diagnose), `google-mcp-doctor auth
<account>` (re-consent when a token expires). If a Google capability is
missing, extend the suite
(https://github.com/simiancraft/google-mcp-suite/blob/main/EXTENDING.md)
rather than falling back to a built-in connector.
<!-- google-mcp-suite:end -->
```

### 7. Verify

Start a fresh session of the client, then:

1. The instances are connected: `claude mcp list` or `codex mcp list` (or
   your client's equivalent) shows every `<service>-<account>` entry healthy.
2. The tools resolve, and identity matches: call a read-only operation on
   each service, for example Gmail `list_labels`, Calendar `list_calendars`,
   and Drive `get_about`. Where an operation returns identity, check it
   against the label's intended account: Drive `get_about` returns the
   account's `emailAddress`, and the Calendar list contains the primary
   calendar, whose id is the account's email. `google-mcp-doctor` prints the
   same mapping from outside the client: its Services table shows each label
   beside the email its probes resolved. A consent mis-click in step 3
   surfaces here as the wrong email; fix it with
   `google-mcp-doctor auth <label>` and a more careful click.
3. The superseded surfaces are gone. Claude Code: in a fresh session, no
   `claude_ai_*` Google tool is listed or callable. Codex CLI: the curated
   Google plugins expose no tools. Gemini CLI: the Workspace extension is
   absent.

Gate: every applicable check passes. If a server fails to connect,
`google-mcp-doctor` names the missing piece (no token, expired token, API not
enabled).

## Decommission

The exact reverse of [the contract](#the-contract), in reverse order. Remove
only what adoption added.

1. **Read, then remove, the marker-delimited block** in the instruction
   file. It is the manifest: the instance list and the superseded list the
   later steps consume, so read it first. Then delete from
   `<!-- google-mcp-suite:begin -->` through `<!-- google-mcp-suite:end -->`
   inclusive, leaving the rest of the file untouched.
2. **Remove the supersession settings**, per the manifest. Claude Code:
   delete exactly the three strings `mcp__claude_ai_Gmail`,
   `mcp__claude_ai_Google_Calendar`, and `mcp__claude_ai_Google_Drive` from
   `permissions.deny` in `~/.claude/settings.json`, leaving every other deny
   rule in place. Codex CLI: restore each plugin table to the state the
   manifest recorded (delete lines adoption added; restore a prior
   `enabled = true` where one existed). Gemini CLI: reinstall the Workspace
   extension only if the human asks for it.
3. **Remove the server entries**, every name matching `<service>-<account>`
   that adoption registered:

   ```sh
   claude mcp list                                      # enumerate what is registered
   claude mcp remove --scope user gmail-personal        # repeat per instance
   ```

   Other clients: delete the corresponding `mcpServers` / `[mcp_servers.*]`
   entries. If adoption ran the shared host, stop its process (and remove the
   supervisor unit that started it) once the `url` entries are gone.
   Also remove any leftover stdio registrations for those names; moving to
   the host must replace the old transport, not leave both configured.
4. **Uninstall the package** (optional):

   ```sh
   npm uninstall -g google-mcp-suite
   ```

After these steps the client behaves as if adoption never happened; built-in
connectors, if attached, resume answering Google requests.

### Removing credentials (optional, destructive)

Decommission deliberately leaves `~/.google-mcp/` alone, because tokens and
the client secret survive a reinstall and re-adoption is then a five-minute
job. To remove them anyway:

```sh
rm -rf ~/.google-mcp
```

Deleting local tokens does **not** revoke anything at Google. To revoke the
grants themselves, the human visits
[myaccount.google.com/connections](https://myaccount.google.com/connections)
for each authorized account and removes the OAuth app, and deletes the OAuth
client in the Google Cloud console.

## The hand-off prompt

A human starting from zero can paste this into their agent:

> Adopt google-mcp-suite per
> https://github.com/simiancraft/google-mcp-suite/blob/main/ADOPTING.md for
> these Google accounts: `personal` (you@example.com) and `work`
> (you@company.com), with these services: Gmail and Calendar on both, Drive,
> Sheets, and Docs on work only. My client is Claude Code. Follow the playbook
> in order, verify every gate, and stop for me at the Google Cloud console
> step and at each browser consent.

Substitute your own client, accounts, and services; the prompt is a worked
example, like every list in this playbook.

To undo it later:

> Decommission google-mcp-suite per
> https://github.com/simiancraft/google-mcp-suite/blob/main/ADOPTING.md.
> Remove exactly what adoption added, leave my credentials in
> `~/.google-mcp/` in place, and show me what you removed.
