import { z } from 'zod';
import { AutoForwarding } from '../../entities/AutoForwarding.js';

export const schema = {
  input: z.strictObject({}),
  output: AutoForwarding,
};
