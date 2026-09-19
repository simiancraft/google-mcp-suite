import { MESSAGE_CAP_LABEL } from '../../lib/limits.js';
import { gmailOperation } from '../../operation.js';
import { handler } from './handler.js';
import { schema } from './schema.js';

/**
 * Replaces the draft's content with a freshly assembled message, then re-fetches
 * it `full` for projection. When `attachments` is given, the named local files
 * are read and assembled into the raw message (issue #101).
 */
export const update_draft = gmailOperation({
  description:
    'Replace the content of an existing draft, optionally attaching local files. ' +
    `The complete MIME-encoded message is capped at ${MESSAGE_CAP_LABEL}.`,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  source: 'https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.drafts/update',
  schema,
  handler,
});
