import { MIB_LABEL } from '../../../lib/limits.js';
import { gmailOperation } from '../../operation.js';
import { handler } from './handler.js';
import { schema } from './schema.js';

export const import_message = gmailOperation({
  description: `Import an RFC 822 message like receipt over SMTP, with normal scanning and classification but no SPF check; processForCalendar can add calendar invitations. Writes mail into the mailbox without anyone sending it; repeating creates duplicates. JSON raw is limited to ${MIB_LABEL} decoded; Gmail may reject smaller payloads.`,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  source:
    'https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/import',
  schema,
  handler,
});
