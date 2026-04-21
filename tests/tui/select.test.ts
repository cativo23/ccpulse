import { describe, it, expect } from 'vitest';
import { interactiveSelect } from '../../src/tui/select.js';
import { createMockStdin, createMockStdout } from './_mock-stdin.js';

describe('interactiveSelect — non-TTY', () => {
  it('returns null immediately when stdin is not a TTY', async () => {
    const stdin = createMockStdin(false);
    const stdout = createMockStdout();
    const result = await interactiveSelect({
      title: 'pick',
      options: [{ label: 'a', value: 'a' }, { label: 'b', value: 'b' }],
      initial: 'a',
      preview: () => 'preview',
      stdin, stdout,
    });
    expect(result).toBeNull();
  });

  it('never enters raw mode when stdin is not a TTY', async () => {
    const stdin = createMockStdin(false);
    const stdout = createMockStdout();
    await interactiveSelect({
      title: 'pick',
      options: [{ label: 'a', value: 'a' }],
      initial: 'a',
      preview: () => '',
      stdin, stdout,
    });
    expect(stdin.isRaw).toBe(false);
  });

  it('does not write to stdout when non-TTY', async () => {
    const stdin = createMockStdin(false);
    const stdout = createMockStdout();
    await interactiveSelect({
      title: 'pick',
      options: [{ label: 'a', value: 'a' }],
      initial: 'a',
      preview: () => '',
      stdin, stdout,
    });
    expect(stdout.written).toEqual([]);
  });
});
