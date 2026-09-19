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

## Methods: REST reference (`methods/`, 58)

Operations beyond the MCP toolset, sourced from the REST reference.

| Resource | Implemented |
|----------|-------------|
| messages | `get_message`, `list_messages`, `insert_message`, `import_message`, `send_message` ⚠️, `trash_message` ⚠️, `untrash_message`, `delete_message` ⚠️, `download_attachment`, `batch_modify_messages` ⚠️, `batch_delete_messages` ⚠️ |
| users | `get_profile` |
| history | `list_history` |
| sendAs.smimeInfo | `get_smime_info`, `list_smime_info`, `insert_smime_info`, `set_default_smime_info`, `delete_smime_info` ⚠️ |
| cse.identities | `create_cse_identity`, `get_cse_identity`, `list_cse_identities`, `patch_cse_identity`, `delete_cse_identity` ⚠️ |
| cse.keypairs | `create_cse_keypair`, `get_cse_keypair`, `list_cse_keypairs`, `enable_cse_keypair`, `disable_cse_keypair` ⚠️, `obliterate_cse_keypair` ⚠️ |
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

The twenty specialized methods (issue #5) accept already-held scopes; no
scope was added. The live reference audit below was fetched on 2026-09-19.
All candidates pass the user-OAuth rule, so none is added to the never-offered
table. The CSE descriptions distinguish administrators impersonating other
users from users managing their own configuration; only the former require a
delegated service account. Run live on 2026-09-19 against self-made messages
that were deleted afterward: `get_profile`, `insert_message`, `import_message`,
and `list_history` (which reported both new messages from the profile's
`historyId`). On an account without the features, the S/MIME reads answer HTTP
403 "Feature not enabled" and the CSE reads HTTP 403 "CSE is not enabled."; the
sixteen S/MIME and CSE methods therefore have stub-client unit coverage only.

History returns one page, its continuation token, and a mailbox checkpoint.
`maxResults` follows the REST range (default 100, maximum 500); no messages are
hydrated. Specific change arrays retain message IDs, thread IDs, and returned
label IDs. Save the checkpoint only after consuming every page. A starting ID
comes from a projected message, thread, or `get_profile` ([profile](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users/getProfile)),
or previous history response. An expired or invalid ID returns HTTP 404 and
requires a full resync. `get_profile` fetches a fresh profile on every call;
only the compose sender address is cached by the shared profile helper.

Insert and import use the JSON `raw` field for a whole base64url RFC 822 message,
with labels and documented query parameters. The compose builder is not used.
The shared 25 MiB ceiling applies to decoded bytes, not the encoded string;
this is a server transfer ceiling, not a promise of Gmail acceptance. Insert
bypasses most scanning; import uses delivery classification without SPF checks
and can extract Calendar meetings. Neither sends mail. Both are additive,
non-idempotent, and closed-world: even `deleted` applies only to the new message,
placing it in Workspace Vault rather than deleting existing mailbox data.

S/MIME outputs contain public certificates only, omitting `pkcs12` and
`encryptedKeyPassword`. The resource calls pkcs12 base64-encoded; the
[S/MIME guide](https://developers.google.com/workspace/gmail/api/guides/smime_certs)
specifically demonstrates Base64URL encoding, which the input follows. The guide
states: "gmail.settings.basic: Required to update the primary SendAs S/MIME."
It also states: "gmail.settings.sharing: Required to update the custom from S/MIME."
Accordingly, writes are documented for the primary address only. Deleting a
certificate prevents decrypting mail encrypted to that key; revoke it with its
issuer first. Choosing a default clears the previous default.

CSE input key configurations and private metadata variants are mutually exclusive;
output-only IDs and input-only pkcs7 are separated. Projections retain only
documented output metadata, including potentially sensitive `kaclsData`, and
drop nulls and unknown enum states. Disabling a key removes decryption and
signing access, so it is destructive but reversible with enable. Obliteration
requires more than 30 disabled days and cannot be undone. Identity deletion
cannot be restored; a new identity can reuse its configuration.

### Specialized method prerequisites

The [hosted S/MIME setup](https://knowledge.workspace.google.com/admin/gmail/advanced/turn-on-hosted-s-mime-for-message-encryption)
lists: "Supported editions for this feature: Frontline Plus; Enterprise Plus;
Education Fundamentals, Education Standard, and Education Plus."
The [S/MIME guide](https://developers.google.com/workspace/gmail/api/guides/smime_certs)
states: "An administrator must turn on hosted S/MIME for the domain for the certificates to work."

The [CSE setup overview](https://support.google.com/a/answer/14309952?hl=en)
lists: "Supported editions for this feature: Frontline Plus; Enterprise Plus;
Education Standard and Education Plus." It requires super administrator
privileges to manage CSE, including turning it on for users. The
[hardware key setup](https://support.google.com/a/answer/14153163) states:
"Requires having the Assured Controls or Assured Controls Plus add-on."
Hardware setup requires Windows 10 or later, a smart card reader, a smart card
with a private encryption key, the Hardware Key application, admin enablement,
and assignment to users. These prerequisites are setup requirements, not a
service-account-only restriction on the user's own CSE method calls.

### Specialized method OAuth audit

All scope abbreviations below expand to `https://www.googleapis.com/auth/gmail.`
plus the listed suffix; **mail** means `https://mail.google.com/`. Every accepted
scope from each page is listed, including scopes the suite does not request.
The quoted CSE sentence explicitly permits the user's own management path.
For other methods, the operation description and accepted scope together decide
eligibility; the description has no administrator-only or service-account-only
restriction.

| Candidate | Verdict | Accepted scopes | Google description sentence |
|-----------|---------|-----------------|-----------------------------|
| [`getProfile`](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users/getProfile) | Shipped | `mail`, `modify`, `compose`, `readonly`, `metadata` | "Gets the current user's Gmail profile." |
| [`history.list`](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.history/list) | Shipped | `mail`, `modify`, `readonly`, `metadata` | "Lists the history of all changes to the given mailbox." |
| [`settings.sendAs.smimeInfo.get`](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.sendAs.smimeInfo/get) | Shipped | `settings.basic`, `mail`, `modify`, `readonly`, `settings.sharing` | "Gets the specified S/MIME config for the specified send-as alias." |
| [`settings.sendAs.smimeInfo.list`](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.sendAs.smimeInfo/list) | Shipped | `settings.basic`, `mail`, `modify`, `readonly`, `settings.sharing` | "Lists S/MIME configs for the specified send-as alias." |
| [`settings.sendAs.smimeInfo.insert`](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.sendAs.smimeInfo/insert) | Shipped | `settings.basic`, `settings.sharing` | "Insert (upload) the given S/MIME config for the specified send-as alias." |
| [`settings.sendAs.smimeInfo.setDefault`](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.sendAs.smimeInfo/setDefault) | Shipped | `settings.basic`, `settings.sharing` | "Sets the default S/MIME config for the specified send-as alias." |
| [`settings.sendAs.smimeInfo.delete`](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.sendAs.smimeInfo/delete) | Shipped | `settings.basic`, `settings.sharing` | "Deletes the specified S/MIME config for the specified send-as alias." |
| [`settings.cse.identities.create`](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.cse.identities/create) | Shipped | `settings.basic`, `settings.sharing` | "For users managing their own identities and keypairs, requests require hardware key encryption turned on and configured." |
| [`settings.cse.identities.get`](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.cse.identities/get) | Shipped | `settings.basic`, `mail`, `modify`, `readonly`, `settings.sharing` | "For users managing their own identities and keypairs, requests require hardware key encryption turned on and configured." |
| [`settings.cse.identities.list`](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.cse.identities/list) | Shipped | `settings.basic`, `mail`, `modify`, `readonly`, `settings.sharing` | "For users managing their own identities and keypairs, requests require hardware key encryption turned on and configured." |
| [`settings.cse.identities.patch`](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.cse.identities/patch) | Shipped | `settings.basic`, `settings.sharing` | "For users managing their own identities and keypairs, requests require hardware key encryption turned on and configured." |
| [`settings.cse.identities.delete`](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.cse.identities/delete) | Shipped | `settings.basic`, `settings.sharing` | "For users managing their own identities and keypairs, requests require hardware key encryption turned on and configured." |
| [`settings.cse.keypairs.create`](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.cse.keypairs/create) | Shipped | `settings.basic`, `settings.sharing` | "For users managing their own identities and keypairs, requests require hardware key encryption turned on and configured." |
| [`settings.cse.keypairs.get`](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.cse.keypairs/get) | Shipped | `settings.basic`, `mail`, `modify`, `readonly`, `settings.sharing` | "For users managing their own identities and keypairs, requests require hardware key encryption turned on and configured." |
| [`settings.cse.keypairs.list`](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.cse.keypairs/list) | Shipped | `settings.basic`, `mail`, `modify`, `readonly`, `settings.sharing` | "For users managing their own identities and keypairs, requests require hardware key encryption turned on and configured." |
| [`settings.cse.keypairs.enable`](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.cse.keypairs/enable) | Shipped | `settings.basic`, `settings.sharing` | "For users managing their own identities and keypairs, requests require hardware key encryption turned on and configured." |
| [`settings.cse.keypairs.disable`](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.cse.keypairs/disable) | Shipped | `settings.basic`, `settings.sharing` | "For users managing their own identities and keypairs, requests require hardware key encryption turned on and configured." |
| [`settings.cse.keypairs.obliterate`](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.cse.keypairs/obliterate) | Shipped | `settings.basic`, `settings.sharing` | "For users managing their own identities and keypairs, requests require hardware key encryption turned on and configured." |
| [`messages.insert`](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/insert) | Shipped | `mail`, `modify`, `insert` | "Directly inserts a message into only this user's mailbox similar to IMAP APPEND , bypassing most scanning and classification." |
| [`messages.import`](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/import) | Shipped | `mail`, `modify`, `insert` | "Imports a message into only this user's mailbox, with standard email delivery scanning and classification similar to receiving via SMTP." |

### Extension beyond the documented projection

`Message` and `Thread` expose optional REST `historyId` fields because these
are the documented bootstrap for `history.list`. Missing or null values are
omitted. `get_profile` also exposes the current mailbox checkpoint, alongside
the email address and message and thread counts. Its shared `fetchProfile`
helper is uncached so checkpoints remain fresh; `senderAddress` retains only
its existing per-client cache of the stable email address.

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

- **Attachments past the compose cap** (base64 inflation band, resumable
  `/upload` endpoint): issue #103.
