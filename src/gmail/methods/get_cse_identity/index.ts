import { gmailOperation } from '../../operation.js';
import { handler } from './handler.js';
import { schema } from './schema.js';

export const get_cse_identity = gmailOperation({
  description:
    'Read the primary address CSE key configuration. Requires client-side encryption; see the server instructions.',
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  source:
    'https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.cse.identities/get',
  schema,
  handler,
});
