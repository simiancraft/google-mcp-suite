import type { gmail_v1 } from '@googleapis/gmail';
import type { z } from 'zod';
import { forGoogle } from '../../../lib/optionality.js';
import { projectSmimeInfo } from '../../lib/encryption.js';
import type { schema } from './schema.js';

export async function handler(
  gmail: gmail_v1.Gmail,
  args: z.infer<typeof schema.input>,
): Promise<z.infer<typeof schema.output>> {
  const { data } = await gmail.users.settings.sendAs.smimeInfo.insert({
    userId: 'me',
    sendAsEmail: args.sendAsEmail,
    requestBody: forGoogle({
      pkcs12: args.pkcs12,
      encryptedKeyPassword: args.encryptedKeyPassword,
    }),
  });
  return projectSmimeInfo(data);
}
