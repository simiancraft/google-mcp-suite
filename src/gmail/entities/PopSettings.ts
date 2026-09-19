import { z } from 'zod';
import { Disposition } from './Disposition.js';

/**
 * POP settings for an account.
 * @see https://developers.google.com/workspace/gmail/api/reference/rest/v1/PopSettings
 */
export const PopSettings = z.strictObject({
  accessWindow: z
    .enum(['disabled', 'fromNowOn', 'allMail'])
    .optional()
    .describe(
      'Messages accessible via POP: none, unfetched messages since a past point in time, or all unfetched messages.',
    ),
  disposition: Disposition.optional().describe('Action after a message has been fetched via POP.'),
});

export type PopSettings = z.infer<typeof PopSettings>;
