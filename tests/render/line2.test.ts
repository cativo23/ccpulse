import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { renderLine2, formatCountdown } from '../../src/render/line2.js';
import { createColors, stripAnsi } from '../../src/render/colors.js';
import { EMPTY_GIT, EMPTY_TRANSCRIPT, DEFAULT_CONFIG, DEFAULT_DISPLAY } from '../../src/types.js';
import type { ClaudeCodeInput, RenderContext } from '../../src/types.js';
import { NERD_ICONS } from '../../src/render/icons.js';
import { normalize } from '../../src/normalize.js';

const c = createColors('named');

const baseInput: ClaudeCodeInput = {
  model: 'Claude Opus 4',
  session_id: 'test-123',
  context_window: {
    used_percentage: 55,
    remaining_percentage: 45,
    total_input_tokens: 131000,
    total_output_tokens: 25000,
  },
  cost: { total_cost_usd: 1.31, total_duration_ms: 2106000 },
  workspace: { current_dir: '/home/user/project' },
};

function makeCtx(overrides: Partial<RenderContext> = {}, inputOverride?: Partial<ClaudeCodeInput>): RenderContext {
  return {
    input: normalize({ ...baseInput, ...inputOverride }), git: EMPTY_GIT, transcript: EMPTY_TRANSCRIPT,
    tokenSpeed: null, memory: null, gsd: null, mcp: null, cols: 120,
    config: { ...DEFAULT_CONFIG, display: { ...DEFAULT_DISPLAY } },
    icons: NERD_ICONS,
    ...overrides,
  };
}

