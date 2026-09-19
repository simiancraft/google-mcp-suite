import { gmailOperation } from '../../operation.js';
import { handler } from './handler.js';
import { schema } from './schema.js';

export const list_send_as = gmailOperation({
  description:
    'List the primary sending address and all custom From aliases, including HTML signatures and verification status; SMTP credentials are never returned.',
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  source:
    'https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.sendAs/list',
  schema,
  handler,
});
