import type { gmail_v1 } from '@googleapis/gmail';
import type { z } from 'zod';
import { projectMessage } from '../../lib/message.js';
import type { schema } from './schema.js';

export async function handler(
  gmail: gmail_v1.Gmail,
  args: z.infer<typeof schema.input>,
): Promise<z.infer<typeof schema.output>> {
  const format = args.messageFormat === 'MINIMAL' ? 'metadata' : 'full';
  const { data } = await gmail.users.threads.get({
    userId: 'me',
    id: args.threadId,
    format,
  });
  return {
    id: data.id ?? args.threadId,
    historyId: data.historyId ?? undefined,
    messages: (data.messages ?? []).map(projectMessage),
  };
}
