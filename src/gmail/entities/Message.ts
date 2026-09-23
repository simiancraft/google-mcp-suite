import { z } from 'zod';
import { EmailAddress } from './EmailAddress.js';

/**
 * An email message containing the sender, recipients, subject, and body. Once a
 * message is created, it cannot be changed.
 *
 * Fields here are the MCP-projected shape (a flattened subset of the REST
 * `messages` resource). Field docs use `.describe()` so they reach the wire
 * JSON Schema an MCP client reads.
 *
 * @see https://developers.google.com/workspace/gmail/api/guides
 */
export const Message = z.object({
  id: z.string().describe('The unique identifier of the message.'),
  historyId: z
    .string()
    .optional()
    .describe(
      'The ID of the last history record modifying this message; use as startHistoryId for list_history.',
    ),
  snippet: z.string().optional().describe('A short excerpt of the message body.'),
  subject: z.string().optional().describe('The subject, from headers.'),
  sender: EmailAddress.optional().describe('The sender (name and address), from headers.'),
  toRecipients: z
    .array(EmailAddress)
    .optional()
    .describe('To recipients (name and address), from headers.'),
  ccRecipients: z
    .array(EmailAddress)
    .optional()
    .describe('Cc recipients (name and address), from headers.'),
  date: z.string().optional().describe('The message date: the raw RFC 5322 Date header.'),
  plaintextBody: z.string().optional().describe('The plain-text body (FULL_CONTENT only).'),
  htmlBody: z
    .string()
    .optional()
    .describe(
      'The HTML body (FULL_CONTENT only), extracted alongside the plain-text body. Untrusted sender-supplied HTML; clients must sanitize before rendering.',
    ),
  attachmentIds: z
    .array(z.string())
    .optional()
    .describe('Attachment identifiers (FULL_CONTENT only).'),
});

export type Message = z.infer<typeof Message>;
