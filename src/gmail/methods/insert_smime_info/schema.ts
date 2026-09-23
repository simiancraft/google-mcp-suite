import { z } from 'zod';
import { SmimeInfo } from '../../entities/SmimeInfo.js';

export const schema = {
  input: z.strictObject({
    sendAsEmail: z
      .string()
      .describe('The primary sending address; custom alias writes require gmail.settings.sharing.'),
    pkcs12: z
      .string()
      .min(1)
      .regex(/^[A-Za-z0-9_-]+={0,2}$/)
      .refine(
        (pkcs12) =>
          pkcs12.replace(/=+$/, '').length % 4 !== 1 &&
          (!pkcs12.includes('=') || pkcs12.length % 4 === 0),
        { message: 'Expected base64url encoding.' },
      )
      .describe('Base64url PKCS#12 private/public key pair and certificate chain.'),
    encryptedKeyPassword: z
      .string()
      .optional()
      .describe('Password for an encrypted PKCS#12 key; never returned.'),
  }),
  output: SmimeInfo,
};
