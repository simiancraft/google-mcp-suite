import { z } from 'zod';

/**
 * Settings for a forwarding address.
 * @see https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.forwardingAddresses
 */
export const ForwardingAddress = z.object({
  forwardingEmail: z
    .string()
    .optional()
    .describe('Email address to which messages can be forwarded.'),
  verificationStatus: z
    .enum(['accepted', 'pending'])
    .optional()
    .describe('Read-only forwarding verification: ready to use, or awaiting owner verification.'),
});

export type ForwardingAddress = z.infer<typeof ForwardingAddress>;
