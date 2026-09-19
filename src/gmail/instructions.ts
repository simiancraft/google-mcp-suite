/**
 * Served in the MCP initialize result; see `ServerOptions.instructions` in
 * src/lib/server.ts. A standalone module so tests can pin the content without
 * booting the server (index.ts's import side effect is `await server()`).
 */
import {
  identityInstructions,
  untrustedContentInstructions,
  vocabularyInstructions,
} from '../lib/instructions.js';

import { MESSAGE_CAP_LABEL } from './lib/limits.js';

export const instructions =
  identityInstructions('Gmail account') +
  vocabularyInstructions() +
  untrustedContentInstructions() +
  'Heed the hints: sends are irreversible and reach external recipients; ' +
  'permanent deletes bypass the trash entirely (trash_* and untrash_* are ' +
  'the reversible pair, and Gmail purges trashed mail after about 30 days); ' +
  'create_filter installs a standing rule that keeps acting on future mail. ' +
  'For compose operations, body alone also derives an HTML alternative; ' +
  'htmlBody overrides that alternative and is used unchanged. ' +
  'Attachment bytes are returned base64url-encoded in JSON. ' +
  'To attach files, pass the attachments parameter of create_draft, ' +
  'update_draft, or send_message: each entry names a local file path this ' +
  'server process reads when it assembles the outgoing message. ' +
  `Compose uploads RFC 822 media; the complete MIME-encoded message, including headers, bodies, and attachments, is capped at ${MESSAGE_CAP_LABEL}.`;
