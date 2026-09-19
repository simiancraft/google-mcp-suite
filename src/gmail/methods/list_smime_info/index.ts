import { gmailOperation } from '../../operation.js';
import { handler } from './handler.js';
import { schema } from './schema.js';

export const list_smime_info = gmailOperation({
  description:
    'List public certificates, expiry, and default status for a sending address; private keys and passwords are omitted. Requires hosted S/MIME; see the server instructions.',
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  source:
    'https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.sendAs.smimeInfo/list',
  schema,
  handler,
});
