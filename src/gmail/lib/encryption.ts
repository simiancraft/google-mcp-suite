import type { gmail_v1 } from '@googleapis/gmail';
import { narrow } from '../../lib/utils/narrow.js';
import type { CseIdentity } from '../entities/CseIdentity.js';
import { CseKeyPair } from '../entities/CseKeyPair.js';
import type { SmimeInfo } from '../entities/SmimeInfo.js';

/** Omit the uploaded private key and password, including unexpected echoes. */
export function projectSmimeInfo(data: gmail_v1.Schema$SmimeInfo): SmimeInfo {
  return {
    id: data.id ?? undefined,
    issuerCn: data.issuerCn ?? undefined,
    isDefault: data.isDefault ?? undefined,
    expiration: data.expiration ?? undefined,
    pem: data.pem ?? undefined,
  };
}

/** Project the identity configuration, dropping null fields. */
export function projectCseIdentity(data: gmail_v1.Schema$CseIdentity): CseIdentity {
  return {
    emailAddress: data.emailAddress ?? undefined,
    primaryKeyPairId: data.primaryKeyPairId ?? undefined,
    signAndEncryptKeyPairs: data.signAndEncryptKeyPairs
      ? {
          signingKeyPairId: data.signAndEncryptKeyPairs.signingKeyPairId ?? undefined,
          encryptionKeyPairId: data.signAndEncryptKeyPairs.encryptionKeyPairId ?? undefined,
        }
      : undefined,
  };
}

/** Project documented output metadata, dropping input-only pkcs7 and unknown states. */
export function projectCseKeyPair(data: gmail_v1.Schema$CseKeyPair): CseKeyPair {
  return {
    keyPairId: data.keyPairId ?? undefined,
    pem: data.pem ?? undefined,
    subjectEmailAddresses: data.subjectEmailAddresses ?? undefined,
    disableTime: data.disableTime ?? undefined,
    enablementState: narrow(
      data.enablementState,
      CseKeyPair.shape.enablementState.unwrap().options,
    ),
    privateKeyMetadata: data.privateKeyMetadata?.map((metadata) => ({
      privateKeyMetadataId: metadata.privateKeyMetadataId ?? undefined,
      kaclsKeyMetadata: metadata.kaclsKeyMetadata
        ? {
            kaclsUri: metadata.kaclsKeyMetadata.kaclsUri ?? undefined,
            kaclsData: metadata.kaclsKeyMetadata.kaclsData ?? undefined,
          }
        : undefined,
      hardwareKeyMetadata: metadata.hardwareKeyMetadata
        ? {
            description: metadata.hardwareKeyMetadata.description ?? undefined,
          }
        : undefined,
    })),
  };
}
