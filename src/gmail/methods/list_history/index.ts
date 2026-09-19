import { gmailOperation } from '../../operation.js';
import { handler } from './handler.js';
import { schema } from './schema.js';

export const list_history = gmailOperation({
  description:
    'Read one page of mailbox changes using a startHistoryId from get_profile, a message, a thread, or the previous page historyId. An expired or invalid startHistoryId returns HTTP 404 and requires a full resync.',
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  source: 'https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.history/list',
  schema,
  handler,
});
