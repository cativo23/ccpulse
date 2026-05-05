import { describe, it, expect } from 'vitest';
import { buildContextBar, formatGitChanges, SEP, SEP_MINIMAL } from '../../src/render/shared.js';
import { createColors, stripAnsi } from '../../src/render/colors.js';
import type { GitStatus } from '../../src/types.js';

const c = createColors('named');


describe('buildContextBar', () => {
  it('uses 20 segments by default', () => {
    const bar = stripAnsi(buildContextBar(50, c));
    expect(bar).toContain('50%');
    // Default format: bar pct
    expect(bar).toMatch(/░ 50%/);
  });

  it('supports custom segment count', () => {
    const bar10 = stripAnsi(buildContextBar(50, c, { segments: 10 }));
    const barDefault = stripAnsi(buildContextBar(50, c));
    // 10-segment bar is shorter than 20-segment
    expect(bar10.length).toBeLessThan(barDefault.length);
  });

  it('shows decimal for pct < 10', () => {
    const bar = stripAnsi(buildContextBar(5, c));
    expect(bar).toContain('5.0%');
  });

  it('shows integer for pct >= 10', () => {
    const bar = stripAnsi(buildContextBar(55, c));
    expect(bar).toContain('55%');
    expect(bar).not.toContain('55.0%');
  });

  it('shows skull icon at >=80%', () => {
    const bar = buildContextBar(85, c);
    expect(bar).toContain('\uEE15'); // skull icon
  });

  it('shows fire icon at 65-79%', () => {
    const bar = buildContextBar(70, c);
    expect(bar).toContain('\uF06D'); // fire icon
  });

  it('hides icons when showIcons=false', () => {
    const bar = buildContextBar(85, c, { showIcons: false });
    expect(bar).not.toContain('\uEE15');
    const bar70 = buildContextBar(70, c, { showIcons: false });
    expect(bar70).not.toContain('\uF06D');
  });

  it('uses 20 segments at cols >= 100 (adaptive default)', () => {
    const bar100 = stripAnsi(buildContextBar(50, c, { cols: 120 }));
    const barDefault = stripAnsi(buildContextBar(50, c));
    expect(bar100.length).toBe(barDefault.length);
  });

  it('uses 12 segments at cols=60-99 (adaptive)', () => {
    const bar60 = stripAnsi(buildContextBar(50, c, { cols: 60 }));
    const bar100 = stripAnsi(buildContextBar(50, c, { cols: 120 }));
    // 12-segment bar is shorter than 20-segment
    expect(bar60.length).toBeLessThan(bar100.length);
  });

  it('uses 8 segments at cols < 60 (adaptive)', () => {
    const bar50 = stripAnsi(buildContextBar(50, c, { cols: 59 }));
    const bar60 = stripAnsi(buildContextBar(50, c, { cols: 60 }));
    // 8-segment bar is shorter than 12-segment
    expect(bar50.length).toBeLessThan(bar60.length);
  });

  it('pins exact bar lengths at boundaries (regression guard)', () => {
    // The bar prefix counts filled+empty cells; the rest is " 50%" suffix.
    const cellsAt = (cols: number) => {
      const out = stripAnsi(buildContextBar(50, c, { cols }));
      const m = out.match(/^[█░]+/);
      return m ? m[0].length : 0;
    };
    expect(cellsAt(100)).toBe(20); // exact boundary: ≥100 → 20
    expect(cellsAt(99)).toBe(12);  // one below → 12
    expect(cellsAt(60)).toBe(12);  // exact boundary: ≥60 → 12
    expect(cellsAt(59)).toBe(8);   // one below → 8
  });
});

describe('formatGitChanges', () => {
  it('formats staged as +', () => {
    const git: GitStatus = { branch: 'main', staged: 3, modified: 0, untracked: 0 };
    const parts = formatGitChanges(git, c);
    expect(stripAnsi(parts[0])).toBe('+3');
  });

  it('formats modified as ! (not ~)', () => {
    const git: GitStatus = { branch: 'main', staged: 0, modified: 2, untracked: 0 };
    const parts = formatGitChanges(git, c);
    expect(stripAnsi(parts[0])).toBe('!2');
  });

  it('formats untracked as ?', () => {
    const git: GitStatus = { branch: 'main', staged: 0, modified: 0, untracked: 5 };
    const parts = formatGitChanges(git, c);
    expect(stripAnsi(parts[0])).toBe('?5');
  });

  it('returns empty array when no changes', () => {
    const git: GitStatus = { branch: 'main', staged: 0, modified: 0, untracked: 0 };
    expect(formatGitChanges(git, c)).toEqual([]);
  });

  it('returns all parts in order: staged, modified, untracked', () => {
    const git: GitStatus = { branch: 'main', staged: 1, modified: 2, untracked: 3 };
    const parts = formatGitChanges(git, c).map(stripAnsi);
    expect(parts).toEqual(['+1', '!2', '?3']);
  });
});

