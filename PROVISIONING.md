# Provisioning google-mcp-suite

Everything you do **once in Google Cloud** to stand up the shared OAuth app, plus
the **per-account** authorization each Google account needs. This is the long,
explicit version; the README's "Auth setup" is the summary.

The console is a maze, so this doc is written to be followed literally, by a
person or by an LLM driving a person. Where the UI is mid-migration, both the old
and new menu names are given.

## Mental model (read this first)

There are **two independent surfaces** in Google Cloud, in different menus, and you
need both:

1. **Enable an API** so the project is allowed to *call* a service (Gmail, Calendar,
   Meet, ...). Menu: *APIs & Services > Library*.
2. **Declare a scope** on the consent screen so the OAuth flow is allowed to
   *request* that permission. Menu: *Google Auth Platform > Data access* (old:
   *OAuth consent screen > Scopes*).

Enable without declaring the scope and consent never asks for it. Declare the
scope without enabling the API and consent succeeds but every call returns
`403 ... has not been used in project`. You need both, for every service.

This project uses a **per-user OAuth** model: one OAuth app (one client secret),
and each Google account consents once to the **full scope union** for all planned
services. The union is front-loaded in code at [`src/auth/config.ts`](https://github.com/simiancraft/google-mcp-suite/blob/main/src/auth/config.ts)
(`SCOPES`); Google issues a refresh token only on a fresh grant, so adding a scope
later forces every account to re-consent. Add all the scopes you expect to need
before the first authorization.

---

## Phase 1: project (one time)

1. Sign in to <https://console.cloud.google.com> as the account that will **own**
   the OAuth app (for this repo: `info@simiancraft.com`, a Workspace account).
2. Top bar: click the **project picker** (the dropdown left of the search box).
3. Select the existing **google-mcp** project, or **New project** to create one.
   The project must exist before anything below; everything is scoped to it.
4. Confirm you are in the right project: its name shows in the top bar, and its
   number matches the client ID prefix you will create in Phase 3
   (`<number>-xxxx.apps.googleusercontent.com`).

> Provisioning a brand-new project also needs **billing** linked only if you later
> use paid APIs. The Workspace APIs here (Gmail, Drive, Sheets, Docs, Calendar,
> Meet, Tasks, Slides, People, Drive Activity) do **not** require billing.

---

## Phase 2: enable the APIs

### Console (manual; the path actually used)

1. Left nav or search: **APIs & Services > Library**
   (<https://console.cloud.google.com/apis/library>).
2. At the top, the **Enable APIs and Services** button / the Library landing.
3. In the category list, click **Google Workspace**: every Workspace API is
   grouped there.
4. For each API you want, open its card and click **Enable**. For this suite:
   - Gmail API
   - Google Drive API
   - Google Sheets API
   - Google Docs API
   - Google Calendar API
   - Google Meet REST API
   - (optional, see appendix) Tasks, Slides, People, Drive Activity, Forms, Chat
5. Verify the full set under **APIs & Services > Enabled APIs & services**
   (<https://console.cloud.google.com/apis/dashboard>).

### gcloud (scriptable; see the agent appendix)

```sh
gcloud config set project <PROJECT_ID>
gcloud services enable \
  gmail.googleapis.com \
  drive.googleapis.com \
  sheets.googleapis.com \
  docs.googleapis.com \
  calendar-json.googleapis.com \
  meet.googleapis.com
# verify:
gcloud services list --enabled
```

Service identifiers are not always the obvious name (Calendar is
`calendar-json.googleapis.com`, not `calendar.googleapis.com`). Confirm any name
with `gcloud services list --available | grep -i <word>` before relying on it.

---

## Phase 3: create the OAuth client (one time)

1. **APIs & Services > Credentials** (new: *Google Auth Platform > Clients*),
   <https://console.cloud.google.com/auth/clients>.
2. **Create credentials > OAuth client ID**.
3. Application type: **Desktop app**. Name it anything (e.g. `google-mcp`).
4. **Create**, then **Download JSON**.
5. Save it to the canonical config dir, outside the repo:

   ```sh
   mkdir -p ~/.google-mcp
   mv ~/Downloads/client_secret_*.json ~/.google-mcp/client_secret.json
   chmod 600 ~/.google-mcp/client_secret.json
   ```

   Either the `installed` or `web` JSON shape is accepted. All accounts share this
   one client.

> There is **no public API** to create a Desktop OAuth client or download its
> secret; this step is manual by design (see the agent appendix).

---

## Phase 4: configure the consent screen

If this is a brand-new project you will first be prompted to configure the consent
screen (set **User type: External**, app name, support email, developer email).
Then:

### Declare the scopes

1. **Google Auth Platform > Data access** (old: *OAuth consent screen*, the
   **Scopes** step), <https://console.cloud.google.com/auth/scopes>.
2. Click **Add or remove scopes**. This opens a side panel with a 100+ row table
   and, at the bottom, a **"Manually add scopes"** text box.
3. In the **manual box** (the table is huge and easy to mis-click; many scopes
   look almost identical), paste the **exact** contents of `SCOPES` from
   [`src/auth/config.ts`](https://github.com/simiancraft/google-mcp-suite/blob/main/src/auth/config.ts), one per line. As of this writing:

   ```
   https://mail.google.com/
   https://www.googleapis.com/auth/gmail.settings.basic
   https://www.googleapis.com/auth/drive
   https://www.googleapis.com/auth/spreadsheets
   https://www.googleapis.com/auth/documents
   https://www.googleapis.com/auth/calendar
   https://www.googleapis.com/auth/meetings.space.created
   https://www.googleapis.com/auth/meetings.space.readonly
   https://www.googleapis.com/auth/meetings.space.settings
   ```

4. Click **Add to table**, then **Update** (this closes the panel and stages your
   selection).

> **You are not done. Click Save.** The Data access page does **not** save like a
> normal web form. **Update** only stages the selection back onto the page; the
> page then shows your scopes sorted into Non-sensitive / Sensitive / Restricted,
> and you must click the **Save** button on that page as a **separate second
> step** to commit. Navigate away before clicking Save and your scopes are lost
> with no warning. After saving, expect `mail.google.com` and `drive` under
> **Restricted**, `meetings.space.settings` under **Non-sensitive**, and the rest
> under **Sensitive**.

**Watch two traps while picking:**
- `https://mail.google.com/` has no `googleapis.com/auth` prefix and breaks the
  pattern, so it is the easy one to miss. It is the full-mailbox scope ("Read,
  compose, send, and permanently delete all your email"); do not settle for
  `gmail.modify`, which cannot permanently delete.
- Full `.../auth/drive` already subsumes every narrower Drive scope
  (`drive.file`, `drive.readonly`, `drive.metadata*`, `drive.meet.readonly`) and
  the separate **Drive Labels** scopes (`drive.labels*`, `drive.admin.labels*`).
  If the table tacks any of those on, remove them; keep only the single
  `.../auth/drive`. Extra restricted scopes are inert in Testing but enlarge the
  verification surface if you ever publish.

The list in code is the source of truth. When you change `SCOPES`, mirror it here
(Add or remove scopes, Update, **Save**) and re-authorize every account (Phase 5).

### Add test users, and stay in Testing

1. **Google Auth Platform > Audience** (old: *OAuth consent screen > Test users*),
   <https://console.cloud.google.com/auth/audience>.
2. Keep **Publishing status: Testing**.
3. Under **Test users**, add every account you will authorize (e.g.
   `info@simiancraft.com`). Restricted scopes only consent for a listed test user
   while in Testing.

> **Do not click "Publish app."** Restricted and sensitive scopes trigger Google's
> verification process (security assessment, and for restricted scopes a possible
> paid third-party audit) **only when published to production**. In Testing, with
> yourself as a test user, you get the full grant immediately. The cost is a
> "Google hasn't verified this app" interstitial during consent: click
> **Advanced**, then **Go to (app) (unsafe)**, and proceed. That is expected for a
> personal/dev app. The other cost of Testing: **refresh tokens expire 7 days after
> issuance**, so each account needs weekly re-consent (the agent runs
> `google-mcp-doctor auth`; `doctor status` shows the countdown).

---

## Phase 5: authorize an account (per account)

Build once, then have the agent run the `auth` subcommand for each account.
The flow forces offline access and consent, so a refresh token is always written.

```sh
# authorize an account (opens a browser; writes ~/.google-mcp/tokens/<account>.json, 0600)
google-mcp-doctor auth you@example.com

# or, from a source checkout:
bun install && bun run build
GOOGLE_MCP_ACCOUNT=<account> node ./dist/gmail/index.js auth
```

- The account label becomes the token filename. Use the same label in the MCP
  registration (Phase 6).
- On WSL2 the browser may not auto-open; the URL is printed to stderr. Copy it
  into your browser. The callback uses `http://127.0.0.1:<port>/oauth2callback`,
  preferring port 3000 and choosing a free port if it is busy. An explicit
  `google-mcp-doctor auth --port <n>` fails if that port is busy.
- Verify the granted scope:

  ```sh
  python3 -c "import json;print(json.load(open('$HOME/.google-mcp/tokens/<account>.json'))['scope'])"
  ```

  It must contain every scope from `SCOPES`. If it is missing one, the consent
  screen is missing that scope (Phase 4) or the account re-used an old grant; add
  the scope, then re-run `auth`.

### Config directory and overrides

Default layout (all overridable by env, read lazily):

```
~/.google-mcp/
  client_secret.json        # the shared OAuth client (Phase 3)
  tokens/<account>.json     # per-account token, 0600 inside a 0700 dir
```

| Variable | Meaning | Default |
|---|---|---|
| `GOOGLE_MCP_ACCOUNT` | which account this instance acts as | required |
| `GOOGLE_MCP_DIR` | the config directory | `~/.google-mcp` |
| `GOOGLE_MCP_CLIENT_SECRET` | path to the client secret JSON | `<dir>/client_secret.json` |
| `GOOGLE_MCP_TOKEN` | a specific token file (single-account override) | `<dir>/tokens/<account>.json` |

---

## Phase 6: register the MCP server

One server instance per account, each pinned via `GOOGLE_MCP_ACCOUNT`. The
value must be a label Phase 5 actually created: a bare email, or a roster
alias like `work` ([ADOPTING.md](./ADOPTING.md) step 3 writes the roster).
Example entries for an MCP host config (e.g. `~/.claude.json` `mcpServers`):

```jsonc
{
  "gmail-work": {
    "type": "stdio",
    "command": "google-mcp-gmail",
    "env": { "GOOGLE_MCP_ACCOUNT": "work" }
  },
  // or, from a source checkout:
  "gmail-from-source": {
    "type": "stdio",
    "command": "node",
    "args": ["<abs-path-to-repo>/dist/gmail/index.js"],
    "env": { "GOOGLE_MCP_ACCOUNT": "work" }
  }
}
```

With the canonical config dir in place, `GOOGLE_MCP_ACCOUNT` is the only env var
needed; the client secret and token resolve from `~/.google-mcp/`. Set
`GOOGLE_MCP_CLIENT_SECRET` / `GOOGLE_MCP_TOKEN` only to point at a non-canonical
location. Restart the host (or reconnect the server) after editing.

---

## Appendix A: adding a new service's scopes

1. Enable its API (Phase 2).
2. Add its scope(s) to `SCOPES` in [`src/auth/config.ts`](https://github.com/simiancraft/google-mcp-suite/blob/main/src/auth/config.ts).
3. Add the same scope strings on the consent screen (Phase 4).
4. Re-run `auth` for every account (Phase 5); a new scope is only granted on a
   fresh consent.

Candidate scopes for planned/likely services (not all are in `SCOPES` yet; check
the file for the authoritative list):

| Service | API id (verify with gcloud) | Representative scope(s) |
|---|---|---|
| Gmail | `gmail.googleapis.com` | `https://mail.google.com/`, `.../auth/gmail.settings.basic` |
| Drive | `drive.googleapis.com` | `.../auth/drive` |
| Sheets | `sheets.googleapis.com` | `.../auth/spreadsheets` |
| Docs | `docs.googleapis.com` | `.../auth/documents` |
| Calendar | `calendar-json.googleapis.com` | `.../auth/calendar` |
| Meet (REST) | `meet.googleapis.com` | `.../auth/meetings.space.created`, `.../auth/meetings.space.readonly`, `.../auth/meetings.space.settings` |
| Tasks | `tasks.googleapis.com` | `.../auth/tasks` |
| Slides | `slides.googleapis.com` | `.../auth/presentations` |
| People | `people.googleapis.com` | `.../auth/contacts` |
| Drive Activity | `driveactivity.googleapis.com` | `.../auth/drive.activity.readonly` |
| Forms | `forms.googleapis.com` | `.../auth/forms.body`, `.../auth/forms.responses.readonly` |
| Chat | `chat.googleapis.com` | `.../auth/chat.messages`, `.../auth/chat.spaces` |

`.../auth/` is shorthand for `https://www.googleapis.com/auth/`.

---

## Appendix B: can an agent do this?

Partly. The split is sharp, and it is worth knowing where the human is mandatory.

**An agent CAN automate (via `gcloud` / Google Cloud APIs):**

- Create the project: `gcloud projects create <id>`.
- Enable APIs: `gcloud services enable ...` (the **Service Usage API**).
- Audit state: `gcloud services list --enabled`, list credentials, etc.

Requirements: `gcloud` installed, an authenticated principal, and (for enabling)
the `roles/serviceusage.serviceUsageAdmin` role plus the **Service Usage** and
**Cloud Resource Manager** APIs enabled. Authenticate either as the human
(`gcloud auth login`, interactive, one time) or as a service account with a key
(`gcloud auth activate-service-account --key-file=...`). Once authenticated, an
agent with shell access (e.g. a coding agent's Bash tool) can run the enable
commands directly. Note: `gcloud` is **not** installed in this repo's environment
by default; install the Google Cloud SDK first.

**An agent CANNOT automate (no stable public API; manual in the console):**

- Creating a **Desktop OAuth client** and downloading its `client_secret.json`.
  (The IAP brands API only covers an OAuth brand and IAP/web client types, not
  Desktop clients.)
- **Declaring scopes** on the consent screen (no public API to add
  sensitive/restricted scopes).
- Managing **test users** and **publishing status**.
- The **browser consent** itself (Phase 5): interactive and human-in-the-loop by
  design; the whole point is a human granting access.

**Realistic division of labor:** let an agent create the project and enable the
APIs (the tedious, scriptable part), then a human does the consent-screen and
client steps once in the console, runs `auth` per account in a browser, and hands
back. The repo already scripts the token mint (the `auth` subcommand); only the
browser click is human.
