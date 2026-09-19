import { z } from 'zod';

/**
 * Separate CSE key pairs for signing and encryption.
 * @see https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.cse.identities
 */
export const SignAndEncryptKeyPairs = z.strictObject({
  signingKeyPairId: z.string().optional().describe('The CSE key pair that signs outgoing mail.'),
  encryptionKeyPairId: z
    .string()
    .optional()
    .describe('The CSE key pair that encrypts signed outgoing mail.'),
});

export type SignAndEncryptKeyPairs = z.infer<typeof SignAndEncryptKeyPairs>;
