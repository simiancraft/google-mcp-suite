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

## Methods: REST reference (`methods/`, 23)

Operations beyond the MCP toolset, sourced from the REST reference.

| Resource | Implemented |
|----------|-------------|
| messages | `get_message`, `list_messages`, `send_message` ⚠️, `trash_message` ⚠️, `untrash_message`, `delete_message` ⚠️, `download_attachment`, `batch_modify_messages` ⚠️, `batch_delete_messages` ⚠️ |
| drafts | `get_draft`, `update_draft`, `delete_draft` ⚠️, `send_draft` ⚠️ |
| labels | `get_label`, `update_label`, `delete_label` ⚠️ |
| threads | `trash_thread` ⚠️, `untrash_thread`, `delete_thread` ⚠️ |
| filters | `create_filter` ⚠️, `get_filter`, `list_filters`, `delete_filter` ⚠️ |

⚠️ = destructive (`destructiveHint`): a removal (delete, trash, unlabel), a
send, or a standing side effect like a forwarding filter; updates and additive
modifications are not destructive (see EXTENDING.md's annotation rubric).
Permanent deletes also require the `https://mail.google.com/` scope. The sends
are additionally the only open-world operations (`openWorldHint`): they reach
arbitrary external recipients.

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
takes attachments inside RFC 822 media, so the server reads each local path
and assembles the MIME message itself (issue #101). Attachments are delivered
as downloads, not inline images. All compose calls upload `message/rfc822`
media alongside JSON metadata, without outer base64url encoding. The complete
MIME-encoded message, including headers, bodies, and attachments, is capped at
36,700,160 bytes (35 MiB). Attachment base64 encoding and line folding count
against this limit; decoded attachment size alone does not determine whether
a message fits. Oversize messages fail locally with the measured size and limit.

Issue #103 is addressed by media upload and encoded-size validation. Google's
[discovery document](https://gmail.googleapis.com/$discovery/rest?version=v1)
publishes the same maximum for simple and resumable uploads; resumable upload
would improve interruption recovery, but would not allow larger messages.

## Deferred

Tracked as issues, not missing by accident:

- **Account settings** (vacation, auto-forwarding, IMAP/POP, language): issue #4.
- **Niche / specialized** (history, S/MIME, CSE, message insert/import): issue #5.
- **Identity and access** (send-as aliases, forwarding addresses, delegates;
  security-sensitive): issue #6.
