import { describe, it, expect } from 'vitest';
import { isUnderAllowedRoot } from '../../src/parsers/transcript.js';

describe('isUnderAllowedRoot', () => {
  it('accepts the root itself', () => {
    expect(isUnderAllowedRoot('/tmp', ['/tmp'])).toBe(true);
    expect(isUnderAllowedRoot('/home/alice', ['/home/alice'])).toBe(true);
  });

  it('accepts paths strictly under a root', () => {
    expect(isUnderAllowedRoot('/tmp/foo.jsonl', ['/tmp'])).toBe(true);
    expect(isUnderAllowedRoot('/tmp/sub/dir/file', ['/tmp'])).toBe(true);
    expect(isUnderAllowedRoot('/home/alice/transcripts/x.jsonl', ['/home/alice'])).toBe(true);
  });

  it('rejects sibling-prefix paths (classic startsWith bypass)', () => {
    // /tmpattacker shares the "/tmp" string prefix but is not under /tmp.
    expect(isUnderAllowedRoot('/tmpattacker/payload.jsonl', ['/tmp'])).toBe(false);
    expect(isUnderAllowedRoot('/home/aliceevil/payload.jsonl', ['/home/alice'])).toBe(false);
    expect(isUnderAllowedRoot('/tmproot/x', ['/tmp'])).toBe(false);
  });

  it('rejects fully unrelated paths', () => {
    expect(isUnderAllowedRoot('/etc/passwd', ['/tmp', '/home/alice'])).toBe(false);
    expect(isUnderAllowedRoot('/var/log/x', ['/tmp'])).toBe(false);
  });

  it('rejects parent-traversal attempts after resolution', () => {
    // path.relative on resolved inputs handles ../ correctly. The caller is
    // expected to pass an already-resolved absolute path.
    expect(isUnderAllowedRoot('/etc/passwd', ['/tmp'])).toBe(false);
  });

  it('accepts when any of multiple roots matches', () => {
    expect(isUnderAllowedRoot('/home/alice/x', ['/tmp', '/home/alice'])).toBe(true);
    expect(isUnderAllowedRoot('/tmp/x', ['/tmp', '/home/alice'])).toBe(true);
  });

  it('handles trailing-separator variations on the root', () => {
    expect(isUnderAllowedRoot('/tmp/x', ['/tmp/'])).toBe(true);
    expect(isUnderAllowedRoot('/tmpattacker/x', ['/tmp/'])).toBe(false);
  });
});
