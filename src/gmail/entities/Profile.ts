import { z } from 'zod';

/**
 * The authenticated user's mailbox profile and current history checkpoint.
 * @see https://developers.google.com/workspace/gmail/api/reference/rest/v1/users/getProfile
 */
export const Profile = z.object({
  emailAddress: z.string().optional().describe('The authenticated user email address.'),
  messagesTotal: z.number().int().optional().describe('Total messages in the mailbox.'),
  threadsTotal: z.number().int().optional().describe('Total threads in the mailbox.'),
  historyId: z
    .string()
    .optional()
    .describe('Current mailbox history ID; use as startHistoryId for list_history.'),
});

export type Profile = z.infer<typeof Profile>;
