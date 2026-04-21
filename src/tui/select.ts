import type { Readable, Writable } from 'node:stream';

export interface SelectOption<T> {
  label: string;
  value: T;
  description?: string;
  hint?: string;
  disabled?: boolean;
}

/**
 * Streams used by `interactiveSelect`. In production these default to
 * `process.stdin` / `process.stdout`; tests inject fakes.
 */
type SelectStdin = NodeJS.ReadStream | (Readable & {
  isTTY?: boolean;
  isRaw?: boolean;
  setRawMode?: (flag: boolean) => unknown;
});
type SelectStdout = NodeJS.WriteStream | (Writable & { columns?: number });

export interface SelectOpts<T> {
  title: string;
  options: SelectOption<T>[];
  initial?: T;
  preview: (focused: T) => string;
  stdin?: SelectStdin;
  stdout?: SelectStdout;
}

/**
 * Interactive single-select prompt. Resolves with the chosen value, or null
 * when stdin is not a TTY (piped input), when the user aborts (Esc / q /
 * Ctrl+C — added in Task 7), or when stdin closes.
 *
 * This is the Task 5 scaffold: only the non-TTY short-circuit is wired up.
 * Navigation, abort keys, preview rendering, and resize handling arrive in
 * Tasks 6 and 7.
 */
export async function interactiveSelect<T>(opts: SelectOpts<T>): Promise<T | null> {
  const stdin = (opts.stdin ?? process.stdin) as SelectStdin;
  if (!stdin.isTTY) return null;

  // TODO(Task 6): render loop + navigation + Enter.
  // TODO(Task 7): abort keys + stdin end + resize + cleanup.
  return null;
}
