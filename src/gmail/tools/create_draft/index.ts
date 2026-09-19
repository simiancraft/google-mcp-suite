import { MESSAGE_CAP_LABEL } from '../../lib/limits.js';
import { gmailOperation } from '../../operation.js';
import { handler } from './handler.js';
import { schema } from './schema.js';

/**
 * Assembles an RFC 822 message and creates a draft. When `replyToMessageId` is
 * given, the original is fetched for its thread and Message-ID so the draft
 * threads correctly. When `attachments` is given, the named local files are
 * read and assembled into the raw message (issue #101). The created draft is
 * re-fetched `full` for projection.
 */
export const create_draft = gmailOperation({
  description:
    'Create a draft email, optionally attaching local files. ' +
    `The complete MIME-encoded message is capped at ${MESSAGE_CAP_LABEL}.`,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  source: 'https://developers.google.com/workspace/gmail/api/reference/mcp/tools_list/create_draft',
  schema,
  handler,
});
