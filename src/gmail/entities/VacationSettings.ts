import { z } from 'zod';

/**
 * Vacation auto-reply settings for an account.
 * @see https://developers.google.com/workspace/gmail/api/reference/rest/v1/VacationSettings
 */
export const VacationSettings = z.strictObject({
  enableAutoReply: z
    .boolean()
    .optional()
    .describe('Whether Gmail automatically replies to messages.'),
  responseSubject: z
    .string()
    .optional()
    .describe(
      'Text prepended to vacation response subjects. Enabling replies requires a nonempty subject or body.',
    ),
  responseBodyPlainText: z
    .string()
    .optional()
    .describe(
      'Plain text response body; responseBodyHtml takes precedence when both are supplied.',
    ),
  responseBodyHtml: z
    .string()
    .optional()
    .describe(
      'HTML response body, sanitized by Gmail before storage; takes precedence over plain text.',
    ),
  restrictToContacts: z.boolean().optional().describe('Whether to restrict responses to contacts.'),
  restrictToDomain: z
    .boolean()
    .optional()
    .describe(
      'Whether to restrict responses to the account domain; available only to Google Workspace users.',
    ),
  startTime: z
    .string()
    .optional()
    .describe(
      'Start time as an int64 string in epoch milliseconds; must precede endTime when both are specified.',
    ),
  endTime: z
    .string()
    .optional()
    .describe(
      'End time as an int64 string in epoch milliseconds; replies apply only to messages received before this time.',
    ),
});

export type VacationSettings = z.infer<typeof VacationSettings>;
