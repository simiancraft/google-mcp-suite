import { gmailOperation } from '../../operation.js';
import { handler } from './handler.js';
import { schema } from './schema.js';

export const get_send_as = gmailOperation({
  description:
    'Read an existing sending identity, including its HTML signature, default status, and custom alias verification; an unknown address returns 404. SMTP credentials are never returned.',
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  source:
    'https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.sendAs/get',
  schema,
  handler,
});
