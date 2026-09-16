import { describe, expect, it } from 'bun:test';
import { DEFAULT_IDLE_MINUTES, DEFAULT_PORT, parse, usage } from './cli.js';

describe('parse', () => {
  it('defaults to loopback, the default port, and the roster', () => {
    expect(parse([], {})).toEqual({
      port: DEFAULT_PORT,
      hostname: '127.0.0.1',
      idleMs: DEFAULT_IDLE_MINUTES * 60_000,
      token: undefined,
      accounts: undefined,
    });
  });

  it('reads every flag, with --account repeatable', () => {
    expect(
      parse(
        [
          '--port',
          '9000',
          '--host',
          '0.0.0.0',
          '--idle',
          '30',
          '--token',
          's3',
          '--account',
          'a',
          '--account',
          'b',
        ],
        {},
      ),
    ).toEqual({
      port: 9000,
      hostname: '0.0.0.0',
      idleMs: 30 * 60_000,
      token: 's3',
      accounts: ['a', 'b'],
    });
  });

  it('takes the token from the environment when the flag is absent', () => {
    const cli = parse([], { GOOGLE_MCP_HOST_TOKEN: 'from-env' });
    expect('token' in cli && cli.token).toBe('from-env');
  });

  it('prefers the flag over the environment', () => {
    const cli = parse(['--token', 'flag'], { GOOGLE_MCP_HOST_TOKEN: 'from-env' });
    expect('token' in cli && cli.token).toBe('flag');
  });

  it('returns the usage text on --help and -h', () => {
    expect(parse(['--help'], {})).toEqual({ help: usage });
    expect(parse(['-h'], {})).toEqual({ help: usage });
  });

  it('rejects a non-integer or negative port and idle', () => {
    expect(() => parse(['--port', 'abc'], {})).toThrow(/--port must be a non-negative integer/);
    expect(() => parse(['--port', '-1'], {})).toThrow(/--port/);
    expect(() => parse(['--idle', '1.5'], {})).toThrow(/--idle must be a non-negative integer/);
  });

  it('rejects unknown flags and positionals', () => {
    expect(() => parse(['--nope'], {})).toThrow();
    expect(() => parse(['gmail'], {})).toThrow();
  });

  it('documents every flag and the path shape', () => {
    for (const flag of ['--port', '--host', '--idle', '--token', '--account', '--help']) {
      expect(usage).toContain(flag);
    }
    expect(usage).toContain('/<account>/<service>');
    expect(usage).toContain('GOOGLE_MCP_HOST_TOKEN');
  });
});
