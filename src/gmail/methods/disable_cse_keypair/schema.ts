import { z } from 'zod';
import { CseKeyPair } from '../../entities/CseKeyPair.js';

export const schema = {
  input: z.strictObject({
    keyPairId: z.string().describe('The immutable CSE key pair ID.'),
  }),
  output: CseKeyPair,
};
