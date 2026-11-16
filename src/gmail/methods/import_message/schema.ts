import { z } from 'zod';
import { MIB_LABEL } from '../../../lib/limits.js';
import { InternalDateSource } from '../../entities/InternalDateSource.js';
import { Message } from '../../entities/Message.js';

export const schema = {
  input: z.strictObject({
    raw: z
      .string()
      .min(1)
      .regex(/^[A-Za-z0-9_-]+={0,2}$/)
      .refine(
        (raw) =>
          raw.replace(/=+$/, '').length % 4 !== 1 && (!raw.includes('=') || raw.length % 4 === 0),
        { message: 'Expected base64url encoding.' },
      )
      .describe(
        `Whole RFC 822 message, base64url encoded, sent through the JSON raw field; decoded content is capped at ${MIB_LABEL}.`,
      ),
    labelIds: z
      .array(z.string())
      .optional()
      .describe('Labels to apply to the newly stored message.'),
    internalDateSource: InternalDateSource.optional().describe(
      'Use receipt time or the Date header for mailbox ordering.',
    ),
    deleted: z
      .boolean()
      .optional()
      .describe(
        'Workspace only: store as permanently deleted, visible only to a Google Vault administrator, not in TRASH.',
      ),
    neverMarkSpam: z
      .boolean()
      .optional()
      .describe('Ignore spam classifier decisions and never mark this message as SPAM.'),
    processForCalendar: z
      .boolean()
      .optional()
      .describe('Extract calendar invitations and add meetings to this user Google Calendar.'),
  }),
  output: Message,
};
