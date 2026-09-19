import { gmailOperation } from '../../operation.js';
import { handler } from './handler.js';
import { schema } from './schema.js';

export const get_forwarding_address = gmailOperation({
  description:
    'Read whether a forwarding destination is verified and usable; this does not enable forwarding or send verification email.',
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  source:
    'https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.forwardingAddresses/get',
  schema,
  handler,
});
