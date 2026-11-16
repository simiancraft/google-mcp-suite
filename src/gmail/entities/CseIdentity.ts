import { z } from 'zod';
import { SignAndEncryptKeyPairs } from './SignAndEncryptKeyPairs.js';

/**
 * Client-side encryption configuration for the authenticated user email address.
 * @see https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.cse.identities
 */
export const CseIdentity = z.object({
  emailAddress: z
    .string()
    .optional()
    .describe('The sending identity; must be the authenticated user primary email address.'),
  primaryKeyPairId: z
    .string()
    .optional()
    .describe('Associated CSE key pair; mutually exclusive with signAndEncryptKeyPairs.'),
  signAndEncryptKeyPairs: SignAndEncryptKeyPairs.optional().describe(
    'Separate signing and encryption key pairs; mutually exclusive with primaryKeyPairId.',
  ),
});

export type CseIdentity = z.infer<typeof CseIdentity>;
