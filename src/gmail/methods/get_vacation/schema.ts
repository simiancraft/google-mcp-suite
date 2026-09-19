import { z } from 'zod';
import { VacationSettings } from '../../entities/VacationSettings.js';

export const schema = {
  input: z.strictObject({}),
  output: VacationSettings,
};
