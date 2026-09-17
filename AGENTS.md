# google-mcp-suite: Agent Instructions

A single package of **Google MCP servers**: one thin [Model Context Protocol](https://modelcontextprotocol.io/) server per Google service, each authorized per account, all sharing one auth implementation. The organizing entity is a Google **account**; its children are **services** (Gmail, Calendar, ...); each service exposes **operations**. One package, one version; each service ships as its own `bin`.

This file is for working **on** the repo. To take the suite into service as a client's Google surface (register instances, supersede built-in connectors, decommission), follow [ADOPTING.md](./ADOPTING.md) instead.

## Quick orientation

```
google-mcp-suite/
└── src/
    ├── auth/        # shared OAuth: authorizedClient(account), runAuthFlow(account), SCOPES, and loadAccounts() (account roster)
    ├── lib/         # the protocol surface: root files are the named domain ideas (operation, server, capabilities, instructions, optionality, limits); utils/ holds mechanisms; testing/ is build-excluded scaffolding
    ├── gmail/       # the canary server; new services mirror it as src/<service>/
    │   ├── service.ts        # the ServiceDefinition: { name, title, description, instructions, operations, client }
    │   ├── index.ts          # server(service): the stdio bin entry; the host serves the same definition over HTTP
    │   ├── operation.ts       # gmailOperation: operation() bound to the client type
    │   ├── instructions.ts    # served usage paragraph (MCP initialize result)
    │   ├── entities/          # PascalCase zod nouns (Label, Thread, Draft, ...)
    │   ├── lib/               # projection helpers (REST entity -> documented shape)
    │   ├── tools/             # MCP-sourced ops; registry.ts + one folder per tool
    │   │   └── <tool>/        # index.ts + handler.ts + schema.ts + handler.test.ts
    │   └── methods/           # REST-sourced ops; same construction
    │       └── <method>/      # index.ts + handler.ts + schema.ts + handler.test.ts
    ├── calendar/    # the Calendar server; same construction as gmail/
    ├── sheets/      # the Sheets server; methods-only (Google publishes no Sheets MCP toolset, so no tools/)
    ├── docs/        # the Docs server; methods-only (curated batchUpdate subset is the editing surface)
    ├── drive/       # the Drive server; MCP toolset (8 tools) + REST methods
    ├── suite/       # the front-door bin (google-mcp-suite <service>); dispatches to a service, doctor, or host, imports none of their internals
    ├── host/        # google-mcp-host: every service, every account, one Streamable HTTP process; knows the services, no service imports it; see src/host/README.md
    └── doctor/      # provisioning + auth-health CLI (bin: google-mcp-doctor); see src/doctor/README.md
```

`auth`, `lib`, and each service are folders that import each other by relative
path and compile to one `dist/`. There is no workspace and no bundler; plain `tsc`
emits a self-contained package.

## Conventions (follow these)

- **Auth lives once.** `src/auth/accounts.ts` owns account identity and the optional roster; `loadAccounts()` reads it for doctor and host, or infers accounts from token files. A service never implements OAuth. It imports from `src/auth` and calls `authorizedClient(account)` to get an authenticated client. If you find auth code in a service folder, it is a bug; lift it to `src/auth`.
- **Identity by instance, not by argument.** A running server is bound to one account via the `GOOGLE_MCP_ACCOUNT` env var. Operations do not take an account parameter; multi-account is achieved by running one instance per account. The shared HTTP host keeps the rule with sessions instead of processes: each session is bound to the account in its URL path (`/<account>/<service>`), built from the same `ServiceDefinition` the stdio bin runs.
- **B1 token model.** One shared OAuth client (`client_secret`). One token per account, granted the front-loaded scope union, authorized once. A service reads only the token for its configured account.
- **Thin servers, folder-per-operation.** Each operation is a folder with three files: `schema.ts` (a single `schema: { input, output }` zod object, composing `entities/`), `handler.ts` (the work; a standalone `handler(client, args)` function), and `index.ts` (the definition: `export const <name> = operation({ description, annotations, source, schema, handler })`; `annotations` is the four-hint quad, `source` the transcribed reference page, emitted on the wire under `_meta['com.simiancraft.google-mcp/source']`), plus a colocated `handler.test.ts`. Every operation has the same `Operation` shape. The `lib` folder (`src/lib`) provides the two primitives, `operation()` and `server()`; never reimplement the protocol. `src/gmail` is the shape to copy.
- **Tools vs methods, both operations.** `tools/` mirrors Google's MCP toolset reference; `methods/` covers the broader REST reference (operations the toolset omits). Identical construction; both use `operation()`. The server merges them with `mergeOperations(tools, methods)`, which throws on a duplicate wire name. On the MCP wire there is only "tools". Where Google publishes no MCP toolset at all (Sheets and Docs), the service is **methods-only**: no `tools/` folder, and `methods/` is the whole wire surface. The split is intentional, not incidental: MCP's toolset alone cannot fully drive a service, so `methods/` is how the suite goes past MCP to fully instrument an account, and the two folders mirror Google's own two reference trees (MCP vs REST) to keep provenance obvious and enable documentation-driven updates (a reference page maps onto one `schema`/`handler`/`index` triple). Every operation declares all four MCP `ToolAnnotations` hints explicitly (read-only, destructive, idempotent, open-world), emitted verbatim in `tools/list`: tools transcribe their Google MCP page's Tool Annotations section; methods follow the same rubric (reads read-only, creates additive, updates non-destructive, removals destructive, sends destructive + open-world); see EXTENDING.md. All vocabulary is sourced from the docs; entity TSDoc from the guides Concepts page, field docs in `.describe()` so they reach the wire schema. See `EXTENDING.md`.
- **Canary first.** Patterns are proven in `src/gmail`, then lifted into `src/lib`/`src/auth` or replicated into a new service folder. Do not invent a new shape per service.
- **Provisioning and auth health live in `doctor`.** `src/doctor` is a peer micro-CLI (bin `google-mcp-doctor`) for setup, authorization, and health checks; it **knows the services but no service imports it**, and it touches only `src/auth`, `src/lib`'s shared utilities, plus `@googleapis/*`. Use `doctor scopes`/`doctor check`/`doctor auth` for onboarding. Full reference: `src/doctor/README.md`.
- **Tests: stub-client units, then pairwise live verification.** Two layers, both mandatory for every operation. (1) A colocated `handler.test.ts` drives the handler with a hand-rolled stub client (never the network): capture the params the handler sends to Google and assert them exactly, then `schema.output.parse(result)` to prove the projection conforms. `bun test` must never touch a real account. (2) Live verification runs separately against real accounts and is tracked per service in an operational-matrix issue (live + unit checkbox per operation; Gmail is #7, Calendar is #22, Sheets is #29, Docs is #41, Drive is #44). Live passes are **pairwise**: every destructive operation runs against an antecedent the same pass created (create the thing, then destroy that thing, then confirm it gone); reads are read-only; the account must end in the state it was found, so the only data ever destroyed is test data the pass itself made. Record a proof line per operation in the matrix issue (what was created/destroyed, the ids, the date). When the API pins a destructive operation to a surface you did not create (e.g. `calendars.clear` is primary-only), live-verify the rejection path with self-made data and document why the success path is deferred.
- **Commits**: Conventional Commits (`feat(drive): ...`, `fix(auth): ...`). **Do NOT** attribute AI co-authorship.

## Build toolchain

Single package, plain `tsc` to `dist/` (no bundler: relative imports resolve in
the published package); runtime server executables value build stability over
preview compilers like `tsgo`.

## Common commands

```sh
bun install
bun test                 # run every test
bun test src/gmail       # one area
bun run typecheck        # tsc --noEmit
bun run lint             # biome check
bun run lint:fix         # biome check --write
bun run build            # tsc -> dist
bun run capabilities     # regenerate CAPABILITIES.md from the registries
bun run doctor           # provisioning + auth health (also: doctor status | auth | scopes)
bun run check            # full pre-PR gate (lint-fix, build, typecheck, test, knip)
```

## Adding a tool, method, entity, or service

See **`EXTENDING.md`** for the per-file recipe and **`ADDING-A-SERVICE.md`**
for the end-to-end service playbook (survey, plan, commit cadence, deferral
issues, docs checklist, live verification, and the operational matrix),
retraced from how Calendar shipped. In short: source the operation from
its Google reference page, make a `tools/<name>/` or `methods/<name>/` folder
(`schema.ts` + `handler.ts` + `index.ts` + `handler.test.ts`) inside the service,
register it in that folder's `registry.ts`, and add any new `entities/`. A new
**service** is a new folder `src/<service>/`: add its scopes to the shared
`SCOPES` union in `src/auth/config.ts` (services do not declare scopes locally),
export its `ServiceDefinition` from `service.ts` and call `server(service)` in
its `index.ts` (instructions are served in the MCP initialize result), add a
`bin` entry in `package.json`, and register the service in both
`src/suite/dispatch.ts` (so the front-door bin can start it) and
`src/host/services.ts` (so the shared host serves it); drift tests tie both
lists to the published bins.

## Things that will trip you up

- **Scope union is front-loaded.** Adding a service's scopes later forces re-consent of every account (Google re-issues the refresh token only on a fresh grant). Add scopes to `src/auth/config.ts` deliberately.
- **Credentials never go in the repo.** The shared client secret and per-account tokens live outside the tree; `.gitignore` blocks the obvious filenames. Never write a token into a tool response or log.
