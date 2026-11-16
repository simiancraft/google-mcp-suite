import { z } from 'zod';
import { Disposition } from './Disposition.js';

/**
 * Auto-forwarding settings for an account.
 * @see https://developers.google.com/workspace/gmail/api/reference/rest/v1/AutoForwarding
 */
export const AutoForwarding = z.object({
  enabled: z
    .boolean()
    .optional()
    .describe('Whether all incoming mail is automatically forwarded to another address.'),
  emailAddress: z
    .string()
    .optional()
    .describe('Destination address, which must be a verified forwarding address.'),
  disposition: Disposition.optional().describe('State to leave a message in after forwarding.'),
});

export type AutoForwarding = z.infer<typeof AutoForwarding>;
