import { gmailOperation } from '../../operation.js';
import { handler } from './handler.js';
import { schema } from './schema.js';

export const list_forwarding_addresses = gmailOperation({
  description:
    'List configured forwarding destinations and their verification status; this does not enable forwarding or send verification email.',
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  source:
    'https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.forwardingAddresses/list',
  schema,
  handler,
});
