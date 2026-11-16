import { gmailOperation } from '../../operation.js';
import { handler } from './handler.js';
import { schema } from './schema.js';

export const enable_cse_keypair = gmailOperation({
  description:
    'Restore use of a disabled CSE key pair for associated identities. Requires client-side encryption; see the server instructions.',
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  source:
    'https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.cse.keypairs/enable',
  schema,
  handler,
});
