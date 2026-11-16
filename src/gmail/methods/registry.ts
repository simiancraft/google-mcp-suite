import type { gmail_v1 } from '@googleapis/gmail';
import type { AnyOperation } from '../../lib/operation.js';
import { batch_delete_messages } from './batch_delete_messages/index.js';
import { batch_modify_messages } from './batch_modify_messages/index.js';
import { create_filter } from './create_filter/index.js';
import { delete_draft } from './delete_draft/index.js';
import { delete_filter } from './delete_filter/index.js';
import { delete_label } from './delete_label/index.js';
import { delete_message } from './delete_message/index.js';
import { delete_thread } from './delete_thread/index.js';
import { download_attachment } from './download_attachment/index.js';
import { get_auto_forwarding } from './get_auto_forwarding/index.js';
import { get_draft } from './get_draft/index.js';
import { get_filter } from './get_filter/index.js';
import { get_imap } from './get_imap/index.js';
import { get_label } from './get_label/index.js';
import { get_language } from './get_language/index.js';
import { get_message } from './get_message/index.js';
import { get_pop } from './get_pop/index.js';
import { get_vacation } from './get_vacation/index.js';
import { list_filters } from './list_filters/index.js';
import { list_messages } from './list_messages/index.js';
import { send_draft } from './send_draft/index.js';
import { send_message } from './send_message/index.js';
import { trash_message } from './trash_message/index.js';
import { trash_thread } from './trash_thread/index.js';
import { untrash_message } from './untrash_message/index.js';
import { untrash_thread } from './untrash_thread/index.js';
import { update_draft } from './update_draft/index.js';
import { update_imap } from './update_imap/index.js';
import { update_label } from './update_label/index.js';
import { update_language } from './update_language/index.js';
import { update_pop } from './update_pop/index.js';
import { update_vacation } from './update_vacation/index.js';

/**
 * REST-sourced operations (beyond the MCP toolset), sourced from
 * `developers.google.com/workspace/gmail/api/reference/rest`. Same wire surface
 * as tools; merged into the registry by the server. Removals (reversible
 * ones included), sends, and standing side effects carry `destructiveHint`;
 * see EXTENDING.md's annotation rubric.
 */
export const methods = {
  // messages
  get_message,
  list_messages,
  send_message,
  trash_message,
  untrash_message,
  delete_message,
  download_attachment,
  batch_modify_messages,
  batch_delete_messages,
  // drafts
  get_draft,
  update_draft,
  delete_draft,
  send_draft,
  // labels
  get_label,
  update_label,
  delete_label,
  // threads
  trash_thread,
  untrash_thread,
  delete_thread,
  // filters
  create_filter,
  get_filter,
  list_filters,
  delete_filter,
  // account settings
  get_vacation,
  update_vacation,
  get_auto_forwarding,
  get_imap,
  update_imap,
  get_pop,
  update_pop,
  get_language,
  update_language,
} satisfies Record<string, AnyOperation<gmail_v1.Gmail>>;
