import { z } from 'zod';
import { ForwardingAddress } from '../../entities/ForwardingAddress.js';

export const schema = {
  input: z.strictObject({}),
  output: z.object({
    forwardingAddresses: z
      .array(ForwardingAddress)
      .describe('All configured addresses; the REST list is unpaginated.'),
  }),
};
