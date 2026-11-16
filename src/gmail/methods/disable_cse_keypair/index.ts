import { gmailOperation } from '../../operation.js';
import { handler } from './handler.js';
import { schema } from './schema.js';

export const disable_cse_keypair = gmailOperation({
  description:
    'Disable a CSE key pair, blocking decryption and signing with it; enable it again to regain access. Requires client-side encryption; see the server instructions.',
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  source:
    'https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.cse.keypairs/disable',
  schema,
  handler,
});
