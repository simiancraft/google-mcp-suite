/**
 * Gmail's mediaUpload.maxSize for messages.send, drafts.create, and drafts.update.
 * Applies to the RFC 822 media bytes for every upload protocol.
 * @see https://gmail.googleapis.com/$discovery/rest?version=v1
 */
export const MAX_MESSAGE_BYTES = 35 * 1024 * 1024;

export const MESSAGE_CAP_LABEL = `${MAX_MESSAGE_BYTES} bytes (35 MiB)`;

/** Refuse encoded media that exceeds Gmail's limit before uploading it. */
export function assertWithinMessageCap(size: number, subject = 'The encoded message'): void {
  if (size > MAX_MESSAGE_BYTES) {
    throw new Error(`${subject} is ${size} bytes; Gmail's message limit is ${MESSAGE_CAP_LABEL}.`);
  }
}
