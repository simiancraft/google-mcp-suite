import { z } from 'zod';
import { CseIdentity } from '../../entities/CseIdentity.js';

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
    cseIdentities: z.array(CseIdentity).describe('One page of configured resources.'),
    nextPageToken: z
      .string()
      .optional()
      .describe('Token for the next page; absent or empty means no further pages.'),
  }),
};
