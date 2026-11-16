import { z } from 'zod';
import { CseIdentity } from '../../entities/CseIdentity.js';

export const schema = {
  input: z
    .strictObject({
      emailAddress: z.string().describe('The authenticated user primary email address.'),
      primaryKeyPairId: CseIdentity.shape.primaryKeyPairId,
      signAndEncryptKeyPairs: CseIdentity.shape.signAndEncryptKeyPairs,
    })
    .refine(
      (args) => args.primaryKeyPairId === undefined || args.signAndEncryptKeyPairs === undefined,
      { message: 'Supply only one key pair configuration.' },
    ),
  output: CseIdentity,
};
