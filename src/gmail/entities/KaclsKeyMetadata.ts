import { z } from 'zod';

/**
 * Private key metadata managed by an external key access control list service.
 * @see https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.cse.keypairs
 */
export const KaclsKeyMetadata = z.strictObject({
  kaclsUri: z.string().optional().describe('URI of the external key access control list service.'),
  kaclsData: z
    .string()
    .optional()
    .describe('Opaque service data, at most 8 KiB; may contain sensitive key metadata.'),
});

export type KaclsKeyMetadata = z.infer<typeof KaclsKeyMetadata>;
