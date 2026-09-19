import { z } from 'zod';
import { AttachmentFile } from '../../entities/AttachmentFile.js';
import { Draft } from '../../entities/Draft.js';
import { ATTACHMENTS_PARAM_DESCRIPTION } from '../../lib/attachment.js';
import { headerSafe } from '../../lib/headers.js';

export const schema = {
  input: z.strictObject({
    draftId: z.string().describe('The id of the draft to replace.'),
    to: z
      .array(headerSafe)
      .min(1)
      .describe('Primary recipients (the draft is replaced, not patched).'),
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
    attachments: z.array(AttachmentFile).optional().describe(ATTACHMENTS_PARAM_DESCRIPTION),
  }),
  output: Draft,
};
