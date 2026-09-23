import { gmailOperation } from '../../operation.js';
import { handler } from './handler.js';
import { schema } from './schema.js';

export const insert_smime_info = gmailOperation({
  description:
    'Upload a base64url PKCS#12 certificate and private key for the primary address only; custom alias writes require gmail.settings.sharing. The key and password are never returned. Requires hosted S/MIME; see the server instructions.',
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  source:
    'https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.sendAs.smimeInfo/insert',
  schema,
  handler,
});
