import { z } from 'zod';
import { History } from '../../entities/History.js';

export const schema = {
  input: z.strictObject({
    startHistoryId: z.string().describe('Return changes after this saved history ID; required.'),
    historyTypes: z
      .array(z.enum(['messageAdded', 'messageDeleted', 'labelAdded', 'labelRemoved']))
      .optional()
      .describe('Limit results to these change types.'),
    labelId: z.string().optional().describe('Return messages matching this label ID.'),
    maxResults: z
      .number()
      .int()
      .min(1)
      .max(500)
      .optional()
      .describe('Records per page; default 100, maximum 500.'),
    pageToken: z
      .string()
      .optional()
      .describe('Token for a specific page; omit for the first page.'),
  }),
  output: z.object({
    history: z.array(History).describe('One page of changes in increasing history ID order.'),
    nextPageToken: z
      .string()
      .optional()
      .describe('Fetch remaining pages before saving historyId as the next checkpoint.'),
    historyId: z
      .string()
      .optional()
      .describe('Current mailbox history ID; save when no nextPageToken remains.'),
  }),
};