describe('buildContextBar — compact hint', () => {
  it('shows /compact? hint at critical-(critical+5)% (default 85-89%)', () => {
    const bar = stripAnsi(buildContextBar(87, c));
    expect(bar).toContain('/compact?');
    expect(bar).not.toContain('/compact!');
  });

  it('shows /compact! hint at >= critical+5% (default 90%+)', () => {
    const bar = stripAnsi(buildContextBar(95, c));
    expect(bar).toContain('/compact!');
  });

  it('does not show compact hint below critical (default 85%)', () => {
    const bar = stripAnsi(buildContextBar(80, c));
    expect(bar).not.toContain('/compact');
  });

  it('shows /compact? at exactly critical (default 85%) — boundary inclusive', () => {
    const bar = stripAnsi(buildContextBar(85, c));
    expect(bar).toContain('/compact?');
    expect(bar).not.toContain('/compact!');
  });

  it('shows /compact! at exactly critical+5 (default 90%) — boundary inclusive', () => {
    const bar = stripAnsi(buildContextBar(90, c));
    expect(bar).toContain('/compact!');
  });

  it('hides compact hint when showHint=false', () => {
    const bar = stripAnsi(buildContextBar(95, c, { showHint: false }));
    expect(bar).not.toContain('/compact');
  });
});

