import { gmailOperation } from '../../operation.js';
import { handler } from './handler.js';
import { schema } from './schema.js';

export const get_smime_info = gmailOperation({
  description:
    'Read a sending address certificate, expiry, and default status; private keys and passwords are omitted. Requires hosted S/MIME; see the server instructions.',
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  source:
    'https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.sendAs.smimeInfo/get',
  schema,
  handler,
});
