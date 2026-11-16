import type { gmail_v1 } from '@googleapis/gmail';
import addressparser from 'addressparser';
import { createMimeMessage } from 'mail-mime-builder';
import type { Optional } from '../../lib/optionality.js';
import type { Draft } from '../entities/Draft.js';
import type { EmailAddress } from '../entities/EmailAddress.js';
import type { Message } from '../entities/Message.js';
import type { MimeAttachment } from './attachment.js';
import { headerParamSafe, stripBreaks } from './headers.js';

/**
 * Lowercased header name -> value, from a message payload. Null-prototype: a
 * sender controls header names, and `__proto__` must land as plain data, not a
 * prototype write.
 */
function headerMap(payload?: gmail_v1.Schema$MessagePart): Record<string, string> {
  const map: Record<string, string> = Object.create(null);
  for (const header of payload?.headers ?? []) {
    if (header.name && header.value) {
      map[header.name.toLowerCase()] = header.value;
    }
  }
  return map;
}

// addressparser's address node: `name` is always a string ('' when absent), and
// a node may instead be a `group` of members. Distinct from our entity
// EmailAddress (../entities/EmailAddress), whose `name` is optional.
type ParsedAddress = ReturnType<typeof addressparser>[number];

// Bounds against hostile inbound mail; a sender controls header text and MIME
// structure. Best-effort: cap the work and project what fits rather than block
// the server (addressparser is O(n^2) in entry count) or overflow the stack on a
// deeply nested tree. A header longer than this, or nesting deeper, is not
// legitimate mail to act on. (A deep RFC 5322 group can still overflow inside
// addressparser before we see it; that surfaces as a server-caught per-call
// error, not a crash.)
const MAX_HEADER_LENGTH = 100_000;
const MAX_DEPTH = 100;

/**
 * Parse an address-list header into structured addresses (display name + bare
 * address). RFC 5322 tokenization (quoted display names, escaped commas, group
 * syntax) is deferred to addressparser; a naive `.split(',')` mis-parses
 * `"Doe, John" <j@x.com>` into two broken tokens. Group syntax is flattened to
 * its member addresses; a name is included only when the header carried one.
 */
function addresses(value?: string): EmailAddress[] {
  if (!value) {
    return [];
  }
  const bounded = value.length > MAX_HEADER_LENGTH ? value.slice(0, MAX_HEADER_LENGTH) : value;
  const out: EmailAddress[] = [];
  const collect = (entries: ParsedAddress[], depth: number): void => {
    if (depth > MAX_DEPTH) {
      return;
    }
    for (const entry of entries) {
      if (entry.group) {
        collect(entry.group, depth + 1);
      } else if (entry.address) {
        // addressparser yields name:'' (not undefined) for nameless addresses; ''
        // is falsy, so we omit the key and keep the projected object clean.
        out.push(
          entry.name ? { name: entry.name, address: entry.address } : { address: entry.address },
        );
      }
    }
  };
  collect(addressparser(bounded), 0);
  return out;
}

/** The first address parsed from a header (e.g. the sender from `From`), or undefined. */
function firstAddress(value?: string): EmailAddress | undefined {
  return addresses(value)[0];
}

function decodeBody(data?: string | null): string {
  return data ? Buffer.from(data, 'base64url').toString('utf8') : '';
}

type Bodies = { plain?: string; html?: string };

/**
 * Walk the MIME tree collecting the first text/plain and first text/html parts.
 * Both are surfaced (an intentional extension beyond Google's plaintext-only
 * projection): callers need plain and HTML bodies extracted reliably.
 */
function collectBodies(
  part: gmail_v1.Schema$MessagePart | undefined,
  acc: Bodies,
  depth = 0,
): void {
  if (!part || depth > MAX_DEPTH) {
    return;
  }
  if (part.body?.data) {
    if (part.mimeType === 'text/plain' && acc.plain === undefined) {
      acc.plain = decodeBody(part.body.data);
    } else if (part.mimeType === 'text/html' && acc.html === undefined) {
      acc.html = decodeBody(part.body.data);
    }
  }
  for (const child of part.parts ?? []) {
    collectBodies(child, acc, depth + 1);
  }
}

/** Walk the MIME tree collecting attachment ids. */
function collectAttachmentIds(
  part: gmail_v1.Schema$MessagePart | undefined,
  ids: string[],
  depth = 0,
): void {
  if (!part || depth > MAX_DEPTH) {
    return;
  }
  if (part.body?.attachmentId) {
    ids.push(part.body.attachmentId);
  }
  for (const child of part.parts ?? []) {
    collectAttachmentIds(child, ids, depth + 1);
  }
}

