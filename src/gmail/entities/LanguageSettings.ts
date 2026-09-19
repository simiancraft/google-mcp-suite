import { z } from 'zod';

/**
 * Language settings for an account.
 * @see https://developers.google.com/workspace/gmail/api/reference/rest/v1/LanguageSettings
 */
export const LanguageSettings = z.strictObject({
  displayLanguage: z
    .string()
    .optional()
    .describe(
      'Gmail display language as an RFC 3066 tag, such as en-GB, fr, or ja; Gmail may choose a supported variant.',
    ),
});

export type LanguageSettings = z.infer<typeof LanguageSettings>;
