# Adding a service: the playbook

The end-to-end process for shipping a new service (Sheets, Drive, Docs, ...),
written for an LLM agent executing it and retraced from how Calendar was
actually shipped (the `feat/calendar` branch, PR #23, June 2026). Where
[EXTENDING.md](./EXTENDING.md) is the per-file recipe (how to construct an
operation, an entity, a service folder), this is the project playbook: survey,
plan, commit cadence, deferrals, docs, verification, and the matrix.

The whole point of the pattern: a service is a **bounded sequence of
documentation-driven commits**, each leaving the tree green, with everything
not shipped tracked as an issue. Nothing is discovered mid-flight that the
plan did not name.

## Phase 0: survey before committing to anything

Read Google's documentation for the candidate service and write down:

1. **Is there an MCP toolset reference?** Calendar's lives at
   `developers.google.com/workspace/calendar/api/v3/reference/mcp` (note: the
   path shape varies per service and some 404 on the "obvious" URL; find the
   real one). If Google publishes no MCP page (Sheets and Docs; the MCP-supported
   products are Gmail, Drive, Calendar, Chat, and People), the service is
   **methods-only**: no `tools/` folder at all, `index.ts` serves
   `mergeOperations(methods)`, `capabilities.ts` renders a single
   `REST Method` section, the surface-count test pins methods only, and
   COVERAGE.md leads with why. Sheets and Docs are the worked examples.
2. **The REST surface size**, from the discovery document
   (`googleapis.com/discovery/v1/apis/<svc>/<version>/rest`). The discovery
   doc is machine-readable and is the precise source for parameter names,
   types, required flags, and enum values; fetch it once and `jq` it instead
   of re-scraping HTML pages.
3. **The hostile features.** Every service has surfaces that do not fit the
   thin-transcription pattern: media upload/download (Drive), request unions
   (`batchUpdate` in Sheets and Docs), watch channels and incremental sync
   (everywhere), ACLs. Name them now; they become the deferral issues.
4. **Scopes.** Check `src/auth/config.ts` (`SCOPES`) and
   `src/doctor/services.ts`. If the service's scopes are already in the
   front-loaded union (Drive, Sheets, Docs, Calendar, and Meet all are),
   existing tokens already carry them and no re-auth is needed. If the scope
   is genuinely new, it must go into `SCOPES` **before any account
   authorizes**, the API must be enabled in the Cloud Console
   ([PROVISIONING.md](./PROVISIONING.md)), and every account must re-consent;
   Google only issues refresh tokens on a fresh grant.

Record the survey date and the exact URLs; every schema written later cites
its page, and the executor re-reads the cited page when transcribing.

## Phase 1: the plan

Write the plan as a single markdown file at the repo root (Calendar's was
`add-calendar-service.md`). The plan must contain exactly these parts:

- **Goal**, under 150 words, stating what "done" looks like in observable
  terms (check green with N operations on the wire, the bin serves, doctor
  probes, docs exist, deferred surfaces live in issues #X #Y #Z).
- **Domain context**: the service-specific traps, numbered. For Calendar this
  was where the lossy MCP Event projection, the `optional` to
  `optionalAttendee` rename, the `date` XOR `dateTime` tri-state, and the
  patch-as-gap-filler design were all decided, before any code. Get these
  decisions into the plan, not into mid-implementation improvisation.
- **The operation list**, two tables. `tools/`: every operation on the MCP
  reference, names verbatim, one row per page, with mapping notes. `methods/`:
  the practical REST surface the toolset omits, chosen from the discovery
  document, minus the hostile clusters. Name the wire vocabulary rule in the
  plan: tools keep the MCP pages' parameter names (`startTime`, `pageSize`,
  `notificationLevel`); methods keep REST's (`timeMin`, `maxResults`,
  `sendUpdates`). Tools also transcribe the Tool Annotations section of their
  MCP page verbatim; methods are classified by the annotation rubric in
  EXTENDING.md. Check each wire name against the service's other resources:
  a name must not be misreadable as a different resource's operation
  (Calendar's `add_calendar_entry` reads like creating an event;
  `subscribe_calendar` would have dodged it).
- **Deferrals as issues.** Every excluded cluster gets a GitHub issue opened
  at plan time (Calendar: #19 ACL, #20 watch channels, #21 import and
  incremental sync), and the plan cites them. "Deferred, tracked as issues,
  not missing by accident" is the posture COVERAGE.md will repeat.
- **File trees, before and after**, and a per-commit sequence where every
  commit has a stated gate (almost always: `bun run check` passes).
