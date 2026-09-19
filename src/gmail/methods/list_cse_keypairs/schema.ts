import { z } from 'zod';
import { CseKeyPair } from '../../entities/CseKeyPair.js';

export const schema = {
  input: z.strictObject({
    pageSize: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe('Number of entries per page; Google defaults to 20.'),
    pageToken: z.string().optional().describe('Token for the next page; omit for the first page.'),
  }),
  output: z.object({
    cseKeyPairs: z.array(CseKeyPair).describe('One page of configured resources.'),
    nextPageToken: z
      .string()
      .optional()
      .describe('Token for the next page; absent or empty means no further pages.'),
  }),
};
