import { gmailOperation } from '../../operation.js';
import { handler } from './handler.js';
import { schema } from './schema.js';

export const patch_send_as = gmailOperation({
  description:
    'Change only supplied primary sending identity fields with PATCH, preserving omitted fields. User OAuth can update only the primary address, not custom aliases or their smtpMsa and treatAsAlias settings; sendAsEmail, isPrimary, and verificationStatus cannot be changed. HTML signatures are sanitized; administrator policy may silently prevent displayName changes.',
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  source:
    'https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.sendAs/patch',
  schema,
  handler,
});
