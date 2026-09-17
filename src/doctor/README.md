# google-mcp-doctor

Provisioning and auth-health micro-CLI for google-mcp-suite. It answers "is this
install provisioned, authorized, and reachable?" and tells an agent or human the
exact next step. Ships as the `google-mcp-doctor` bin.

## Why it is a peer, not part of a service

Doctor is a **peer** of the services. The dependency direction is one-way and
load-bearing:

- **Doctor knows the services; the services never import doctor.**
- Doctor imports the auth layer (`src/auth`), lib's shared utilities
  (`src/lib/utils`), and stable public surfaces (`@googleapis/*`) only, never
  a service's internals (`src/gmail/*`). Each service's live probe is built
  from `@googleapis/<svc>` + `authorizedClient`, so doctor stays decoupled
  from service churn.

Doctor's knowledge of the services lives in `src/doctor/services.ts` (name, Cloud
API id, scopes, and an optional live probe). The canonical scope list stays
`SCOPES` in `src/auth/config.ts`; `scopeRegistryDrift()` plus a test guard the two
against silent drift.

## Commands

| Command | What it does |
|---|---|
| `google-mcp-doctor` (alias `check`) | Full diagnostic: provisioning, per-account scope coverage + token expiry, live service probes, and one `Next:` action. |
| `google-mcp-doctor status` | Refresh-token countdown table (authorized-at, expires, time-left, state). |
| `google-mcp-doctor auth [<acct>…]` | Browser consent. No args: re-auth what is expired/due. `--all`: every roster account. `<acct>`: an email (works with no config) or a roster label. |
| `google-mcp-doctor scopes` | The exact Cloud APIs and OAuth scopes to enable, read from `SCOPES` so they are always version-accurate. |
| `google-mcp-doctor help` | Usage. |

`--no-probe` skips the live service health checks (offline/fast). Dev aliases:
`bun run doctor`, `bun run tokens`, `bun run reauth`.

## The onboarding flow it drives

1. `doctor` / `doctor scopes` prints the APIs and scopes to enable in Google Cloud
   (the human-only console step) and whether the client secret is in place.
2. The human provisions the OAuth app per [`PROVISIONING.md`](../../PROVISIONING.md)
   and drops `client_secret.json` in `~/.google-mcp/`.
3. `doctor auth you@example.com` runs browser consent and writes the per-account
   token. Zero-config: a bare email is its own account label and login hint.
4. `doctor status` / `doctor check` confirm authorized and reachable.

Interactive prompts are deliberately avoided: an agent drives doctor with args and
reads stdout, so the "which account?" question belongs in the agent's conversation,
not a TUI.

## The accounts roster (optional)

Multi-account features (`auth --all`, `status`, login-hint prefill) read an
optional roster at `<GOOGLE_MCP_DIR>/accounts.json`, kept outside the repo.
`loadAccounts()` in `src/auth/accounts.ts` owns this account identity surface
and shares it with the HTTP host:

```json
[
  { "label": "personal", "email": "you@gmail.com" },
  { "label": "work", "email": "you@company.com" }
]
```

`label` is the `GOOGLE_MCP_ACCOUNT` value and token filename; `email` is the
consent `login_hint`. Single-account `auth <email>` needs no roster. When absent,
the roster is inferred from existing token files.

## How the expiry countdown works

In an External + Testing OAuth app, refresh tokens expire 7 days after issuance.
Google returns no issuance timestamp, so the token file's mtime (written at the
end of the consent flow) is the "authorized at" signal; consumer tokens that carry
`refresh_token_expires_in` use that instead. `status` and `check` surface the
countdown so re-auth is a scheduled chore, not a surprise mid-task.

## Adding a service to doctor's knowledge

Append to `SERVICES` in `src/doctor/services.ts`:
`{ name, api, scopes, implemented, probe? }`. Set `implemented: true` and supply a
`probe` (a cheap read built from that service's `@googleapis/*` client +
`authorizedClient`) once the service is live. Keep the attributed `scopes` in sync
with `src/auth/config.ts`, or the drift test fails.

## Layout

```
src/doctor/
  index.ts      # bin entry + subcommand dispatch
  diagnose.ts   # the `check` diagnostic and `scopes`
  status.ts     # token countdown + grantedScopes
  auth.ts       # the `auth` runner (target selection -> runAuthFlow)
  services.ts   # the service registry doctor checks
  browser.ts    # WSL-safe URL opener
```
