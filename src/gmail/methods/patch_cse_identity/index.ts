import { gmailOperation } from '../../operation.js';
import { handler } from './handler.js';
import { schema } from './schema.js';

export const patch_cse_identity = gmailOperation({
  description:
    'Associate a different key pair with the primary CSE identity; it must satisfy Google S/MIME certificate profiles. Requires client-side encryption; see the server instructions.',
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  source:
    'https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.cse.identities/patch',
  schema,
  handler,
});
