import { z } from 'zod';
import { HardwareKeyMetadata } from './HardwareKeyMetadata.js';
import { KaclsKeyMetadata } from './KaclsKeyMetadata.js';

/**
 * Metadata for a private key instance; this resource does not carry the private key itself.
 * @see https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.cse.keypairs
 */
export const CsePrivateKeyMetadata = z.strictObject({
  privateKeyMetadataId: z
    .string()
    .optional()
    .describe('Output-only immutable private key metadata ID.'),
  kaclsKeyMetadata: KaclsKeyMetadata.optional().describe(
    'External key service metadata; exactly one metadata variant is required on creation.',
  ),
  hardwareKeyMetadata: HardwareKeyMetadata.optional().describe(
    'Hardware key metadata; exactly one metadata variant is required on creation.',
  ),
});

export type CsePrivateKeyMetadata = z.infer<typeof CsePrivateKeyMetadata>;
