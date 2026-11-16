import { Readable } from 'node:stream';
import type { gmail_v1 } from '@googleapis/gmail';
import type { z } from 'zod';
import { forGoogle } from '../../../lib/optionality.js';
import { loadAttachments } from '../../lib/attachment.js';
import { buildMessageBytes, projectDraft, resolveReplyContext } from '../../lib/message.js';
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

  const created = await gmail.users.drafts.create({
    media: { mimeType: 'message/rfc822', body: Readable.from([bytes]) },
    userId: 'me',
    requestBody: { message: forGoogle({ threadId }) },
  });

  const { data } = await gmail.users.drafts.get(
    forGoogle({ userId: 'me', id: created.data.id ?? undefined, format: 'full' }),
  );
  return projectDraft(data);
}
