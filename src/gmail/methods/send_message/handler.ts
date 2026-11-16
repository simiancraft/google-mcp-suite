import { Readable } from 'node:stream';
import type { gmail_v1 } from '@googleapis/gmail';
import type { z } from 'zod';
import { forGoogle } from '../../../lib/optionality.js';
import { loadAttachments } from '../../lib/attachment.js';
import { buildMessageBytes, projectMessage, resolveReplyContext } from '../../lib/message.js';
import { senderAddress } from '../../lib/profile.js';
import type { schema } from './schema.js';

export async function handler(
  gmail: gmail_v1.Gmail,
  args: z.infer<typeof schema.input>,
): Promise<z.infer<typeof schema.output>> {
  const { threadId, inReplyTo } = await resolveReplyContext(gmail, args.replyToMessageId);

  const bytes = buildMessageBytes({
    from: await senderAddress(gmail),
    to: args.to,
    cc: args.cc,
    bcc: args.bcc,
    subject: args.subject,
    body: args.body,
    htmlBody: args.htmlBody,
    inReplyTo,
    attachments: await loadAttachments(args.attachments),
  });

  const { data } = await gmail.users.messages.send({
    userId: 'me',
    requestBody: forGoogle({ threadId }),
    media: { mimeType: 'message/rfc822', body: Readable.from([bytes]) },
  });
  return projectMessage(data);
}
