import { gmailOperation } from '../../operation.js';
import { handler } from './handler.js';
import { schema } from './schema.js';

export const update_send_as = gmailOperation({
  description:
    'Replace primary sending identity settings with PUT; read first and send all writable fields to keep, or use patch_send_as for partial changes. User OAuth can update only the primary address, not custom aliases or their smtpMsa and treatAsAlias settings; sendAsEmail, isPrimary, and verificationStatus cannot be changed. HTML signatures are sanitized; administrator policy may silently prevent displayName changes.',
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  source:
    'https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.sendAs/update',
  schema,
  handler,
});
