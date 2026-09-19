import { z } from 'zod';
import { SendAs } from '../../entities/SendAs.js';

export const schema = {
  input: z.strictObject({}),
  output: z.object({
    sendAs: z.array(SendAs).describe('All configured addresses; the REST list is unpaginated.'),
  }),
};
