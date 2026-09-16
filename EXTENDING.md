# Extending google-mcp-suite

How to add a tool, an entity, or a whole service. The pattern is fixed on
purpose: every tool is a folder, every service is the same shape, and all
vocabulary is sourced from Google's docs. Gmail (`src/gmail`) is the worked
reference. It is one package: `auth`, `lib`, and each service are folders
under `src/` that import each other by relative path and compile to one `dist/`.

This file is the per-file recipe. For the end-to-end project playbook of
shipping a whole service (survey, plan, commit cadence, deferral issues, docs
checklist, live verification, and the operational matrix), see
[ADDING-A-SERVICE.md](./ADDING-A-SERVICE.md).

## The shape

```
src/
  auth/         # authorizedClient(account) + runAuthFlow(account); never reimplement auth
  lib/          # the protocol surface; never reimplement the server
                #   root = the named ideas (operation, server, capabilities,
                #   instructions, optionality, limits); utils/ = mechanisms;
                #   testing/ = build-excluded test scaffolding
  <svc>/        # one folder per service (gmail, calendar, ...)
    index.ts        # server({ name, title, description, instructions, operations, client }); the bin entry
    operation.ts    # <svc>Operation: operation() bound to the service's client type
    instructions.ts # the served usage paragraph (MCP initialize result); testable without booting
    capabilities.ts # regenerates CAPABILITIES.md from the registries (bun run capabilities)
    operations.test.ts  # the surface pins (counts, annotation sets, citations, instructions, doc equality)
    entities/       # PascalCase zod nouns (Label.ts, Thread.ts, ...)
    lib/            # projection helpers (REST entity -> documented shape)
    tools/          # mirror the MCP toolset reference
      registry.ts   # the registry: { tool_name, ... } (key = wire name)
      <tool_name>/  # snake_case, verbatim from Google
        schema.ts        # export const schema = { input, output } (zod; compose entities)
        handler.ts       # the work: a standalone handler(client, args)
        index.ts         # export const <tool_name> = operation({ description, annotations, source, schema, handler })
        handler.test.ts  # mocked-client unit test
    methods/        # cover the REST reference (same construction as tools/)
      registry.ts
      <method_name>/ { schema.ts, handler.ts, index.ts, handler.test.ts }
```

A service imports `lib` and `auth` by relative path (`../lib/server.js`,
`../lib/operation.js`, `../auth/oauth.js`). Each operation is three code
files plus a colocated test: `schema.ts` is the contract (regenerable from the docs), `handler.ts` is the
work (the REST call + projection), `index.ts` is the definition that binds
them with `operation()`, and `handler.test.ts` drives the handler against a
stub client. Keep them split.

## Add a tool

1. **Find the page.** `…/reference/mcp/tools_list/<tool_name>`. Note its input
   schema, output schema, any `object (X)` it references, and the **Tool
   Annotations** section at the bottom (all four hints; transcribed verbatim
   into the definition).
2. **Make the folder** `tools/<tool_name>/` (snake_case, exactly the wire name).
3. **`schema.ts`:** export `const schema = { input, output }`, mirroring the
   documented input/output as zod; reference entities for named objects; keep
   inline primitives inline. The input wrapper and every object nested under
   it are `z.strictObject` (suite-wide decision: an unknown key is an agent
   typo and must reject loudly at any depth; a typo'd key inside a nested
   noun like `textStyle` or `criteria` would otherwise strip silently into a
   no-op). The wire schema carries `additionalProperties: false` on every
   object node, and the surface pin walks the emitted input schema
   recursively. Strictness rides into outputs where an input entity is also
   projected there (projections construct exactly, so this is free);
   output-only wrappers and entities stay `z.object`. The folder's
   citation lives once, in `index.ts`'s `source` field; do not restate the URL
   in schema.ts.
4. **`handler.ts`:** `export async function handler(client, args) { … }`, typed
   `args: z.infer<typeof schema.input>` and returning `z.infer<typeof
   schema.output>`. The handler calls the REST method and **projects** the
   response into the output shape (rename/select fields; the docs' shape, not the
   raw entity). Reuse `lib/` projections.
5. **`index.ts`:** `export const <tool_name> = operation({ description,
   annotations, source, schema, handler })`. `operation()` is a typed identity
   function; it infers the client from the handler's first parameter and the
   input/output from the schema. `annotations` is the four-hint quad (see
   Annotations below); `source` is the reference page URL the folder
   transcribes, emitted on the wire under
   `_meta['com.simiancraft.google-mcp/source']` (the `SOURCE_META_KEY`
   constant in `src/lib/operation.ts`) and linked from the generated
   CAPABILITIES.md, so an agent can fetch the authoritative documentation for
   any operation.
