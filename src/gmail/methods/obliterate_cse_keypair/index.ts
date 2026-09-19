import { gmailOperation } from '../../operation.js';
import { handler } from './handler.js';
import { schema } from './schema.js';

export const obliterate_cse_keypair = gmailOperation({
  description:
    'Permanently delete a CSE key pair disabled for more than 30 days. This cannot be undone; Gmail cannot restore or decrypt messages encrypted with it. Requires client-side encryption; see the server instructions.',
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  source:
    'https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.cse.keypairs/obliterate',
  schema,
  handler,
});
