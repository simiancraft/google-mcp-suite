import { z } from 'zod';
import { CseIdentity } from '../../entities/CseIdentity.js';

export const schema = {
  input: z.strictObject({
    emailAddress: z.string().describe('The authenticated user primary email address.'),
  }),
  output: CseIdentity,
};