describe('renderLine2', () => {
  it('shows context bar with percentage', () => {
    const out = stripAnsi(renderLine2(makeCtx(), c));
    expect(out).toContain('55%');
  });

  it('shows tokens', () => {
    const out = stripAnsi(renderLine2(makeCtx(), c));
    expect(out).toContain('131k');
    expect(out).toContain('25k');
  });

  it('shows cost', () => {
    const out = stripAnsi(renderLine2(makeCtx(), c));
    expect(out).toContain('$1.31');
  });

  it('shows burn rate when duration > 60s', () => {
    const out = stripAnsi(renderLine2(makeCtx(), c));
    expect(out).toContain('/h');
  });

  it('does not show burn rate when duration <= 60s', () => {
    const inputOverride = { cost: { ...baseInput.cost, total_duration_ms: 30000 } };
    const out = stripAnsi(renderLine2(makeCtx({}, inputOverride as any), c));
    expect(out).not.toContain('/h');
  });

  it('does not show rate limits below 50%', () => {
    const inputOverride = { rate_limits: { five_hour: { used_percentage: 30 } } };
    const out = stripAnsi(renderLine2(makeCtx({}, inputOverride), c));
    expect(out).not.toContain('5h');
  });

  it('shows rate limits at >=50%', () => {
    const inputOverride = { rate_limits: { five_hour: { used_percentage: 72 } } };
    const out = stripAnsi(renderLine2(makeCtx({}, inputOverride), c));
    expect(out).toContain('72%');
    expect(out).toContain('5h');
  });

  it('shows vim mode', () => {
    const inputOverride = { vim: { mode: 'i' } };
    const out = stripAnsi(renderLine2(makeCtx({}, inputOverride), c));
    expect(out).toContain('[i]');
  });

  it('hides effort when medium', () => {
    const out = stripAnsi(renderLine2(makeCtx({ transcript: { ...EMPTY_TRANSCRIPT, thinkingEffort: 'medium' } }), c));
    expect(out).not.toContain('^medium');
  });

  it('shows effort when high', () => {
    const out = stripAnsi(renderLine2(makeCtx({ transcript: { ...EMPTY_TRANSCRIPT, thinkingEffort: 'high' } }), c));
    expect(out).toContain('^high');
  });

  it('shows effort when low', () => {
    const out = stripAnsi(renderLine2(makeCtx({ transcript: { ...EMPTY_TRANSCRIPT, thinkingEffort: 'low' } }), c));
    expect(out).toContain('^low');
  });

  it('shows cache hit rate when cache_read_input_tokens present', () => {
    const inputOverride = { context_window: { ...baseInput.context_window, cache_read_input_tokens: 100000, total_input_tokens: 131000 } };
    const out = stripAnsi(renderLine2(makeCtx({}, inputOverride), c));
    expect(out).toContain('cache');
    expect(out).toContain('76%');
  });

  it('reads cache hit rate from nested current_usage (modern 2.1.x payload)', () => {
    const inputOverride = {
      context_window: {
        ...baseInput.context_window,
        current_usage: {
          input_tokens: 50000,
          cache_read_input_tokens: 80000,
          cache_creation_input_tokens: 20000,
        },
      },
    };
    const out = stripAnsi(renderLine2(makeCtx({}, inputOverride), c));
    // 80000 / (50000 + 80000 + 20000) = 53%
    expect(out).toContain('cache 53%');
  });

  it('caps cache hit rate at 100% when cache_read exceeds total_input (long sessions)', () => {
    const inputOverride = { context_window: { ...baseInput.context_window, cache_read_input_tokens: 5000000, total_input_tokens: 957000 } };
    const out = stripAnsi(renderLine2(makeCtx({}, inputOverride), c));
    expect(out).toContain('cache 100%');
    expect(out).not.toMatch(/cache [1-9]\d{3,}%|cache [2-9]\d{2}%|cache 1[1-9]\d%/);
  });

  it('hides cache metrics when cache_read is zero', () => {
    const inputOverride = { context_window: { ...baseInput.context_window, cache_read_input_tokens: 0, total_input_tokens: 957000 } };
    const out = stripAnsi(renderLine2(makeCtx({}, inputOverride), c));
    expect(out).not.toContain('cache');
  });

  it('hides cache metrics when toggled off', () => {
    const inputOverride = { context_window: { ...baseInput.context_window, cache_read_input_tokens: 100000 } };
    const out = stripAnsi(renderLine2(makeCtx({ config: { ...DEFAULT_CONFIG, display: { ...DEFAULT_DISPLAY, cacheMetrics: false } } }, inputOverride), c));
    expect(out).not.toContain('cache');
  });

  it('shows MCP server count', () => {
    const mcp = { servers: [{ name: 'a', status: 'ok' as const }, { name: 'b', status: 'ok' as const }] };
    const out = stripAnsi(renderLine2(makeCtx({ mcp }), c));
    expect(out).toContain('MCP 2');
  });

  it('shows MCP errors in red', () => {
    const mcp = { servers: [{ name: 'a', status: 'ok' as const }, { name: 'b', status: 'error' as const }] };
    const out = stripAnsi(renderLine2(makeCtx({ mcp }), c));
    expect(out).toContain('MCP 1/2');
  });

  it('uses context_window_size as capacity instead of back-deriving (≥ 2.1.x)', () => {
    // total_input_tokens (957k) is cumulative; real context is 18% of 1M = 180k
    const inputOverride = {
      context_window: {
        ...baseInput.context_window,
        used_percentage: 18,
        total_input_tokens: 957000,
        context_window_size: 1000000,
      },
    };
    const out = stripAnsi(renderLine2(makeCtx({}, inputOverride), c));
    expect(out).toContain('180k/1.0M');
    expect(out).not.toContain('957k/');
  });

  it('shows contextTokens estimate', () => {
    const inputOverride = { context_window: { ...baseInput.context_window, used_percentage: 50, total_input_tokens: 100000 } };
    const out = stripAnsi(renderLine2(makeCtx({}, inputOverride), c));
    expect(out).toContain('100k/200k');
  });

  it('drops trailing segments via fitSegments when cols is narrow', () => {
    // At cols=60, many segments should still fit within the terminal width
    const inputOverride = {
      rate_limits: { five_hour: { used_percentage: 75 } },
      context_window: { ...baseInput.context_window, cache_read_input_tokens: 80000 },
    };
    const out = stripAnsi(renderLine2(makeCtx({ cols: 60 }, inputOverride), c));
    expect(out.length).toBeLessThanOrEqual(64); // fitSegments enforces cols - 4
    // High-priority segment (context bar) survives; low-priority rate limit drops.
    expect(out).toMatch(/\d+%/); // context % is present
    expect(out).not.toContain('75%(5h)'); // rate-limit segment got dropped
  });
});

