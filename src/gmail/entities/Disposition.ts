import { z } from 'zod';

/**
 * What Gmail does with a message after forwarding or POP retrieval.
 * @see https://developers.google.com/workspace/gmail/api/reference/rest/v1/AutoForwarding#Disposition
 */
export const Disposition = z.enum(['leaveInInbox', 'archive', 'trash', 'markRead']);

export type Disposition = z.infer<typeof Disposition>;
