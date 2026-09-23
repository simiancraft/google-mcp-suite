import { gmailOperation } from '../../operation.js';
import { handler } from './handler.js';
import { schema } from './schema.js';

export const delete_smime_info = gmailOperation({
  description:
    'Remove a primary address certificate; mail encrypted to its key can no longer be decrypted. Revoke it with its issuer first; custom alias writes require gmail.settings.sharing. Requires hosted S/MIME; see the server instructions.',
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  source:
    'https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.sendAs.smimeInfo/delete',
  schema,
  handler,
});
