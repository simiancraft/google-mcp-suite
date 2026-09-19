import { MIB_LABEL } from '../../../lib/limits.js';
import { gmailOperation } from '../../operation.js';
import { handler } from './handler.js';
import { schema } from './schema.js';

export const insert_message = gmailOperation({
  description: `Insert an RFC 822 message like IMAP APPEND, bypassing most scanning and classification. Writes mail into the mailbox without anyone sending it; repeating creates duplicates. JSON raw is limited to ${MIB_LABEL} decoded; Gmail may reject smaller payloads.`,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  source:
    'https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/insert',
  schema,
  handler,
});
