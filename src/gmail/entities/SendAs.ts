import { z } from 'zod';
import { SmtpMsa } from './SmtpMsa.js';

/**
 * Settings for the primary login address or a custom "from" address.
 * @see https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.sendAs
 */
export const SendAs = z.object({
  sendAsEmail: z
    .string()
    .optional()
    .describe('Email address used in the From header; read-only except on creation.'),
  displayName: z
    .string()
    .optional()
    .describe(
      'Name used in the From header. Empty custom alias names use the primary address name; primary name updates silently fail if the administrator disallows them.',
    ),
  replyToAddress: z
    .string()
    .optional()
    .describe('Address used in the Reply-To header; empty means no Reply-To header.'),
  signature: z
    .string()
    .optional()
    .describe(
      'HTML signature added to new messages composed with this address in the Gmail web UI; Gmail sanitizes the HTML before saving.',
    ),
  isPrimary: z
    .boolean()
    .optional()
    .describe(
      'Whether this is the primary login address; read-only, exactly one per account, and cannot be deleted.',
    ),
  isDefault: z
    .boolean()
    .optional()
    .describe(
      'Default From address for new messages and vacation replies. Only true may be written; selecting it clears the previous default.',
    ),
  treatAsAlias: z
    .boolean()
    .optional()
    .describe(
      'Whether Gmail treats a custom From address as an alias of the primary address; applies only to custom aliases.',
    ),
  smtpMsa: SmtpMsa.optional().describe(
    'Outbound SMTP relay for a custom alias; absent means delivery directly from Gmail. Write-only credentials are omitted.',
  ),
  verificationStatus: z
    .enum(['accepted', 'pending'])
    .optional()
    .describe('Read-only custom alias verification: ready to use, or awaiting owner verification.'),
});

export type SendAs = z.infer<typeof SendAs>;
