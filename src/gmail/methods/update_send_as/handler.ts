import type { gmail_v1 } from '@googleapis/gmail';
import type { z } from 'zod';
import { forGoogle } from '../../../lib/optionality.js';
import { projectSendAs } from '../../lib/settings.js';
import type { schema } from './schema.js';

export async function handler(
  gmail: gmail_v1.Gmail,
  args: z.infer<typeof schema.input>,
): Promise<z.infer<typeof schema.output>> {
  const { data } = await gmail.users.settings.sendAs.update({
    userId: 'me',
    sendAsEmail: args.sendAsEmail,
    requestBody: forGoogle({
      displayName: args.displayName,
      replyToAddress: args.replyToAddress,
      signature: args.signature,
      isDefault: args.isDefault,
    }),
  });
  return projectSendAs(data);
}
