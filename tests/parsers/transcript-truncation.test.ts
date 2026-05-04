import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  parseTranscript,
  MAX_LINES,
  _truncationWarned,
  _resetTruncationWarned,
  _clearTranscriptCache,
} from '../../src/parsers/transcript.js';

const TEST_DIR = join(tmpdir(), `lumira-truncation-${process.pid}`);

function writeJsonl(name: string, lines: number): string {
  const path = join(TEST_DIR, name);
  const entry = '{"timestamp":"2026-04-08T10:00:00Z","message":{"content":[]}}\n';
  // Build the buffer once to keep test runtime reasonable for large files.
  writeFileSync(path, entry.repeat(lines));
  return path;
}

describe('parseTranscript MAX_LINES truncation warning', () => {
  beforeEach(() => {
    _clearTranscriptCache();
    _resetTruncationWarned();
    rmSync(TEST_DIR, { recursive: true, force: true });
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterAll(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('does not warn when the transcript is under the cap', async () => {
    const path = writeJsonl('small.jsonl', 100);
    await parseTranscript(path);
    expect(_truncationWarned()).toBe(false);
  });

  it('sets the truncation flag when MAX_LINES is exceeded', async () => {
    // Write MAX_LINES + 1 lines so the truncation branch fires once.
    const path = writeJsonl('huge.jsonl', MAX_LINES + 1);
    await parseTranscript(path);
    expect(_truncationWarned()).toBe(true);
  }, 30_000);

  it('warn-once: flag stays set across multiple over-cap parses', async () => {
    const a = writeJsonl('a.jsonl', MAX_LINES + 1);
    const b = writeJsonl('b.jsonl', MAX_LINES + 1);
    await parseTranscript(a);
    expect(_truncationWarned()).toBe(true);
    // Second over-cap parse: flag stays true (the warning fired only once).
    await parseTranscript(b);
    expect(_truncationWarned()).toBe(true);
  }, 60_000);
});
