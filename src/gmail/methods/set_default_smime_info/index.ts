import { gmailOperation } from '../../operation.js';
import { handler } from './handler.js';
import { schema } from './schema.js';

export const set_default_smime_info = gmailOperation({
  description:
    'Select the primary address default certificate, clearing the previous default; custom alias writes require gmail.settings.sharing. Requires hosted S/MIME; see the server instructions.',
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  source:
    'https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.sendAs.smimeInfo/setDefault',
  schema,
  handler,
});
