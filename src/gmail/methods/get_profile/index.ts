import { gmailOperation } from '../../operation.js';
import { handler } from './handler.js';
import { schema } from './schema.js';

export const get_profile = gmailOperation({
  description:
    'Read the account email address, mailbox counts, and current historyId to start tracking changes with list_history; each call fetches a fresh checkpoint.',
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  source: 'https://developers.google.com/workspace/gmail/api/reference/rest/v1/users/getProfile',
  schema,
  handler,
});
