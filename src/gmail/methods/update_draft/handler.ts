import { Readable } from 'node:stream';
import type { gmail_v1 } from '@googleapis/gmail';
import type { z } from 'zod';
import { loadAttachments } from '../../lib/attachment.js';
import { buildMessageBytes, projectDraft } from '../../lib/message.js';
import { senderAddress } from '../../lib/profile.js';
import type { schema } from './schema.js';

export async function handler(
  gmail: gmail_v1.Gmail,
  args: z.infer<typeof schema.input>,
): Promise<z.infer<typeof schema.output>> {
  const bytes = buildMessageBytes({
    from: await senderAddress(gmail),
    to: args.to,
    cc: args.cc,
    bcc: args.bcc,
    subject: args.subject,
    body: args.body,
    htmlBody: args.htmlBody,
    attachments: await loadAttachments(args.attachments),
  });
  await gmail.users.drafts.update({
    media: { mimeType: 'message/rfc822', body: Readable.from([bytes]) },
    userId: 'me',
    id: args.draftId,
    requestBody: { message: {} },
  });
  const { data } = await gmail.users.drafts.get({
    userId: 'me',
    id: args.draftId,
    format: 'full',
  });
  return projectDraft(data);
}
