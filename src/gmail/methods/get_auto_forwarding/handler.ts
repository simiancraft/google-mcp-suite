import type { gmail_v1 } from '@googleapis/gmail';
import type { z } from 'zod';
import { projectAutoForwarding } from '../../lib/settings.js';
import type { schema } from './schema.js';

export async function handler(gmail: gmail_v1.Gmail): Promise<z.infer<typeof schema.output>> {
  const { data } = await gmail.users.settings.getAutoForwarding({ userId: 'me' });
  return projectAutoForwarding(data);
}
