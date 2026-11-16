import { z } from 'zod';

/**
 * An S/MIME email configuration, excluding the uploaded private key and password.
 * @see https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.sendAs.smimeInfo
 */
export const SmimeInfo = z.object({
  id: z.string().optional().describe('The immutable S/MIME configuration ID.'),
  issuerCn: z.string().optional().describe('The certificate issuer common name.'),
  isDefault: z
    .boolean()
    .optional()
    .describe('Whether this is the default certificate for the sending address.'),
  expiration: z
    .string()
    .optional()
    .describe('Certificate expiration in milliseconds since the Unix epoch.'),
  pem: z
    .string()
    .optional()
    .describe(
      'PEM X509 certificate and public certificate chain; no private key or password is returned.',
    ),
});

export type SmimeInfo = z.infer<typeof SmimeInfo>;
