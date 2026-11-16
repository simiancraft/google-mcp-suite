import { z } from 'zod';

/**
 * Source of Gmail internal message time for inserted or imported mail.
 * @see https://developers.google.com/workspace/gmail/api/reference/rest/v1/InternalDateSource
 */
export const InternalDateSource = z
  .enum(['receivedTime', 'dateHeader'])
  .describe('Use current receipt time or the message Date header when valid.');
export type InternalDateSource = z.infer<typeof InternalDateSource>;
