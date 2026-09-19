import type { gmail_v1 } from '@googleapis/gmail';
import type { z } from 'zod';
import { forGoogle } from '../../../lib/optionality.js';
import { projectCseKeyPair } from '../../lib/encryption.js';
import type { schema } from './schema.js';

export async function handler(
  gmail: gmail_v1.Gmail,
  args: z.infer<typeof schema.input>,
): Promise<z.infer<typeof schema.output>> {
  const { data } = await gmail.users.settings.cse.keypairs.list(
    forGoogle({ userId: 'me', pageSize: args.pageSize, pageToken: args.pageToken }),
  );
  return {
    cseKeyPairs: (data.cseKeyPairs ?? []).map(projectCseKeyPair),
    nextPageToken: data.nextPageToken ?? undefined,
  };
}
