import { z } from 'zod';

/**
 * IMAP settings for an account.
 * @see https://developers.google.com/workspace/gmail/api/reference/rest/v1/ImapSettings
 */
export const ImapSettings = z.strictObject({
  enabled: z.boolean().optional().describe('Whether IMAP is enabled for the account.'),
  autoExpunge: z
    .boolean()
    .optional()
    .describe(
      'Whether Gmail immediately expunges messages marked deleted in IMAP, or waits for a client update.',
    ),
  expungeBehavior: z
    .enum(['archive', 'trash', 'deleteForever'])
    .optional()
    .describe(
      'Action when a message is deleted and expunged from its last visible IMAP folder; deleteForever is permanent.',
    ),
  maxFolderSize: z
    .number()
    .int()
    .refine((value) => [0, 1000, 2000, 5000, 10000].includes(value))
    .optional()
    .describe(
      'Maximum messages per IMAP folder: 0, 1000, 2000, 5000, or 10000; zero means unlimited.',
    ),
});

export type ImapSettings = z.infer<typeof ImapSettings>;
