import { z } from 'zod';
import { LanguageSettings } from '../../entities/LanguageSettings.js';

export const schema = {
  input: z.strictObject({}),
  output: LanguageSettings,
};
