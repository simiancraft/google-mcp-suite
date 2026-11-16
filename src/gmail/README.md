# Gmail server

The Gmail MCP server, and the reference (canary) implementation for the
[google-mcp-suite](../../README.md) pattern: `tools/` and `methods/` (verbs) over
`entities/` (nouns), all zod, each an `operation()` from the shared
[`lib`](../lib) and served by `server()` over an [`auth`](../auth) client.

## Capabilities

68 operations across threads, messages, drafts, labels, filters, and account
settings: search and read (`search_threads`, `get_thread`, `get_message`, `list_messages`), compose
and send (`create_draft`, `send_message`, `send_draft`), organize (labels,
`batch_modify_messages`, trash/untrash), attachments (`download_attachment`),
account filters, and settings (vacation replies, auto-forwarding reads, IMAP, POP,
and language), sending identities, forwarding destinations, mailbox history,
S/MIME certificates, CSE identities and keypairs, and RFC 822 message insert/import.
Send-as updates and patches support the primary address only; SMTP relay inputs
and custom alias changes are unavailable under user OAuth. Forwarding destinations
can be inspected, but not created or removed. Delegate operations require service
accounts, including reads, and are not offered.
Auto-forwarding updates require delegated service accounts and are not offered.
History reads accept a saved checkpoint and return one page of changes; expired
checkpoints require a full resync. Use `get_profile` for a fresh historyId or
the optional historyId returned with a message or thread. Insert and import store base64url RFC 822
messages through JSON without sending them; the decoded ceiling is 25 MiB, and
Gmail can reject smaller payloads. Import can add calendar meetings; `deleted`
stores the new message only in Workspace Vault.

S/MIME writes support the primary address only, with hosted S/MIME enabled by an
administrator. Supported editions are Frontline Plus, Enterprise Plus, Education
Fundamentals, Education Standard, and Education Plus. Private keys and passwords
are never returned. CSE requires Frontline Plus, Enterprise Plus, Education
Standard, or Education Plus, admin-enabled CSE and hardware key encryption, and
the Assured Controls or Assured Controls Plus add-on. Key metadata can contain
sensitive opaque service data. Disabling a key blocks decryption and signing;
obliteration after more than 30 disabled days cannot be undone. Prerequisite
sources and the per-method OAuth audit are in [COVERAGE.md](./COVERAGE.md).

Every operation carries the four MCP annotation hints;
removals, CSE key disabling, sends, standing filters, and `update_vacation` ⚠️ are marked destructive
(`destructiveHint`); sends and `update_vacation` are open-world.

The full, always-current list is [`CAPABILITIES.md`](./CAPABILITIES.md),
regenerated from the registries with `bun run capabilities`; what is implemented
versus Google's full surface is mapped in [`COVERAGE.md`](./COVERAGE.md). An MCP client
discovers the live surface, with input and output JSON Schema, from the server's
`tools/list`.

## Layout (`src/gmail/`)

```
index.ts        # server({ name, title, description, instructions, operations, client }); the bin entry
tools/          # MCP-sourced ops; registry.ts + one folder per tool
                #   <tool>/ index.ts + handler.ts + schema.ts + handler.test.ts
methods/        # REST-sourced ops; same construction
entities/       # PascalCase zod domain objects (Label, Thread, Draft, ...)
lib/            # projections: REST entity -> documented shape
```

Scopes are not declared here; every account is authorized once for the
front-loaded union in [`auth`](../auth) (`config.ts` `SCOPES`).

Tool vocabulary is lifted from Google's MCP reference pages
(`https://developers.google.com/workspace/gmail/api/reference/mcp`), used for
discovery only; the handlers reimplement over the Gmail REST API.

## Run

Point your MCP client at one instance per account:

```json
{
  "mcpServers": {
    "gmail-personal": {
      "command": "google-mcp-gmail",
      "env": { "GOOGLE_MCP_ACCOUNT": "personal@example.com" }
    },
    "gmail-work": {
      "command": "google-mcp-gmail",
      "env": { "GOOGLE_MCP_ACCOUNT": "work@example.com" }
    }
  }
}
```

Or run it bare (debugging, smoke tests), bound by the same env var:

```sh
GOOGLE_MCP_ACCOUNT=personal@example.com google-mcp-gmail        # serve
GOOGLE_MCP_ACCOUNT=personal@example.com google-mcp-gmail auth   # authorize the account
```