describe('renderLine2 — rate-limit depletion ETA (5h)', () => {
  // Anchor "now" so ETA math is deterministic regardless of test wall-clock.
  const NOW = 1_700_000_000_000;
  const FIVE_HOUR_MS = 5 * 60 * 60 * 1000;

  beforeEach(() => vi.useFakeTimers({ now: NOW }));
  afterEach(() => vi.useRealTimers());

  // Helper: build a 5h rate-limit window where `elapsedMs` has passed since the
  // window opened. resetsAt is in seconds (matches Claude Code stdin convention).
  const fiveHourWindow = (used: number, elapsedMs: number) => {
    const windowStartMs = NOW - elapsedMs;
    const resetsAtSec = (windowStartMs + FIVE_HOUR_MS) / 1000;
    return { five_hour: { used_percentage: used, resets_at: resetsAtSec } };
  };

  const ctxWithEta = (rateLimits: any) =>
    makeCtx({
      config: { ...DEFAULT_CONFIG, display: { ...DEFAULT_DISPLAY, rateLimitEta: true } },
    }, { rate_limits: rateLimits });

  it('appends ETA at 75% with 1h elapsed (rate=1.25%/min → eta=20m)', () => {
    // 75 / 60min = 1.25%/min; remaining 25 / 1.25 = 20 min
    const out = stripAnsi(renderLine2(ctxWithEta(fiveHourWindow(75, 60 * 60_000)), c));
    expect(out).toContain('75%(5h)');
    expect(out).toContain('· ~20m left');
  });

  it('hides ETA when display.rateLimitEta is false (default)', () => {
    const out = stripAnsi(renderLine2(makeCtx({}, { rate_limits: fiveHourWindow(75, 60 * 60_000) }), c));
    expect(out).toContain('75%(5h)');
    expect(out).not.toContain('left');
  });

  it('shows ETA at 51% with 4.5h elapsed (rate ≈ 0.189%/min → eta ≈ 4h19m)', () => {
    // 51 / 270min ≈ 0.1889 %/min; remaining 49 / 0.1889 ≈ 259.4 min ≈ 4h19m
    const out = stripAnsi(renderLine2(ctxWithEta(fiveHourWindow(51, 4.5 * 60 * 60_000)), c));
    expect(out).toMatch(/· ~4h19m left/);
  });

  it('hides ETA when resetsAt is in the past (window already reset between renders)', () => {
    const pastResetsSec = (NOW - 60_000) / 1000; // 1 minute ago
    const out = stripAnsi(renderLine2(
      ctxWithEta({ five_hour: { used_percentage: 75, resets_at: pastResetsSec } }),
      c,
    ));
    // 75% renders the rate-limit segment, but ETA is suppressed.
    expect(out).toContain('75%(5h)');
    expect(out).not.toContain('left');
  });

  it('does not append ETA to the 7d window (out of scope this PR)', () => {
    // 7d window with 75% used. The 5h window is absent so only 7d renders.
    const out = stripAnsi(renderLine2(
      ctxWithEta({ seven_day: { used_percentage: 75, resets_at: (NOW + FIVE_HOUR_MS) / 1000 } }),
      c,
    ));
    expect(out).toContain('75%(7d)');
    expect(out).not.toContain('left');
  });

  it('leaves existing rate-limit display unchanged when toggle is off', () => {
    const out = stripAnsi(renderLine2(
      makeCtx({}, { rate_limits: fiveHourWindow(72, 60 * 60_000) }),
      c,
    ));
    // Existing behavior: 72% with countdown (no ETA suffix).
    expect(out).toContain('72%(5h)');
    expect(out).not.toContain('left');
  });
});

describe('formatCountdown', () => {
  afterEach(() => vi.useRealTimers());

  it('returns empty string for past timestamps', () => {
    expect(formatCountdown(Date.now() - 10_000)).toBe('');
  });

  it('formats seconds correctly', () => {
    const now = 1_700_000_000_000;
    vi.useFakeTimers({ now });
    expect(formatCountdown(now + 45_000)).toBe('45s');
  });

  it('formats minutes and seconds', () => {
    const now = 1_700_000_000_000;
    vi.useFakeTimers({ now });
    expect(formatCountdown(now + 125_000)).toBe('2m05s');
  });

  it('formats hours and minutes', () => {
    const now = 1_700_000_000_000;
    vi.useFakeTimers({ now });
    expect(formatCountdown(now + 3_725_000)).toBe('1h02m');
  });

  it('treats values < 1e12 as seconds and converts to ms', () => {
    const nowMs = 1_700_000_000_000;
    const nowSec = nowMs / 1000;
    vi.useFakeTimers({ now: nowMs });
    expect(formatCountdown(nowSec + 60)).toBe('1m00s');
  });
});
