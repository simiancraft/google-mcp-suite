import { z } from 'zod';

export const schema = {
  input: z.strictObject({
    emailAddress: z.string().describe('The authenticated user primary email address.'),
  }),
  output: z.object({ emailAddress: z.string().describe('The removed resource identifier.') }),
};
