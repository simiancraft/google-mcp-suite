# Auth (`src/auth`)

Shared OAuth for the google-mcp-suite servers: one Google Cloud OAuth client, one
token per account, authorized once for the front-loaded scope union. Every service
imports this module instead of reimplementing auth.

## What a service uses

- `authorizedClient(account?)`: an authenticated `OAuth2Client` for `account`
  (defaults to `GOOGLE_MCP_ACCOUNT`), built from the stored token. The library
  auto-refreshes the access token from the refresh token.
- `runAuthFlow(account?)`: the browser consent flow; persists that account's token.
- `SCOPES`: the front-loaded scope union across all planned services.
- `loadAccounts()` from `src/auth/accounts.ts`: the account roster shared by
  doctor and host. Auth owns account identity: each entry has a `label` and an
  optional consent login-hint `email`. It reads `accounts.json` from the config
  directory, or infers labels from token files when the roster is absent.

## Credential layout

Credentials live outside the repo, in a config directory (default `~/.google-mcp`):

```
~/.google-mcp/
  accounts.json          # optional account roster, shared by doctor and host
  client_secret.json      # the shared OAuth client (Desktop app), from Google Cloud
  tokens/<account>.json   # per-account token, written 0600 inside a 0700 dir
```

Download an **OAuth client (Desktop app)** from your Google Cloud project and place
its JSON at `~/.google-mcp/client_secret.json`. Either the `installed` or `web`
shape is accepted.

## Environment overrides

All are read lazily, so a host can set them before calling:

| Variable | Meaning | Default |
|---|---|---|
| `GOOGLE_MCP_ACCOUNT` | which account this instance acts as | required |
| `GOOGLE_MCP_DIR` | the config directory | `~/.google-mcp` |
| `GOOGLE_MCP_CLIENT_SECRET` | path to the client secret JSON | `<dir>/client_secret.json` |
| `GOOGLE_MCP_TOKEN` | a specific token file (single-account override) | `<dir>/tokens/<account>.json` |

## Authorize an account

A service exposes the flow through its `auth` subcommand (it calls `runAuthFlow`):

```sh
GOOGLE_MCP_ACCOUNT=you@example.com google-mcp-gmail auth
```

This opens a browser consent screen and stores the token; re-run once per account.
Adding a service's scopes later forces re-consent of every account (Google issues a
refresh token only on a fresh grant), which is why `SCOPES` is front-loaded.

Credentials never live in the repo; `.gitignore` blocks the common filenames.
