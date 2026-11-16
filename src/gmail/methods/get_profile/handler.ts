import type { gmail_v1 } from '@googleapis/gmail';
import type { z } from 'zod';
import { fetchProfile } from '../../lib/profile.js';
import type { schema } from './schema.js';

export async function handler(gmail: gmail_v1.Gmail): Promise<z.infer<typeof schema.output>> {
  return fetchProfile(gmail);
}
