import { MESSAGE_CAP_LABEL } from '../../lib/limits.js';
import { gmailOperation } from '../../operation.js';
import { handler } from './handler.js';
import { schema } from './schema.js';

/**
 * Irreversible: assembles an RFC 822 message and sends it immediately. When
 * `replyToMessageId` is given, the original is fetched for its thread and
 * Message-ID so the reply threads correctly. When `attachments` is given, the
 * named local files are read and assembled into the raw message (issue #101).
 */
export const send_message = gmailOperation({
  description:
    'Send an email immediately, optionally attaching local files. ' +
    `The complete MIME-encoded message is capped at ${MESSAGE_CAP_LABEL}.`,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
  source: 'https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/send',
  schema,
  handler,
});
