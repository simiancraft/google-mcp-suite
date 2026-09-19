import { gmailOperation } from '../../operation.js';
import { handler } from './handler.js';
import { schema } from './schema.js';

export const get_auto_forwarding = gmailOperation({
  description: 'Get auto-forwarding status, destination address, and message disposition.',
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  source:
    'https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings/getAutoForwarding',
  schema,
  handler,
});
