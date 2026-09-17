import { describe, expect, it } from 'bun:test';
import { fakeCredentials } from '../lib/testing/fake-credentials.js';
import { service } from './service.js';

describe('drive service definition', () => {
  it('names the service and carries its merged operations and instructions', () => {
    expect(service.name).toBe('drive');
    expect(Object.keys(service.operations).length).toBeGreaterThan(0);
    expect(service.instructions).toBeTruthy();
    expect(service.runAuth).toBeDefined();
    expect(service.staleCredentials).toBeDefined();
  });

  it('builds the Drive client for an account from its stored token', async () => {
    const restore = fakeCredentials('someone');
    try {
      const client = await service.client('someone');
      // `about`, not `files`: the doctor probe test mocks @googleapis/drive for
      // the whole run with only the resource its probe touches.
      expect(client.about).toBeDefined();
    } finally {
      restore();
    }
  });
});
