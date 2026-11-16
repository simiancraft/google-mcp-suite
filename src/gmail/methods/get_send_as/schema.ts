import { z } from 'zod';
import { SendAs } from '../../entities/SendAs.js';

export const schema = {
  input: z.strictObject({
    sendAsEmail: z.string().describe('The address to retrieve.'),
  }),
  output: SendAs,
};
