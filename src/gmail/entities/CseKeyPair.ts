import { z } from 'zod';
import { CsePrivateKeyMetadata } from './CsePrivateKeyMetadata.js';

/**
 * A CSE public certificate chain and private key metadata; input-only pkcs7 is omitted.
 * @see https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.cse.keypairs
 */
export const CseKeyPair = z.object({
  keyPairId: z.string().optional().describe('Output-only immutable CSE key pair ID.'),
  pem: z
    .string()
    .optional()
    .describe('Output-only public key and certificate chain in PEM format.'),
  subjectEmailAddresses: z
    .array(z.string())
    .optional()
    .describe('Output-only email identities on the leaf certificate.'),
  enablementState: z
    .enum(['enabled', 'disabled'])
    .optional()
    .describe('Current key pair state; unspecified or unknown states are omitted.'),
  disableTime: z
    .string()
    .optional()
    .describe('RFC 3339 time when the key pair was disabled; present only while disabled.'),
  privateKeyMetadata: z
    .array(CsePrivateKeyMetadata)
    .optional()
    .describe('Documented private key metadata, which can include sensitive opaque service data.'),
});

export type CseKeyPair = z.infer<typeof CseKeyPair>;
