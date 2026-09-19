import type { gmail_v1 } from '@googleapis/gmail';
import type { z } from 'zod';
import { forGoogle } from '../../../lib/optionality.js';
import { projectCseKeyPair } from '../../lib/encryption.js';
import type { schema } from './schema.js';

export async function handler(
  gmail: gmail_v1.Gmail,
  args: z.infer<typeof schema.input>,
): Promise<z.infer<typeof schema.output>> {
  const { data } = await gmail.users.settings.cse.keypairs.create(
    forGoogle({
      userId: 'me',
      chainValidation: args.chainValidation,
      requestBody: {
        pkcs7: args.pkcs7,
        privateKeyMetadata: args.privateKeyMetadata.map((metadata) =>
          forGoogle({
            kaclsKeyMetadata: metadata.kaclsKeyMetadata
              ? forGoogle(metadata.kaclsKeyMetadata)
              : undefined,
            hardwareKeyMetadata: metadata.hardwareKeyMetadata
              ? forGoogle(metadata.hardwareKeyMetadata)
              : undefined,
          }),
        ),
      },
    }),
  );
  return projectCseKeyPair(data);
}
