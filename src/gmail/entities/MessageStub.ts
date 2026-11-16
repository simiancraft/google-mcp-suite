import { z } from 'zod';

/**
 * Message identifiers returned by mailbox history; no message hydration is performed.
 * @see https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.history/list
 */
export const MessageStub = z.object({
  id: z.string().optional().describe('The immutable message ID.'),
  threadId: z.string().optional().describe('The thread containing this message.'),
  labelIds: z
    .array(z.string())
    .optional()
    .describe('Label IDs when included in the history response.'),
});

export type MessageStub = z.infer<typeof MessageStub>;
