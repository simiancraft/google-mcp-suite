import type { gmail_v1 } from '@googleapis/gmail';
import type { z } from 'zod';
import { forGoogle } from '../../../lib/optionality.js';
import { projectHistory } from '../../lib/history.js';
import type { schema } from './schema.js';

export async function handler(
  gmail: gmail_v1.Gmail,
  args: z.infer<typeof schema.input>,
): Promise<z.infer<typeof schema.output>> {
  const { data } = await gmail.users.history.list(
    forGoogle({
      userId: 'me',
      startHistoryId: args.startHistoryId,
      historyTypes: args.historyTypes,
      labelId: args.labelId,
      maxResults: args.maxResults,
      pageToken: args.pageToken,
    }),
  );
  return {
    history: (data.history ?? []).map(projectHistory),
    nextPageToken: data.nextPageToken ?? undefined,
    historyId: data.historyId ?? undefined,
  };
}
