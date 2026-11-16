import { z } from 'zod';

/**
 * Configuration for communication with an SMTP service; output only.
 * Write-only username and password are deliberately omitted.
 * @see https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.sendAs#SmtpMsa
 */
export const SmtpMsa = z.object({
  host: z.string().optional().describe('Hostname of the SMTP service.'),
  port: z.number().int().optional().describe('Port of the SMTP service.'),
  securityMode: z
    .enum(['none', 'ssl', 'starttls'])
    .optional()
    .describe('SMTP transport security: unsecured (requires port 25), SSL, or STARTTLS.'),
});

export type SmtpMsa = z.infer<typeof SmtpMsa>;
