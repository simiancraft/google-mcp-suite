import { service as calendar } from '../calendar/service.js';
import { service as docs } from '../docs/service.js';
import { service as drive } from '../drive/service.js';
import { service as gmail } from '../gmail/service.js';
import { createServer, type ServiceDefinition } from '../lib/server.js';
import { service as sheets } from '../sheets/service.js';
import type { ServiceFactory } from './host.js';

/**
 * Erase a definition's client type into a per-account server factory. The host
 * keeps a heterogeneous set of services, and `ServiceDefinition<Client>` is
 * invariant in `Client` (the handlers consume it, the factory produces it), so
 * the generic closes over the type here and the host never sees it.
 */
export function factory<Client>(definition: ServiceDefinition<Client>): ServiceFactory {
  return (account) => createServer(definition, account);
}

/**
 * Every service the host serves, keyed by its path segment. The host knows the
 * services (like `doctor` and `suite`); no service imports it.
 */
export const services: Record<string, ServiceFactory> = {
  gmail: factory(gmail),
  calendar: factory(calendar),
  drive: factory(drive),
  docs: factory(docs),
  sheets: factory(sheets),
};
