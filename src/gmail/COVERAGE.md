# Gmail tool coverage

Tracks what this server exposes against Google's surface, so gaps are visible.
Two reference surfaces: the **MCP toolset** (Google's curated tool list) and the
**discovery document** (every REST method).

- MCP reference: `https://developers.google.com/workspace/gmail/api/reference/mcp`
- Discovery: `https://gmail.googleapis.com/$discovery/rest?version=v1`

## Tools: the MCP toolset (`tools/`, 10 of 10)

Every tool on the MCP reference is implemented (`tools/`). Each `schema.ts` cites
its page.

`search_threads`, `get_thread`, `list_drafts`, `create_draft`, `list_labels`,
`create_label`, `label_message`, `label_thread`, `unlabel_message` ⚠️,
`unlabel_thread` ⚠️.

Each tool also transcribes the Tool Annotations published on its MCP page,
with one corrected deviation: `list_drafts`' page marks all four hints false
(not even read-only), contradicting its sibling lists (`list_labels`,
`search_threads`); a list cannot modify the account, so it is annotated
read-only here.

## Methods: REST reference (`methods/`, 38)

Operations beyond the MCP toolset, sourced from the REST reference.

| Resource | Implemented |
|----------|-------------|
| messages | `get_message`, `list_messages`, `send_message` ⚠️, `trash_message` ⚠️, `untrash_message`, `delete_message` ⚠️, `download_attachment`, `batch_modify_messages` ⚠️, `batch_delete_messages` ⚠️ |
| drafts | `get_draft`, `update_draft`, `delete_draft` ⚠️, `send_draft` ⚠️ |
| labels | `get_label`, `update_label`, `delete_label` ⚠️ |
| threads | `trash_thread` ⚠️, `untrash_thread`, `delete_thread` ⚠️ |
| settings | `get_vacation`, `update_vacation` ⚠️, `get_auto_forwarding`, `get_imap`, `update_imap`, `get_pop`, `update_pop`, `get_language`, `update_language` |
| sendAs | `get_send_as`, `list_send_as`, `update_send_as`, `patch_send_as` |
| forwardingAddresses | `get_forwarding_address`, `list_forwarding_addresses` |
| filters | `create_filter` ⚠️, `get_filter`, `list_filters`, `delete_filter` ⚠️ |

⚠️ = destructive (`destructiveHint`): a removal (delete, trash, unlabel), a
send, or a standing side effect like a forwarding filter or vacation responder.
Other settings updates and additive modifications are not destructive (see
EXTENDING.md's annotation rubric). Permanent deletes also require the
`https://mail.google.com/` scope. Sends and `update_vacation` are open-world
(`openWorldHint`): they can reach arbitrary external recipients.

All nine account-settings methods accept the existing `gmail.settings.basic`
scope, as listed in each method's Authorization scopes section (linked from
CAPABILITIES.md). No scope expansion is needed. Unspecified enum sentinels are
not exposed; unknown output enum values are dropped under the suite policy.
The update methods are PUTs and the reference pages do not say what happens to
omitted fields. Observed live on 2026-09-19: `update_vacation` sent with only
`enableAutoReply` reset the stored subject and body, so the updates are
described as full replacements. The five reads and the vacation round trip are
live-verified; `update_imap`, `update_pop`, and `update_language` are covered
by stub-client unit tests only.

The four settings update pages specify HTTP PUT with the corresponding settings
resource as the request body; neither those pages nor their resource pages
specify what happens to omitted fields. Treat these calls as full replacements
for safety: read the current settings first and send every field to keep. This
is a conservative calling convention, not a documented claim that omitted
fields are reset. Each operation links its update reference in CAPABILITIES.md;
those pages link the corresponding resource definitions.

The six identity and access methods (issue #6) accept the existing
`gmail.settings.basic` scope; no scopes were added. Send-as reads include the
primary address and custom aliases. User-OAuth updates support only the primary
address: `displayName`, `replyToAddress`, HTML `signature`, and `isDefault` (only
`true` is writable). `sendAsEmail`, `isPrimary`, and `verificationStatus` are
read-only on updates; `smtpMsa` and `treatAsAlias` apply only to custom aliases
and are excluded from inputs. The output SMTP projection omits both write-only
credentials, `username` and `password`. Unknown output enums are dropped, and
unspecified enum sentinels are not exposed.

The [update reference](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.sendAs/update)
uses PUT and limits non-primary updates to delegated service accounts. The
[patch reference](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.sendAs/patch)
uses PATCH but does not repeat that restriction; the suite applies the same
primary-only input policy to both. Treat PUT as full replacement of writable
settings: read first and send every writable field to keep. The page does not
specify omitted-field behavior, so this is a conservative calling convention;
PATCH is the partial-change operation. Administrator policy can silently prevent
primary display-name changes. Signatures apply to new mail composed in the Gmail
web UI, not messages assembled by this server.

Forwarding reads expose destinations and verification without enabling mail
forwarding or sending email. All six methods have stub-client tests and were run
live on 2026-09-19 against a primary address, the writes with unchanged values.
No custom alias was available, so the refusal of a non-primary update under
user OAuth is documented by Google and not observed here.

### Extension beyond the documented projection

The `Message` and `Draft` shapes carry **both** `plaintextBody` and `htmlBody`
(Google's MCP projection documents only `plaintextBody`). Both are extracted from
the MIME tree.

`sender` and the `to`/`cc`/`bcc` recipient fields are structured `EmailAddress`
objects (`{ name?, address }`), not bare strings, so callers can act on the
display name rather than infer it from the address. Address headers are parsed
with `addressparser` (RFC 5322: quoted names, escaped commas, groups).

The address shape is asymmetric by direction: compose **inputs** (`to`/`cc`/`bcc`
on send/draft tools) are plain address strings handed to the MIME builder, while
projected **outputs** (`toRecipients`/`ccRecipients`/`bccRecipients`, `sender`)
are structured `EmailAddress`. Inbound parsing and outbound assembly are
different operations and intentionally do not share a type.

The compose operations (`create_draft`, `update_draft`, `send_message`) accept
an optional `attachments` array (`AttachmentFile`: `path`, `filename?`,
`mimeType?`), a suite-native input with no Google-page counterpart: the API
takes attachments only inside the documented `raw` RFC 822 field, so the server
reads each local path and assembles the MIME message itself (issue #101).
Attachments are delivered as downloads, not inline images. The combined decoded
payload is capped at the suite's shared 25 MiB transfer ceiling; that bounds
what the server buffers, not what Gmail accepts (base64 inflation means sends
near the cap can still be refused upstream).

## Never offered under user OAuth

These existing operations require delegated service accounts; the suite uses user
OAuth and does not request `gmail.settings.sharing`. Delegate reads list accepted
user scopes but still explicitly require service account clients in their
descriptions. The table lists every accepted scope, not just the sharing scope.

| Operation | Required scope | Google's sentence | Reference |
|-----------|----------------|-------------------|-----------|
| `update_auto_forwarding` | `https://www.googleapis.com/auth/gmail.settings.sharing` | "This method is only available to service account clients that have been delegated domain-wide authority." | [settings.updateAutoForwarding](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings/updateAutoForwarding) |
| `sendAs.create` | `https://www.googleapis.com/auth/gmail.settings.sharing` | "This method is only available to service account clients that have been delegated domain-wide authority." | [sendAs.create](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.sendAs/create) |
| `sendAs.delete` | `https://www.googleapis.com/auth/gmail.settings.sharing` | "This method is only available to service account clients that have been delegated domain-wide authority." | [sendAs.delete](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.sendAs/delete) |
| `sendAs.verify` | `https://www.googleapis.com/auth/gmail.settings.sharing` | "This method is only available to service account clients that have been delegated domain-wide authority." | [sendAs.verify](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.sendAs/verify) |
| `forwardingAddresses.create` | `https://www.googleapis.com/auth/gmail.settings.sharing` | "This method is only available to service account clients that have been delegated domain-wide authority." | [forwardingAddresses.create](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.forwardingAddresses/create) |
| `forwardingAddresses.delete` | `https://www.googleapis.com/auth/gmail.settings.sharing` | "This method is only available to service account clients that have been delegated domain-wide authority." | [forwardingAddresses.delete](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.forwardingAddresses/delete) |
| `delegates.create` | `https://www.googleapis.com/auth/gmail.settings.sharing` | "This method is only available to service account clients that have been delegated domain-wide authority." | [delegates.create](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.delegates/create) |
| `delegates.get` | `https://www.googleapis.com/auth/gmail.settings.basic`, `https://mail.google.com/`, `https://www.googleapis.com/auth/gmail.modify`, or `https://www.googleapis.com/auth/gmail.readonly` | "This method is only available to service account clients that have been delegated domain-wide authority." | [delegates.get](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.delegates/get) |
| `delegates.list` | `https://www.googleapis.com/auth/gmail.settings.basic`, `https://mail.google.com/`, `https://www.googleapis.com/auth/gmail.modify`, or `https://www.googleapis.com/auth/gmail.readonly` | "This method is only available to service account clients that have been delegated domain-wide authority." | [delegates.list](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.delegates/list) |
| `delegates.delete` | `https://www.googleapis.com/auth/gmail.settings.sharing` | "This method is only available to service account clients that have been delegated domain-wide authority." | [delegates.delete](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.delegates/delete) |
| `forwardingAddresses.verify` | None; no REST method exists | No method description exists; the resource lists only create, delete, get, and list. | [forwardingAddresses](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.forwardingAddresses) |

`sendAs.verify` would send email to the alias owner and require destructive,
non-idempotent, and open-world annotations; `sendAs.delete` would be destructive.
Neither is shipped because both require delegated service accounts. The issue's
`forwardingAddresses.verify` candidate has no REST reference page (404), and the
resource's Methods section has no verify entry.

## Deferred

Tracked as issues, not missing by accident:

- **Niche / specialized** (history, S/MIME, CSE, message insert/import): issue #5.
- **Attachments past the compose cap** (base64 inflation band, resumable
  `/upload` endpoint): issue #103.
