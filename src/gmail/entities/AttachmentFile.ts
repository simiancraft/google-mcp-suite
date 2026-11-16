import { isAbsolute } from 'node:path';
import { z } from 'zod';
import { headerSafe } from '../lib/headers.js';

/**
 * A local file to attach to an outgoing message. A suite extension, not a
 * Google noun: Gmail takes attachments inside RFC 822 media, so the
 * compose operations (`create_draft`, `update_draft`,
 * `send_message`) accept this shape and the server assembles the MIME message
 * itself (issue #101 is the provenance).
 * @see https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages#Message
 */
export const AttachmentFile = z.strictObject({
  path: z
    .string()
    .min(1)
    .refine(isAbsolute, 'must be an absolute path')
    .describe(
      'Absolute filesystem path, as this server process sees it, of the file to attach. ' +
        'The server reads the bytes when the message is assembled.',
    ),
  filename: headerSafe
    .min(1)
    .optional()
    .describe(
      'Filename shown to the recipient. Defaults to the basename of `path`. ' +
        'Double quotes and backslashes are stripped for header safety.',
    ),
  mimeType: headerSafe
    .min(1)
    .regex(/^[\w.+-]+\/[\w.+-]+$/, 'must be a type/subtype MIME type, without parameters')
    .optional()
    .describe(
      'MIME type of the file, as a bare type/subtype token. Defaults to a type inferred ' +
        "from the path's file extension, or application/octet-stream when the extension " +
        'is unrecognized.',
    ),
});
export type AttachmentFile = z.infer<typeof AttachmentFile>;
