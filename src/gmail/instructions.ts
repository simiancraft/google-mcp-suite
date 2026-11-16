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

export const instructions =
  identityInstructions('Gmail account') +
  vocabularyInstructions() +
  untrustedContentInstructions() +
  'Heed the hints: sends are irreversible and reach external recipients; ' +
  'permanent deletes bypass the trash entirely (trash_* and untrash_* are ' +
  'the reversible pair, and Gmail purges trashed mail after about 30 days); ' +
  'create_filter installs a standing rule that keeps acting on future mail. ' +
  'A vacation responder auto-replies to real senders once enabled, and the ' +
  'settings updates replace the whole setting: fields left out are reset, ' +
  'so read the current value first. ' +
  'Enabling POP or IMAP opens the mailbox to other clients. ' +
  'Sending identity updates and patches change only the primary address display name, Reply-To address, HTML signature, or default From selection; custom alias changes and SMTP relay configuration require delegated service accounts. ' +
  'Forwarding address reads show destinations that may receive account mail without enabling forwarding; creating or removing destinations and managing delegates are unavailable under user OAuth. ' +
  'Start history reads with historyId from get_profile, a message, a thread, or a completed history response; a 404 requires a full resync. ' +
  'Message insert and import store unsent mail and can create duplicates; import can add calendar meetings, and deleted stores only in Workspace Vault. ' +
  'Hosted S/MIME requires administrator enablement and Workspace Frontline Plus, Enterprise Plus, Education Fundamentals, Education Standard, or Education Plus; writes support only the primary address. Client-side encryption requires administrator enablement and Workspace Frontline Plus, Enterprise Plus, Education Standard, or Education Plus. Users managing their own CSE identities and keypairs, instead of delegated administrators managing other users, must have hardware key encryption turned on and configured, including the Assured Controls or Assured Controls Plus add-on. ' +
  'Attachment bytes are returned base64url-encoded in JSON. ' +
  'To attach files, pass the attachments parameter of create_draft, ' +
  'update_draft, or send_message: each entry names a local file path this ' +
  'server process reads when it assembles the outgoing message.';
