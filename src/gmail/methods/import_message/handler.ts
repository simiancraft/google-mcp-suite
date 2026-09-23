import type { gmail_v1 } from '@googleapis/gmail';
import type { z } from 'zod';
import { assertWithinDownloadCap } from '../../../lib/limits.js';
import { forGoogle } from '../../../lib/optionality.js';
import { projectMessage } from '../../lib/message.js';
import type { schema } from './schema.js';

export async function handler(
  gmail: gmail_v1.Gmail,
  args: z.infer<typeof schema.input>,
): Promise<z.infer<typeof schema.output>> {
  assertWithinDownloadCap(Buffer.byteLength(args.raw, 'base64url'), {
    subject: 'RFC 822 message',
    action: 'decoded message transfers',
  });
  const { data } = await gmail.users.messages.import(
    forGoogle({
      userId: 'me',
      internalDateSource: args.internalDateSource,
      deleted: args.deleted,
      neverMarkSpam: args.neverMarkSpam,
      processForCalendar: args.processForCalendar,
      requestBody: forGoogle({ raw: args.raw, labelIds: args.labelIds }),
    }),
  );
  return projectMessage(data);
}
