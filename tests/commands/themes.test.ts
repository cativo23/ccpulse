import { describe, it, expect } from 'vitest';
import { parseThemesArgs, runThemesCommand } from '../../src/commands/themes.js';
import { stripAnsi } from '../../src/render/colors.js';
import { THEMES } from '../../src/themes.js';

const argv = (...rest: string[]) => ['node', 'lumira', 'themes', ...rest];

describe('parseThemesArgs', () => {
  it('defaults to list when no sub-subcommand given', () => {
    expect(parseThemesArgs(argv()).sub).toBe('list');
  });

  it('recognises preview subcommand', () => {
    expect(parseThemesArgs(argv('preview', 'dracula')).sub).toBe('preview');
    expect(parseThemesArgs(argv('preview', 'dracula')).themeName).toBe('dracula');
  });

  it('recognises help variants', () => {
    expect(parseThemesArgs(argv('help')).sub).toBe('help');
    expect(parseThemesArgs(argv('--help')).sub).toBe('help');
    expect(parseThemesArgs(argv('-h')).sub).toBe('help');
  });

  it('parses --powerline flag', () => {
    expect(parseThemesArgs(argv('preview', 'nord', '--powerline')).powerline).toBe(true);
  });

  it('parses --all flag', () => {
    expect(parseThemesArgs(argv('preview', '--all')).all).toBe(true);
  });

  it('parses --style=<name> and implies --powerline', () => {
    const args = parseThemesArgs(argv('preview', 'nord', '--style=flame'));
    expect(args.powerlineStyle).toBe('flame');
    expect(args.powerline).toBe(true);
  });

  it('ignores invalid --style values', () => {
    const args = parseThemesArgs(argv('preview', 'nord', '--style=bogus'));
    expect(args.powerlineStyle).toBeUndefined();
  });

  it('only takes the first positional as theme name', () => {
    const args = parseThemesArgs(argv('preview', 'dracula', 'nord'));
    expect(args.themeName).toBe('dracula');
  });
});

describe('runThemesCommand — list', () => {
  it('lists all 7 built-in themes by default', () => {
    const out = stripAnsi(runThemesCommand(argv()));
    for (const name of Object.keys(THEMES)) {
      expect(out).toContain(name);
    }
  });

  it("includes a hint about 'preview <name>'", () => {
    expect(runThemesCommand(argv('list'))).toContain('preview');
  });
});

describe('runThemesCommand — help', () => {
  it('lists subcommands and theme names', () => {
    const out = runThemesCommand(argv('help'));
    expect(out).toContain('USAGE');
    expect(out).toContain('preview');
    expect(out).toContain('--powerline');
  });
});

describe('runThemesCommand — preview', () => {
  it('returns rendered output for a known theme', () => {
    const out = runThemesCommand(argv('preview', 'dracula'));
    // Banner mentions the theme name
    expect(out).toContain('dracula');
    // The preview includes mock content like the project name
    expect(stripAnsi(out)).toContain('lumira');
  });

  it('handles unknown theme with a helpful error', () => {
    const out = runThemesCommand(argv('preview', 'bogus-theme-xyz'));
    expect(out).toContain('unknown theme');
    expect(out).toContain('Available:');
  });

  it('handles missing theme name with a helpful error', () => {
    const out = runThemesCommand(argv('preview'));
    expect(out).toContain('missing theme name');
  });

  it('renders all themes when --all is given', () => {
    const out = runThemesCommand(argv('preview', '--all'));
    for (const name of Object.keys(THEMES)) {
      expect(out).toContain(name);
    }
  });

  it('--powerline produces different output than classic', () => {
    const classic = runThemesCommand(argv('preview', 'dracula'));
    const powerline = runThemesCommand(argv('preview', 'dracula', '--powerline'));
    expect(classic).not.toBe(powerline);
    // Powerline output should contain a bg escape (\x1b[48;…)
    expect(powerline).toMatch(/\x1b\[48;/);
  });

  it('--style=flame implies powerline mode', () => {
    const out = runThemesCommand(argv('preview', 'dracula', '--style=flame'));
    expect(out).toMatch(/\x1b\[48;/);
    expect(out).toContain('flame');
  });
});
