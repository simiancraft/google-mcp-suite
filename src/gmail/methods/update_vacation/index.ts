import { gmailOperation } from '../../operation.js';
import { handler } from './handler.js';
import { schema } from './schema.js';

export const update_vacation = gmailOperation({
  description:
    'Replace vacation responder settings; read the current settings first and send every field you want to keep.',
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  source:
    'https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings/updateVacation',
  schema,
  handler,
});
