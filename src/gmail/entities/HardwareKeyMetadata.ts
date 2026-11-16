import { z } from 'zod';

/**
 * Metadata for a private key stored on a hardware smart card.
 * @see https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.cse.keypairs
 */
export const HardwareKeyMetadata = z.strictObject({
  description: z.string().optional().describe('Description of the hardware key.'),
});

export type HardwareKeyMetadata = z.infer<typeof HardwareKeyMetadata>;
