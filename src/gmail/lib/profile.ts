import type { gmail_v1 } from '@googleapis/gmail';
import type { Profile } from '../entities/Profile.js';

/** Fetch a fresh mailbox profile; history checkpoints and counts must not be cached. */
export async function fetchProfile(gmail: gmail_v1.Gmail): Promise<Profile> {
  const { data } = await gmail.users.getProfile({ userId: 'me' });
  return {
    emailAddress: data.emailAddress ?? undefined,
    messagesTotal: data.messagesTotal ?? undefined,
    threadsTotal: data.threadsTotal ?? undefined,
    historyId: data.historyId ?? undefined,
  };
}

/**
 * The authenticated account's email address, for the `From` header when
 * composing messages. A server instance is bound to one account, so the address
 * is stable; the in-flight promise is memoized on the client (WeakMap), which
 * collapses `getProfile` to one call per process, lets concurrent composes share
 * it, and stays per-instance, test-safe, and garbage-collected with the client.
 */
const cache = new WeakMap<gmail_v1.Gmail, Promise<string>>();

export function senderAddress(gmail: gmail_v1.Gmail): Promise<string> {
  let pending = cache.get(gmail);
  if (!pending) {
    pending = fetchProfile(gmail).then((profile) => profile.emailAddress ?? 'me');
    cache.set(gmail, pending);
  }
  return pending;
}
