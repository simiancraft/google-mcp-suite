import { z } from 'zod';
import { SendAs } from '../../entities/SendAs.js';

export const schema = {
  input: z.strictObject({
    sendAsEmail: z.string().describe('The primary sending address to update.'),
    displayName: SendAs.shape.displayName,
    replyToAddress: SendAs.shape.replyToAddress,
    signature: SendAs.shape.signature,
    isDefault: z
      .literal(true)
      .optional()
      .describe(
        'Make the primary address the default From address, clearing the previous default.',
      ),
  }),
  output: SendAs,
};