/** Project a raw Gmail message onto the documented Message shape. */
export function projectMessage(message: gmail_v1.Schema$Message): Message {
  const headers = headerMap(message.payload);
  const attachmentIds: string[] = [];
  collectAttachmentIds(message.payload, attachmentIds);
  const bodies: Bodies = {};
  collectBodies(message.payload, bodies);
  return {
    id: message.id ?? '',
    historyId: message.historyId ?? undefined,
    snippet: message.snippet ?? undefined,
    subject: headers['subject'],
    sender: firstAddress(headers['from']),
    toRecipients: addresses(headers['to']),
    ccRecipients: addresses(headers['cc']),
    date: headers['date'],
    plaintextBody: bodies.plain || undefined,
    htmlBody: bodies.html || undefined,
    attachmentIds: attachmentIds.length ? attachmentIds : undefined,
  };
}

/** Project a raw Gmail draft onto the documented Draft shape. */
export function projectDraft(draft: gmail_v1.Schema$Draft): Draft {
  const message = draft.message;
  const headers = headerMap(message?.payload);
  const bodies: Bodies = {};
  collectBodies(message?.payload, bodies);
  return {
    id: draft.id ?? '',
    threadId: message?.threadId ?? undefined,
    subject: headers['subject'],
    toRecipients: addresses(headers['to']),
    ccRecipients: addresses(headers['cc']),
    bccRecipients: addresses(headers['bcc']),
    plaintextBody: bodies.plain || undefined,
    htmlBody: bodies.html || undefined,
    date: headers['date'],
  };
}

/**
 * Build an RFC 822 message and base64url-encode it for the Gmail API, via
 * mail-mime-builder (RFC 2822/2045/2049 compliant: encoded-word headers,
 * multipart, transfer encoding). `from` is required by the builder; pass the
 * authenticated account's address.
 */
export function buildRawMessage(args: {
  from: string;
  to: string[];
  cc?: Optional<string[]>;
  bcc?: Optional<string[]>;
  subject?: Optional<string>;
  body?: Optional<string>;
  htmlBody?: Optional<string>;
  inReplyTo?: Optional<string>;
  attachments?: Optional<MimeAttachment[]>;
}): string {
  // Strip CR/LF and control characters from every header-bound field: a line
  // break in an address or subject would otherwise inject a new header (e.g. a
  // silent Bcc). Schemas reject these too; this is the choke-point guarantee.
  const msg = createMimeMessage();
  msg.setSender(stripBreaks(args.from));
  msg.setTo(args.to.map(stripBreaks));
  if (args.cc?.length) {
    msg.setCc(args.cc.map(stripBreaks));
  }
  if (args.bcc?.length) {
    msg.setBcc(args.bcc.map(stripBreaks));
  }
  // Subject is a required header for the builder; default to empty when omitted.
  msg.setSubject(stripBreaks(args.subject ?? ''));
  if (args.inReplyTo) {
    const inReplyTo = stripBreaks(args.inReplyTo);
    msg.setHeader('In-Reply-To', inReplyTo);
    msg.setHeader('References', inReplyTo);
  }
  if (args.body !== undefined) {
    msg.addMessage({ contentType: 'text/plain', data: args.body });
  }
  if (args.htmlBody !== undefined) {
    msg.addMessage({ contentType: 'text/html', data: args.htmlBody });
  }
  if (args.body === undefined && args.htmlBody === undefined) {
    msg.addMessage({ contentType: 'text/plain', data: '' });
  }
  // Attachments arrive pre-encoded (lib/attachment.ts owns reading, sizing,
  // and folding) and pre-sanitized, but filename and contentType are
  // header-bound, so the choke-point guarantee applies to them too: sanitize
  // here regardless of what the producer did. Their presence switches the
  // builder to a multipart/mixed structure.
  for (const attachment of args.attachments ?? []) {
    msg.addAttachment({
      filename: headerParamSafe(attachment.filename) || 'attachment',
      contentType: headerParamSafe(attachment.contentType) || 'application/octet-stream',
      data: attachment.data,
    });
  }
  // Base64url the RFC 822 text ourselves (the format the Gmail API expects),
  // rather than the library's asEncoded(), whose output is not URL-safe base64.
  return Buffer.from(msg.asRaw()).toString('base64url');
}

/**
 * Resolve a reply's threading context: fetch the original message for its thread
 * id and `Message-ID` so the new draft/message lands in the same thread with a
 * correct `In-Reply-To`. Returns empty fields when not replying. Shared by the
 * compose handlers (create_draft, send_message) so the threading fetch lives once.
 */
export async function resolveReplyContext(
  gmail: gmail_v1.Gmail,
  replyToMessageId: string | undefined,
): Promise<{ threadId: string | undefined; inReplyTo: string | undefined }> {
  if (!replyToMessageId) {
    return { threadId: undefined, inReplyTo: undefined };
  }
  const { data } = await gmail.users.messages.get({
    userId: 'me',
    id: replyToMessageId,
    format: 'metadata',
    metadataHeaders: ['Message-ID'],
  });
  return {
    threadId: data.threadId ?? undefined,
    inReplyTo:
      data.payload?.headers?.find((header) => header.name?.toLowerCase() === 'message-id')?.value ??
      undefined,
  };
}
