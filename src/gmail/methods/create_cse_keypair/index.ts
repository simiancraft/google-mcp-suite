import { gmailOperation } from '../../operation.js';
import { handler } from './handler.js';
import { schema } from './schema.js';

export const create_cse_keypair = gmailOperation({
  description:
    'Upload a CSE public certificate chain and private key metadata; input-only pkcs7 is not returned. Requires client-side encryption; see the server instructions.',
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  source:
    'https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.cse.keypairs/create',
  schema,
  handler,
});
