import { z } from 'zod';
import { SmimeInfo } from '../../entities/SmimeInfo.js';

export const schema = {
  input: z.strictObject({
    sendAsEmail: z.string().describe('The sending address to inspect.'),
  }),
  output: z.object({
    smimeInfo: z.array(SmimeInfo).describe('All configurations for the address; unpaginated.'),
  }),
};
