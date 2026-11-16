import type { gmail_v1 } from '@googleapis/gmail';
import type { History } from '../entities/History.js';
import type { MessageStub } from '../entities/MessageStub.js';

/** Keep history message identifiers and any returned labels without hydrating mail. */
function projectMessageStub(data: gmail_v1.Schema$Message): MessageStub {
  return {
    id: data.id ?? undefined,
    threadId: data.threadId ?? undefined,
    labelIds: data.labelIds ?? undefined,
  };
}

/** Project the specific change arrays as well as the potentially duplicate messages array. */
export function projectHistory(data: gmail_v1.Schema$History): History {
  return {
    id: data.id ?? undefined,
    messages: data.messages?.map(projectMessageStub),
    messagesAdded: data.messagesAdded?.map((change) => ({
      message: change.message ? projectMessageStub(change.message) : undefined,
    })),
    messagesDeleted: data.messagesDeleted?.map((change) => ({
      message: change.message ? projectMessageStub(change.message) : undefined,
    })),
    labelsAdded: data.labelsAdded?.map((change) => ({
      message: change.message ? projectMessageStub(change.message) : undefined,
      labelIds: change.labelIds ?? undefined,
    })),
    labelsRemoved: data.labelsRemoved?.map((change) => ({
      message: change.message ? projectMessageStub(change.message) : undefined,
      labelIds: change.labelIds ?? undefined,
    })),
  };
}