6. **`handler.test.ts`:** feed a stub client to `handler` (a hand-rolled fake
   that captures params; never the network), assert the exact Google params per
   input shape, assert the projection, and `schema.output.parse(result)`.
7. **Register** it in `tools/registry.ts`.
8. **Update the surface pins and regenerate the doc.** `operations.test.ts`
   pins the counts and the exact read-only, destructive, open-world, and
   non-idempotent sets (update them in the same commit), and an equality test
   pins CAPABILITIES.md to the registries, so the suite stays red until
   `bun run capabilities` regenerates it.
9. `bun run check`, then verify live against a real account (see
   [Live verification](#live-verification)).

## Tools vs methods

`tools/` mirrors Google's **MCP toolset** reference (its word: "tools").
`methods/` covers the broader **REST** reference (its word: "Methods"), the
operations the MCP toolset omits. Identical construction; both are `operation()`
definitions. The server merges both into one wire surface (via
`mergeOperations(tools, methods)`), so on the MCP wire everything is a "tool".

The split is **intentional and load-bearing, not just organizational.** MCP's
toolset alone cannot fully drive a Google service; `methods/` is how the suite
goes past it to fully instrument an account. The two folders mirror Google's own
two reference trees (MCP vs REST), which keeps provenance obvious and makes the
surface self-documenting. It also enables **documentation-driven updates**: a
reference page maps one-to-one onto a `schema.ts`/`handler.ts`/`index.ts` triple
(occasionally a page splits into several operations where annotations differ,
like Drive's `files/update` page behind `update_file` and the trash pair),
so "here is the page, make the files" is a bounded, repeatable unit of work. The
merge throws on a duplicate wire name (`mergeOperations`), so the only real hazard
of the split, a tool and a method colliding on one key, fails loudly rather than
silently dropping an operation.

Add a method exactly like a tool, but transcribe from the REST method page
(`…/reference/rest/v<n>/<resource>/<method>`; Gmail is v1, Calendar v3,
Sheets v4, Docs v1, Drive v3; Calendar's pages deviate, with no `rest`
segment and the version before `reference`: `…/calendar/api/v3/reference/`):
that page URL becomes the definition's `source`, and the annotations follow the rubric below, since REST pages publish no Tool
Annotations section.

Where Google publishes no MCP toolset at all (Sheets and Docs; the
MCP-supported products are Gmail, Drive, Calendar, Chat, and People), the
service is
**methods-only**: no `tools/` folder, `index.ts` serves
`mergeOperations(methods)`, and `capabilities.ts` renders a single
`REST Method` section. The service's COVERAGE.md leads with why.

**Annotations.** Every operation declares all four MCP behavior hints
explicitly (`readOnlyHint`, `destructiveHint`, `idempotentHint`,
`openWorldHint`), typed as `OperationAnnotations` (`src/lib/operation.ts`,
which carries the full provenance TSDoc; all four fields are required, so an
unclassified operation does not compile) and emitted verbatim in
`tools/list`. The semantics are the
spec's (`modelcontextprotocol.io/specification/2025-06-18/schema`,
ToolAnnotations): read-only = does not modify the environment; destructive =
may perform non-additive updates; idempotent = repeating with the same args
has no additional effect; open-world = reaches external entities. **Tools
transcribe the Tool Annotations section of their Google MCP reference page
verbatim** (each page publishes all four); methods follow the rubric those
pages establish:

- reads → `{ readOnlyHint: true, destructiveHint: false, idempotentHint: true }`
- creates → all false (additive, and repeating duplicates)
- updates and additive modifications (label, subscribe, untrash, patch) →
  destructive **false**, idempotent true (Google's `update_event` precedent:
  overwriting fields is not "destructive" in MCP's vocabulary)
- removals (delete, clear, trash, unlabel, unsubscribe) → destructive
  **true**, idempotent true (Google's `unlabel_message` precedent; reversible
  removals still count)
- sends → destructive true, idempotent false, and open-world true (the
  rubric's one cluster that reaches arbitrary external parties); a standing
  side effect (`create_filter`) is destructive and not idempotent

Everything else under the rubric is closed-world (`openWorldHint: false`).
Toolset transcriptions keep their page's hints verbatim either way; Drive's
`create_file`/`copy_file` pages publish open-world, so the shipped pair
carries it.

**The surface pins.** Each wing's `operations.test.ts` asserts, and every
registry change updates: the tool and method counts; all four hints present
on every operation; the exact read-only, destructive, open-world, and
non-idempotent sets (all four hints carry an exact set, and the
non-idempotent one is load-bearing at runtime: `server.ts` reads
`idempotentHint` as permission to silently replay an operation after a
credential refresh);
strict inputs at every depth (the recursive `additionalProperties: false`
walk); the citation shape per provenance (a tool cites its own
`mcp/tools_list/<name>` page, a method a REST reference page); the
instructions string (cites the real `_meta` key, names only real
operations); and that CAPABILITIES.md equals a fresh render of the
registries.

Annotations are written as the four explicit flags at each definition site,
the same way Google's pages present them; do not abstract them into named
profiles or category constants. The flags are the transcription, and the
one-offs (`create_filter`, the sends, the `list_drafts` deviation) do not
fit a category scheme.

**Output crosses the wire as JSON.** Every result is JSON-serialized (a `text`
block plus `structuredContent`); there is no binary or streaming channel. Binary
payloads are base64-encoded into a JSON string field per their source API's
convention (Gmail's `download_attachment` is URL-safe base64url; Drive's
`download_file_content` is standard base64), by design. A service that needs
native blob output extends `lib` (`server`/`callOperation`), not a single operation.

## Add an entity

When a tool's schema references `object (X)`, add `entities/X.ts`:

```ts
import { z } from 'zod';
export const X = z.object({ id: z.string().describe('..., from the docs') });
export type X = z.infer<typeof X>;
```

An entity composed into any input schema must be `z.strictObject` (the
strict-input rule above holds at every depth; the recursive surface pin
fails otherwise). Follow the chain: if `X` references `object (Y)`, add
`entities/Y.ts` too. Open
`entities/` and it should be the complete catalog of the service's nouns.
Resources and reused elements get entities (shared enum fields too, like
Calendar's `NotificationLevel` or Sheets' `ValueInputOption`); a one-off
response wrapper may stay inline in its `schema.ts`.

**Enum policy.** Inputs are closed `z.enum`s with the `*_UNSPECIFIED` variants
never exposed. Outputs are closed `z.enum`s with unknown values **dropped** at
projection (the field goes absent; `narrow()` in the shared `src/lib/utils/narrow.ts`
is the helper, and the allowed list derives from the entity itself,
`Entity.shape.<field>.unwrap().options`, so projection and schema cannot
disagree): the schema stays truthful and a new upstream value degrades to a
missing field, never a wrong one. Never coerce an unknown value to a
valid-looking default. (Calendar's open-string output fields, e.g.
`Event.status`, predate this rule and keep their shape for wire stability.)

**Shared utilities.** Lib's kit, and the failure-mode contract that binds it:
in-memory lookups miss soft (`utils/lookup.ts` `ownLookup` for plain-object
maps with caller-influenced keys; `utils/narrow.ts` `narrow` for output
enums), boundary I/O fails loud (`utils/json.ts` `readJsonFile` parses and
validates on-disk JSON in one step; `limits.ts` `assertWithinDownloadCap`
refuses oversize transfers), and `callOperation`'s envelope catches whatever
throws (`utils/error.ts` `errorMessage` renders it). `optionality.ts` owns
the optionality policy: `Optional<T>` is the suite's spelling of "may be
absent," and `forGoogle` reconciles it with Google's generated types at every
request boundary. Reach for these before hand-rolling; each exists because
the hand-rolled version drifted or was forgotten at least once.

**Identity fields fall back to sentinels.** Projections default a missing
required identity to `''`/`0` (`id: data.id ?? ''`, `sheetId ?? 0`), uniform
across services; Google always sends these in practice. Where the input
already carries the true value, prefer it over a sentinel
(`data.spreadsheetId ?? args.spreadsheetId`).

**Doc comments are sourced too.** Give the entity a TSDoc comment from the API
guides **Concepts** page (Google's own definition of the noun) with an `@see`
link.

A **suite-native** entity (a noun the suite invents where Google's surface
has none, like Gmail's `AttachmentFile` over the `raw` field) cannot cite a
Concepts page. Instead its TSDoc must say plainly that it is a suite
extension, cite the tracking issue that motivated it, and `@see` the nearest
documented API field it targets; record the extension in the service's
COVERAGE.md extension section.

Put **field-level** docs in `.describe()`, not JSDoc: the server emits the
schema with `z.toJSONSchema`, which carries `.describe()` text into the wire JSON
Schema, so an MCP client (and the LLM reading it at tool-selection time) sees the
field docs; JSDoc on a field never reaches the wire. Source the field text from
the tool/REST reference.

## Add a service

1. **Make the folder** `src/<svc>/`. Add the per-API client
   `@googleapis/<svc>` to the root `package.json` dependencies (not the
   `googleapis` monolith; it loads ~900 modules per process at startup), and a
   `bin` entry `"google-mcp-<svc>": "./dist/<svc>/index.js"`.
2. Add the service's scopes to the shared `SCOPES` union in `src/auth/config.ts`
   so each account is authorized once. Services do not declare scopes locally.
3. `index.ts`: `server({ name, title, description, instructions,
   operations: mergeOperations(tools, methods),
   client: async (a) => <svc>({ version, auth: await authorizedClient(a) }),
   runAuth: runAuthFlow })`. `title`, `description`, and the package-homepage
   `websiteUrl` default identify the server in client UIs (MCP
   `Implementation`); `instructions` is served in the initialize result, which
   clients typically inject into the agent's context at connect time. Write it
   as the one paragraph an agent should read before calling tools: identity
   binding, vocabulary, and the service's traps. Keep the string in
   `src/<svc>/instructions.ts`, composed from lib's `identityInstructions()`
   preamble, `vocabularyInstructions()` sentence (which interpolates
   `SOURCE_META_KEY`; never hand-typed), and `untrustedContentInstructions()`
   advisory (presence pinned by the surface pin), so the wing test can pin it
   without booting the server (`index.ts`'s import side
   effect is `await server()`).
   (`import { server } from '../lib/server.js'`,
   `import { mergeOperations } from '../lib/operation.js'`,
   `import { authorizedClient, runAuthFlow } from '../auth/oauth.js'`,
   `import { <svc> } from '@googleapis/<svc>'`,
   `import { tools } from './tools/registry.js'`,
   `import { methods } from './methods/registry.js'`). `mergeOperations` throws
   if a tool and a method share a wire name. The server's `version` defaults to
   the package version, so do not pass it.
   Also add `src/<svc>/operation.ts`, the per-service binder: a one-liner
   exporting `<svc>Operation`, which is `operation()` bound to the service's
   client type (`sheets_v4.Sheets`, ...). Every op's `index.ts` uses the binder
   instead of raw `operation()`, so a handler that drops or mistypes its client
   annotation fails at the definition rather than inferring `unknown`. The
   binder lands with the first operation commit, not the scaffold (an
   unreferenced file fails knip). The registry's `satisfies
   Record<string, AnyOperation<Client>>` checks only the client binding;
   schema-handler agreement is enforced by the binder.
4. Stamp tools (above), one per page on the service's MCP reference (or, where
   Google publishes no MCP page, from the REST reference). Track gaps in a
   `COVERAGE.md`.

**Per-client identity is a solved pattern; do not re-solve it.** A service that
needs "who am I" (Gmail's sender address) should look it up once and memoize per
client, as `src/gmail/lib/profile.ts` does with a `WeakMap`, rather than fetching
it on every operation.

## Live verification

Unit tests never touch the network, so every operation is also verified once
against a real account, tracked per service in an **operational-matrix issue**
(a live + unit checkbox per operation; Gmail is #7, Calendar is #22, Sheets
is #29, Docs is #41, Drive is #44).

Live passes are **pairwise**: pair every destructive operation with its
antecedent, so the only data ever destroyed is test data the pass itself made,
and the account ends in the state it was found.

- Delete something? Create that something first, then delete it, then **confirm
  it gone**. The confirmation signal is API-specific: a deleted event fetches
  back with `status=cancelled`; a deleted calendar vanishes from the calendar
  list (though `calendars.get` may serve a tombstone briefly after deletion).
- Create something? Delete it before the pass ends.
- Reads verify as-is; they have no state to restore.
- Subscribe/unsubscribe pairs use public data (a public holiday calendar, for
  example), never entries the user relies on.
- When the API pins a destructive operation to a surface you did not create
  (`calendars.clear` accepts only the primary calendar), verify the rejection
  path with self-made data and document in the matrix issue why the success
  path is deferred. Do not attempt lossy snapshot-and-restore on real data.

Record a **proof line** per operation in the matrix issue: what was created and
destroyed, the ids, and the date. For example: *created disposable calendar
c_e7e3…, deleted, confirmed gone from the calendar list on 6/10/2026*.

Mechanics: drive the built server over real stdio with the MCP SDK client
(`StdioClientTransport` against `dist/<svc>/index.js`,
`GOOGLE_MCP_ACCOUNT=<account>`), so the pass exercises the same wire surface an
agent uses, schemas and projections included.

## Run

One instance per account:

```sh
GOOGLE_MCP_ACCOUNT=<account> google-mcp-<svc>        # serve
GOOGLE_MCP_ACCOUNT=<account> google-mcp-<svc> auth   # authorize the account
```

Or every service for every roster account from one process, over Streamable
HTTP, one session per client (`src/host/README.md`):

```sh
google-mcp-host        # http://127.0.0.1:8765/<account>/<svc>
```

Credentials live outside the repo: `~/.google-mcp/client_secret.json` (shared
OAuth app) and `~/.google-mcp/tokens/<account>.json` (per account, 0600).
