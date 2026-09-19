import type { gmail_v1 } from '@googleapis/gmail';
import type { z } from 'zod';
import { forGoogle } from '../../../lib/optionality.js';
import type { schema } from './schema.js';

export async function handler(
  gmail: gmail_v1.Gmail,
  args: z.infer<typeof schema.input>,
): Promise<z.infer<typeof schema.output>> {
  const { data } = await gmail.users.threads.list(
    forGoogle({
      userId: 'me',
      q: args.query,
      maxResults: args.pageSize ?? 20,
      pageToken: args.pageToken,
      includeSpamTrash: args.includeTrash ?? false,
    }),
  );

  const threads = (data.threads ?? []).map((thread) => ({
    id: thread.id ?? '',
    historyId: thread.historyId ?? undefined,
    snippet: thread.snippet ?? undefined,
    messages: [],
  }));

  return { threads, nextPageToken: data.nextPageToken ?? undefined };
}
