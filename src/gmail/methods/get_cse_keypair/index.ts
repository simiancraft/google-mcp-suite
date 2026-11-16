import { gmailOperation } from '../../operation.js';
import { handler } from './handler.js';
import { schema } from './schema.js';

export const get_cse_keypair = gmailOperation({
  description:
    'Read a CSE certificate chain, enablement state, and documented private key metadata. Requires client-side encryption; see the server instructions.',
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  source:
    'https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.cse.keypairs/get',
  schema,
  handler,
});
