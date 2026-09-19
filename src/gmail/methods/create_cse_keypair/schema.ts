import { z } from 'zod';
import { CseKeyPair } from '../../entities/CseKeyPair.js';
import { CsePrivateKeyMetadata } from '../../entities/CsePrivateKeyMetadata.js';

export const schema = {
  input: z.strictObject({
    pkcs7: z
      .string()
      .describe(
        'Input-only public key and certificate chain in PEM-encoded, ASCII-armored PKCS#7 format.',
      ),
    privateKeyMetadata: z
      .array(
        CsePrivateKeyMetadata.omit({ privateKeyMetadataId: true }).refine(
          (metadata) =>
            (metadata.kaclsKeyMetadata !== undefined) !==
            (metadata.hardwareKeyMetadata !== undefined),
          { message: 'Supply exactly one private key metadata variant.' },
        ),
      )
      .describe('Private key metadata instances; each must specify exactly one variant.'),
    chainValidation: z
      .enum(['all', 'none'])
      .optional()
      .describe(
        'Defaults to all checks; none permits invalid historical decryption chains that cannot be used by an identity.',
      ),
  }),
  output: CseKeyPair,
};
