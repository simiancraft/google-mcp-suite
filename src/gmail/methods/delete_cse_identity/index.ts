import { gmailOperation } from '../../operation.js';
import { handler } from './handler.js';
import { schema } from './schema.js';

export const delete_cse_identity = gmailOperation({
  description:
    'Delete a CSE identity, preventing encrypted sending with it. It cannot be restored; create another identity to reuse the configuration. Requires client-side encryption; see the server instructions.',
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  source:
    'https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.cse.identities/delete',
  schema,
  handler,
});
