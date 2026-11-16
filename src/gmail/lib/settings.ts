import type { gmail_v1 } from '@googleapis/gmail';
import { narrow } from '../../lib/utils/narrow.js';
import { AutoForwarding } from '../entities/AutoForwarding.js';
import { ForwardingAddress } from '../entities/ForwardingAddress.js';
import { ImapSettings } from '../entities/ImapSettings.js';
import type { LanguageSettings } from '../entities/LanguageSettings.js';
import { PopSettings } from '../entities/PopSettings.js';
import { SendAs } from '../entities/SendAs.js';
import { SmtpMsa } from '../entities/SmtpMsa.js';
import type { VacationSettings } from '../entities/VacationSettings.js';

/** Project raw Gmail vacation settings, dropping nulls. */
export function projectVacationSettings(data: gmail_v1.Schema$VacationSettings): VacationSettings {
  return {
    enableAutoReply: data.enableAutoReply ?? undefined,
    responseSubject: data.responseSubject ?? undefined,
    responseBodyPlainText: data.responseBodyPlainText ?? undefined,
    responseBodyHtml: data.responseBodyHtml ?? undefined,
    restrictToContacts: data.restrictToContacts ?? undefined,
    restrictToDomain: data.restrictToDomain ?? undefined,
    startTime: data.startTime ?? undefined,
    endTime: data.endTime ?? undefined,
  };
}

/** Project raw Gmail auto-forwarding settings, dropping nulls and unknown enums. */
export function projectAutoForwarding(data: gmail_v1.Schema$AutoForwarding): AutoForwarding {
  return {
    enabled: data.enabled ?? undefined,
    emailAddress: data.emailAddress ?? undefined,
    disposition: narrow(data.disposition, AutoForwarding.shape.disposition.unwrap().options),
  };
}

/** Project raw Gmail IMAP settings, dropping nulls and unknown enums. */
export function projectImapSettings(data: gmail_v1.Schema$ImapSettings): ImapSettings {
  return {
    enabled: data.enabled ?? undefined,
    autoExpunge: data.autoExpunge ?? undefined,
    expungeBehavior: narrow(
      data.expungeBehavior,
      ImapSettings.shape.expungeBehavior.unwrap().options,
    ),
    maxFolderSize: data.maxFolderSize ?? undefined,
  };
}

/** Project raw Gmail POP settings, dropping nulls and unknown enums. */
export function projectPopSettings(data: gmail_v1.Schema$PopSettings): PopSettings {
  return {
    accessWindow: narrow(data.accessWindow, PopSettings.shape.accessWindow.unwrap().options),
    disposition: narrow(data.disposition, PopSettings.shape.disposition.unwrap().options),
  };
}

/** Project raw Gmail language settings, dropping nulls. */
export function projectLanguageSettings(data: gmail_v1.Schema$LanguageSettings): LanguageSettings {
  return {
    displayLanguage: data.displayLanguage ?? undefined,
  };
}

/** Project send-as settings, dropping nulls, unknown enums, and write-only credentials. */
export function projectSendAs(data: gmail_v1.Schema$SendAs): SendAs {
  return {
    sendAsEmail: data.sendAsEmail ?? undefined,
    displayName: data.displayName ?? undefined,
    replyToAddress: data.replyToAddress ?? undefined,
    signature: data.signature ?? undefined,
    isPrimary: data.isPrimary ?? undefined,
    isDefault: data.isDefault ?? undefined,
    treatAsAlias: data.treatAsAlias ?? undefined,
    smtpMsa: data.smtpMsa
      ? {
          host: data.smtpMsa.host ?? undefined,
          port: data.smtpMsa.port ?? undefined,
          securityMode: narrow(
            data.smtpMsa.securityMode,
            SmtpMsa.shape.securityMode.unwrap().options,
          ),
        }
      : undefined,
    verificationStatus: narrow(
      data.verificationStatus,
      SendAs.shape.verificationStatus.unwrap().options,
    ),
  };
}

/** Project forwarding settings, dropping nulls and unknown enums. */
export function projectForwardingAddress(
  data: gmail_v1.Schema$ForwardingAddress,
): ForwardingAddress {
  return {
    forwardingEmail: data.forwardingEmail ?? undefined,
    verificationStatus: narrow(
      data.verificationStatus,
      ForwardingAddress.shape.verificationStatus.unwrap().options,
    ),
  };
}
