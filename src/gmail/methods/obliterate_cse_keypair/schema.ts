import { z } from 'zod';

export const schema = {
  input: z.strictObject({
    keyPairId: z.string().describe('The immutable CSE key pair ID.'),
  }),
  output: z.object({ keyPairId: z.string().describe('The removed resource identifier.') }),
};
