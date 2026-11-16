import { z } from 'zod';

export const schema = {
  input: z.strictObject({
    sendAsEmail: z
      .string()
      .describe('The primary sending address; custom alias writes require gmail.settings.sharing.'),
    id: z.string().describe('The immutable S/MIME configuration ID.'),
  }),
  output: z.object({
    sendAsEmail: z.string().describe('The primary sending address.'),
    id: z.string().describe('The affected configuration ID.'),
  }),
};
