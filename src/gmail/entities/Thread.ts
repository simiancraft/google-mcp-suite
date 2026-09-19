import { z } from 'zod';
import { Message } from './Message.js';

/**
 * A collection of related messages forming a conversation. In an email client,
 * a thread is formed when one or more recipients respond to a message with their
 * own message.
 *
 * Fields here are the MCP-projected shape of the REST `threads` resource. Field
 * docs use `.describe()` so they reach the wire JSON Schema an MCP client reads.
 *
 * @see https://developers.google.com/workspace/gmail/api/guides
 */
export const Thread = z.object({
  id: z.string().describe('The unique identifier of the thread.'),
  historyId: z
    .string()
    .optional()
    .describe(
      'The ID of the last history record modifying this thread; use as startHistoryId for list_history.',
    ),
  snippet: z
    .string()
    .optional()
    .describe(
      'A short preview of the thread (present on search results; use get_thread for messages).',
    ),
  messages: z.array(Message).describe('The messages in the thread, chronologically ordered.'),
});

export type Thread = z.infer<typeof Thread>;
