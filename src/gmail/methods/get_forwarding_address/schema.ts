import { z } from 'zod';
import { ForwardingAddress } from '../../entities/ForwardingAddress.js';

export const schema = {
  input: z.strictObject({
    forwardingEmail: z.string().describe('The address to retrieve.'),
  }),
  output: ForwardingAddress,
};
