import { z } from 'zod';
import { MessageStub } from './MessageStub.js';

/**
 * A record of a mailbox change that can affect multiple messages in multiple ways.
 * @see https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.history/list
 */
export const History = z.object({
  id: z.string().optional().describe('The mailbox sequence ID.'),
  messages: z
    .array(MessageStub)
    .optional()
    .describe(
      'Changed messages; prefer the specific change arrays because these can duplicate them.',
    ),
  messagesAdded: z
    .array(
      z.object({
        message: MessageStub.optional().describe('Message identifiers returned for this change.'),
      }),
    )
    .optional()
    .describe('Messages added to the mailbox.'),
  messagesDeleted: z
    .array(
      z.object({
        message: MessageStub.optional().describe('Message identifiers returned for this change.'),
      }),
    )
    .optional()
    .describe('Messages permanently deleted, not trashed.'),
  labelsAdded: z
    .array(
      z.object({
        message: MessageStub.optional().describe('Message identifiers returned for this change.'),
        labelIds: z.array(z.string()).optional().describe('Label IDs affected by this change.'),
      }),
    )
    .optional()
    .describe('Labels added to the associated messages.'),
  labelsRemoved: z
    .array(
      z.object({
        message: MessageStub.optional().describe('Message identifiers returned for this change.'),
        labelIds: z.array(z.string()).optional().describe('Label IDs affected by this change.'),
      }),
    )
    .optional()
    .describe('Labels removed from the associated messages.'),
});

export type History = z.infer<typeof History>;
