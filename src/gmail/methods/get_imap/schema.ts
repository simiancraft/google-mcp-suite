import { z } from 'zod';
import { ImapSettings } from '../../entities/ImapSettings.js';

export const schema = {
  input: z.strictObject({}),
  output: ImapSettings,
};