describe('buildContextBar — plain mode (powerline)', () => {
  it('emits no inline color codes for the bar cells when plain=true', () => {
    const out = buildContextBar(50, c, { plain: true, showHint: false, showIcons: false });
    // First 20 chars (the bar itself) should be raw glyphs, no escape sequences.
    // Find the first space (separates bar from %); bar substring is everything before.
    const spaceIdx = out.indexOf(' ');
    const barSlice = out.slice(0, spaceIdx);
    expect(barSlice).not.toMatch(/\x1b\[/);
  });

  it('replaces full resets with bg-preserving partial reset', () => {
    // The colored % still wraps with the named-ANSI reset (\x1b[0m). In plain
    // mode that gets rewritten to \x1b[39;22;25m so the caller's bg flows
    // through. Verify no full \x1b[0m survives.
    const out = buildContextBar(85, c, { plain: true });
    expect(out).not.toContain('\x1b[0m');
    expect(out).toContain('\x1b[39;22;25m');
  });

  it('keeps the percentage value colored', () => {
    // 70% triggers `orange` (`\x1b[38;5;208m`); 85% would trigger blinkRed.
    const out = buildContextBar(70, c, { plain: true });
    expect(out).toContain('\x1b[38;5;208m');
  });

  it('classic mode (plain=false) is unchanged — still uses \\x1b[0m', () => {
    const out = buildContextBar(50, c, { plain: false });
    expect(out).toContain('\x1b[0m');
  });
});

describe('buildContextBar — configurable thresholds', () => {
  it('respects custom warningThreshold for fire icon', () => {
    // With warning=50, fire should show at 50% (no longer green/yellow zone)
    const bar = buildContextBar(50, c, { warningThreshold: 50, criticalThreshold: 90 });
    expect(bar).toContain(''); // fire icon
  });

  it('respects custom criticalThreshold for skull icon', () => {
    // With critical=60, skull should show at 60%
    const bar = buildContextBar(60, c, { warningThreshold: 30, criticalThreshold: 60 });
    expect(bar).toContain(''); // skull icon
  });

  it('color transitions to orange at custom warning threshold', () => {
    // With warning=40, pct=45 should be orange (\x1b[38;5;208m), not yellow
    const bar = buildContextBar(45, c, { warningThreshold: 40, criticalThreshold: 80 });
    expect(bar).toContain('\x1b[38;5;208m');
  });

  it('color transitions to blinkRed at custom critical threshold', () => {
    // With critical=50, pct=55 should be blinkRed (\x1b[5;31m)
    const bar = buildContextBar(55, c, { warningThreshold: 30, criticalThreshold: 50 });
    expect(bar).toContain('\x1b[5;31m');
  });

  it('default thresholds (70/85) preserved when opts omitted', () => {
    // pct=72 → fire icon (>=70), still orange (<85)
    const bar = buildContextBar(72, c);
    expect(bar).toContain('');
    expect(bar).not.toContain('');
    // pct=86 → skull icon (>=85)
    const skullBar = buildContextBar(86, c);
    expect(skullBar).toContain('');
  });
});

describe('buildContextBar — depletion ETA', () => {
  // Anchor scenario: 30% used over 60min → rate 0.5%/min → 70% remaining → 140 min ETA = 2h20m.
  const baseDuration = 60 * 60_000; // 60 minutes

  it('appends ETA when toggle is on and gates pass', () => {
    const bar = stripAnsi(buildContextBar(30, c, { showEta: true, durationMs: baseDuration }));
    expect(bar).toContain('· ~2h20m left');
  });

  it('omits ETA when toggle is off', () => {
    const bar = stripAnsi(buildContextBar(30, c, { showEta: false, durationMs: baseDuration }));
    expect(bar).not.toContain('left');
  });

  it('omits ETA when durationMs < 60s (insufficient session data)', () => {
    const bar = stripAnsi(buildContextBar(30, c, { showEta: true, durationMs: 30_000 }));
    expect(bar).not.toContain('left');
  });

  it('omits ETA when used percentage is 0 (no fill rate yet)', () => {
    const bar = stripAnsi(buildContextBar(0, c, { showEta: true, durationMs: baseDuration }));
    expect(bar).not.toContain('left');
  });

  it('omits ETA when computed rate < 0.01 %/min', () => {
    // 0.5% used over 100 minutes → 0.005 %/min → below the 0.01 floor.
    const bar = stripAnsi(buildContextBar(0.5, c, { showEta: true, durationMs: 100 * 60_000 }));
    expect(bar).not.toContain('left');
  });

  it('omits ETA when computed eta > 24h (effectively infinite)', () => {
    // 1% used over 60 minutes → 0.0167 %/min, remaining 99% → ~5940 min eta — over the 1440 cap.
    const bar = stripAnsi(buildContextBar(1, c, { showEta: true, durationMs: 60 * 60_000 }));
    expect(bar).not.toContain('left');
  });

  it('omits ETA when durationMs is undefined', () => {
    const bar = stripAnsi(buildContextBar(30, c, { showEta: true }));
    expect(bar).not.toContain('left');
  });

  // Exact-boundary gate tests — verify the inclusive/exclusive edges of each gate.
  it('shows ETA when durationMs === 60_000 exactly (MIN_SESSION_MS boundary, inclusive)', () => {
    // pct=10 over 60s → rate=10%/min, remaining=90 → eta=9min.
    const bar = stripAnsi(buildContextBar(10, c, { showEta: true, durationMs: 60_000 }));
    expect(bar).toContain('· ~9m left');
  });

  // NOTE: rate === MIN_UTILIZATION_RATE (0.01 %/min) is not independently testable in isolation —
  // at that minimum rate, any non-trivial remaining_pct produces eta > MAX_DISPLAY_MINUTES (1440),
  // so the max-eta gate masks the rate-gate boundary. The two gates are mathematically coupled
  // (eta = remaining / rate), so isolating one boundary requires violating the other.

  it('shows ETA when computed eta === 1440 minutes exactly (MAX_DISPLAY_MINUTES boundary, inclusive)', () => {
    // pct=20 over 360min → rate=0.0556 %/min, remaining=80 → eta=80/0.0556=1440min=24h.
    const bar = stripAnsi(buildContextBar(20, c, { showEta: true, durationMs: 360 * 60_000 }));
    expect(bar).toContain('· ~24h left');
  });

  it('uses the dim color helper for the ETA text', () => {
    // Dim wraps with \x1b[2m … \x1b[0m. Verify the suffix is wrapped.
    const bar = buildContextBar(30, c, { showEta: true, durationMs: baseDuration });
    expect(bar).toContain('\x1b[2m· ~2h20m left\x1b[0m');
  });
});

describe('SEP constants', () => {
  it('SEP uses Unicode pipe', () => {
    expect(SEP).toContain('\u2502');
  });

  it('SEP_MINIMAL uses ASCII pipe', () => {
    expect(SEP_MINIMAL).toContain('|');
    expect(SEP_MINIMAL).not.toContain('\u2502');
  });
});
