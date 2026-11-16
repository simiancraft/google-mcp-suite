import { z } from 'zod';
import { SmimeInfo } from '../../entities/SmimeInfo.js';

export const schema = {
  input: z.strictObject({
    sendAsEmail: z.string().describe('The sending address to inspect.'),
    id: z.string().describe('The immutable S/MIME configuration ID.'),
  }),
  output: SmimeInfo,
};
