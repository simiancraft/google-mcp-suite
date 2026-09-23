import type { gmail_v1 } from '@googleapis/gmail';
import type { z } from 'zod';
import { forGoogle } from '../../../lib/optionality.js';
import { projectCseIdentity } from '../../lib/encryption.js';
import type { schema } from './schema.js';

export async function handler(
  gmail: gmail_v1.Gmail,
  args: z.infer<typeof schema.input>,
): Promise<z.infer<typeof schema.output>> {
  const { data } = await gmail.users.settings.cse.identities.list(
    forGoogle({ userId: 'me', pageSize: args.pageSize, pageToken: args.pageToken }),
  );
  return {
    cseIdentities: (data.cseIdentities ?? []).map(projectCseIdentity),
    nextPageToken: data.nextPageToken ?? undefined,
  };
}