- **A verification checklist** ending with: operational matrix issue opened
  and live boxes ticked, docs updated, **plan file deleted**.

The plan lands as its own first commit: `docs(<svc>): add the <svc> service
plan`.

## Phase 2: the commit cadence

Calendar shipped in 11 planned commits; the shape generalizes:

| # | Commit | Content | Gate |
|---|--------|---------|------|
| 1 | `docs(<svc>): add the <svc> service plan` | the plan file | reviewed |
| 2 | `feat(<svc>): scaffold the <svc> service skeleton` | empty registries, `service.ts` exporting `service: ServiceDefinition<Client>`, `index.ts` calling `await server(service)`, `capabilities.ts`, and dep in package.json (the **bin lands with the doctor flip**: the bins-equal-implemented invariant test holds them together, and service bootstraps are knip entries) | check green; the bootstrap serves, `tools/list` returns 0 |
| 3..k | `feat(<svc>): add <cluster>` | operations in dependency order: read path first (it forces the entities and projections), then writes, then remaining tools, then methods grouped by REST resource. `operation.ts` (the `<svc>Operation` binder) lands with the **first** operation commit, not the scaffold: an unreferenced file fails knip's unused-file check (Calendar and Sheets both hit this) | check green after every commit; CAPABILITIES.md regenerated whenever a registry changes |
| k+1 | `feat(doctor): register <svc> as implemented with a live probe` | flip `implemented: true`, add the probe, and add the service to `services` in both `src/suite/dispatch.ts` and `src/host/services.ts` (drift tests tie both lists to the published bins), **cover the probe in `services.probe.test.ts` by mocking the client module**. The probe must be a cheap, id-free, read-only call; when the API has none (Sheets has no list, every read takes an id), probe a stable public artifact (Sheets reads Google's docs sample spreadsheet), and when no stable public artifact exists either (Docs), read a sentinel id and treat a clean 404 as proof of auth and enablement; comment the tradeoff at the probe | check green; `bun run doctor` live-green per account |
| k+2 | `docs(<svc>): document the shipped service` | COVERAGE.md, service README, root README, AGENTS.md, package.json metadata, the icon, and `src/<svc>/instructions.ts` (the served usage paragraph; lands here because its test pins operation names against the finished registry) | check green; `bun run capabilities` produces no diff; links resolve |
| k+3 | `docs(<svc>): delete the shipped plan` | remove the plan file | no references to it remain |

Rules that held up under execution:

- **Working state to working state.** Never commit with check red. The check
  script runs coverage (100%, pinned in `bunfig.toml`); a new function with no
  test fails the gate locally exactly as it would in CI.
- **A surface-count test pins the registries.** `src/<svc>/operations.test.ts`
  asserts the tool count, the method count, and the exact read-only,
  destructive, open-world, and non-idempotent annotation sets, and is updated
  in the same commit as each registry change. All four hints carry an exact
  set; the non-idempotent one is load-bearing at runtime, since `server.ts`
  reads `idempotentHint` as permission to silently replay an operation after a
  credential refresh.
- **Transcribe, do not remember.** Each `schema.ts` cites its source page and
  is written against the fetched page or discovery JSON, not from prior
  knowledge.
- **Projections live in `lib/`, once.** The second copy of any helper is the
  signal to lift it (Calendar learned this with `meetConferenceData`).
- **Compositions are pure functions.** An operation with no REST equivalent
  (Calendar's `suggest_time`) gets its computation in `lib/` as a pure,
  exhaustively unit-tested function, and refuses to answer from partial data
  rather than degrading silently.

## Phase 3: documentation (the full checklist)

The "document the shipped service" commit touches all of these; missing any
one of them is the kind of drift reviewers catch later:

- `src/<svc>/COVERAGE.md`: implemented vs Google's surface (tools N/N, methods
  by resource), the naming rules used, an "intentionally not exposed" section
  with reasons, and a Deferred section citing the issues from Phase 1.
- `src/<svc>/README.md`: capabilities summary, an `mcpServers` JSON config
  block (the thing users actually copy), then the bare CLI form, mirroring
  `src/calendar/README.md`.
- `src/<svc>/CAPABILITIES.md`: regenerated, never hand-edited.
- Root `README.md`: services table row flips to Implemented with the operation
  count linked; the hero caption; the icon row (see below); the quickstart
  `mcpServers` block gains the new service; any "as those services land"
  prose that just landed.
- **The icon.** `.github/assets/<svc>.svg`. If a dimmed planned icon exists
  (a literal `opacity="0.4"` on its root `<g>`), remove that attribute, move
  the icon next to the bright (shipped) icons in the README icon row, and
  update its `alt`/`title` from "(planned)" to the plain service name; if no
  icon exists yet, create it bright.
- `AGENTS.md`: the layout tree gains `<svc>/`.
- `src/suite/dispatch.ts` and `src/host/services.ts`: verify that both registries
  include the service alongside its published bin; the host imports only
  `src/<svc>/service.ts`.
- `package.json`: the `bin` entry landed with the doctor flip; now the
  `description` names the new service and `keywords` gain its terms.
- Sweep for stale parentheticals: `grep -rn "Gmail, Drive"` style example
  lists in PROVISIONING.md, EXTENDING.md, and the PR template have gone stale
  twice now; check them every time a service ships.
- The matrix citation lists (AGENTS.md, EXTENDING.md, and this file's Phase 4)
  gain the new service's issue number once the matrix opens, and EXTENDING's
  version parenthetical ("Gmail is v1, ...") gains the new service.
- **The operation total.** Bump it when a service ships or grows; the total
  lives in README.md (two sites above the fold) and ADOPTING.md (one site).

## Phase 4: verification and the operational matrix

Two layers, both mandatory, both documented in AGENTS.md (Tests convention)
and EXTENDING.md (Live verification):

1. **Unit**: every operation already has its colocated stub-client test from
   Phase 2; `bun run check` enforces 100% coverage.
2. **Live, pairwise**: drive the built server over real stdio (MCP SDK
   `StdioClientTransport` against `dist/<svc>/index.js`,
   `GOOGLE_MCP_ACCOUNT=<account>`) and verify every operation against a real
   account. Pair every destructive operation with its antecedent: create the
   thing, destroy that thing, confirm it gone; the account ends in the state
   it was found. Use disposable containers (Calendar used a disposable
   secondary calendar; Sheets used a disposable spreadsheet) and public
   data for subscribe/unsubscribe pairs. When the API pins a destructive
   operation to a surface you did not create, verify the rejection path and
   document why the success path is deferred. When the service itself has no
   delete (the Sheets API cannot delete a spreadsheet; that is Drive's
   `files.delete`), the verification script cleans up with a direct call to
   the adjacent API (the scope union already covers it) and the matrix issue
   documents that the cleanup ran outside the served surface.

Then open the **operational matrix issue** (the rubric from #7, instantiated
for Calendar in #22, Sheets in #29, Docs in #41, and Drive in #44): one entry per operation
with a `live` and a `unit` checkbox, and a **proof line** on every ticked live box stating what was
created and destroyed, the ids, and the date, for example *created disposable
calendar c_e7e3…, deleted, confirmed gone from the calendar list on
6/10/2026*. Findings the live pass surfaces (API quirks, undocumented
constraints, tombstone behaviors) are recorded in the same issue; they are the
most expensive knowledge the pass produces.

## Phase 5: ship

- Push the branch and open the PR per [CONTRIBUTING.md](./CONTRIBUTING.md)
  conventions; the description leads with what changed, file-by-file or
  cluster-by-cluster, with one line of testing facts.
- Run review passes over the new module before merge, each with a distinct
  lens: architecture (vocabulary coherence, projection boundaries, canary
  conformance), security (input bounds, destructive flag completeness,
  injection surface, publish hygiene), release polish (count drift, broken
  links, runnable examples, badge truth), and adoption (would a stranger copy
  the config block and succeed). Apply the findings as their own commits.
- Merge without squashing; semantic-release reads the atomic commits.

## Worked deltas from shipped services

Sheets shipped from this playbook in June 2026: 15 methods-only operations,
`batchUpdate` deferred as issue #27 and grid data as #28. The predicted
A1-notation `lib/` helper turned out unnecessary; no shipped operation
computes A1, ranges pass through verbatim. Do not build helpers ahead of an
operation that needs them; knip flags them and the pattern says lift on the
second use.

Docs shipped June 2026 (also methods-only): a curated `batchUpdate` subset
instead of a deferral, one operation per request type (editing trio, then the
styling four), with the rest of the 40-type union tracked in #35 and
read-path structure in #36. The curation pattern is the delta worth reusing:
when a service's write surface is one giant union, ship the highest-leverage
request types as their own operations rather than deferring the method.

Drive shipped June 2026: all 8 MCP toolset tools plus 27 REST methods. The
predicted hostile clusters were real and became #38 (media beyond the base64
boundary), #39 (sharing writes), and #40 (changes feed/watch channels); the
toolset's query vocabulary needed a translator (`lib/query.ts`) because the
hosted backends accept terms REST v3 spells differently.
