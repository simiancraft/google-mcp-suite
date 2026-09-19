import { z } from 'zod';
import { AttachmentFile } from '../../entities/AttachmentFile.js';
import { Message } from '../../entities/Message.js';
import { ATTACHMENTS_PARAM_DESCRIPTION } from '../../lib/attachment.js';
import { headerSafe } from '../../lib/headers.js';

export const schema = {
  input: z.strictObject({
    to: z.array(headerSafe).min(1).describe('Primary recipients.'),
    cc: z.array(headerSafe).optional().describe('Cc recipients.'),
    bcc: z.array(headerSafe).optional().describe('Bcc recipients.'),
    subject: headerSafe.optional().describe('The subject line.'),
    body: z
      .string()
      .optional()
      .describe(
        'Plain-text content; also derives an HTML alternative unless htmlBody is supplied.',
      ),
    htmlBody: z
      .string()
      .optional()
      .describe('HTML content, used unchanged instead of the alternative derived from body.'),
    replyToMessageId: headerSafe.optional().describe('Id of the message being replied to.'),
    attachments: z.array(AttachmentFile).optional().describe(ATTACHMENTS_PARAM_DESCRIPTION),
  }),
  output: Message,
};
