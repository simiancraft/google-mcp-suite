import { describe, expect, test } from 'bun:test';

const ENTRY = new URL('./index.ts', import.meta.url).pathname;

async function runDoctor(...args: string[]) {
  const proc = Bun.spawn(['bun', 'run', ENTRY, ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { stdout, stderr, exitCode };
}

describe('doctor usage stream split', () => {
  test('an unknown command sends usage to stderr, leaves stdout clean, and exits 1', async () => {
    const { stdout, stderr, exitCode } = await runDoctor('bogus');
    expect(exitCode).toBe(1);
    // The failure path must not pollute stdout: a pipe, or an agent reading tool
    // output, should receive nothing here, not the usage text.
    expect(stdout).toBe('');
    expect(stderr).toContain('Unknown command: bogus');
    expect(stderr).toContain('Usage:');
  });

  test('help sends usage to stdout, leaves stderr clean, and exits 0', async () => {
    const { stdout, stderr, exitCode } = await runDoctor('help');
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Usage:');
    expect(stdout).toContain('--port <n>');
    expect(stdout).toContain('If you are an AI agent, run the auth command yourself;');
    expect(stderr).toBe('');
  });
});
