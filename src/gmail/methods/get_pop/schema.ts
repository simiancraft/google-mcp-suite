import { z } from 'zod';
import { PopSettings } from '../../entities/PopSettings.js';

export const schema = {
  input: z.strictObject({}),
  output: PopSettings,
};
