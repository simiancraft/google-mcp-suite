import { z } from 'zod';
import { Profile } from '../../entities/Profile.js';

export const schema = {
  input: z.strictObject({}),
  output: Profile,
};
