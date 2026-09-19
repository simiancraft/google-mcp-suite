import type { gmail_v1 } from '@googleapis/gmail';
import type { z } from 'zod';
import { projectSmimeInfo } from '../../lib/encryption.js';
import type { schema } from './schema.js';

export async function handler(
  gmail: gmail_v1.Gmail,
  args: z.infer<typeof schema.input>,
): Promise<z.infer<typeof schema.output>> {
  const { data } = await gmail.users.settings.sendAs.smimeInfo.get({
    userId: 'me',
    sendAsEmail: args.sendAsEmail,
    id: args.id,
  });
  return projectSmimeInfo(data);
}
