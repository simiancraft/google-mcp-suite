import { gmailOperation } from '../../operation.js';
import { handler } from './handler.js';
import { schema } from './schema.js';

export const list_cse_identities = gmailOperation({
  description:
    'Read one page of CSE sending identity configurations. Requires client-side encryption; see the server instructions.',
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  source:
    'https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.cse.identities/list',
  schema,
  handler,
});
