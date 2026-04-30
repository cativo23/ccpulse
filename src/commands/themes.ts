import { THEMES, THEME_DESCRIPTIONS } from '../themes.js';
import { buildPreview, type PreviewOpts } from '../tui/preview.js';
import { detectColorMode } from '../render/colors.js';
import type { HudConfig } from '../types.js';

const VALID_POWERLINE_STYLES = [
  'arrow', 'flame', 'slant', 'round', 'diamond', 'compatible', 'plain', 'auto',
] as const;

interface ThemesArgs {
  sub: 'list' | 'preview' | 'help';
  themeName?: string;
  powerline: boolean;
  powerlineStyle?: NonNullable<HudConfig['powerline']>['style'];
  all: boolean;
}

export function parseThemesArgs(argv: string[]): ThemesArgs {
  // argv is the full process.argv; the 'themes' command starts at argv[2],
  // its sub-subcommand at argv[3], remaining flags from argv[4].
  const subRaw = argv[3];
  const sub: ThemesArgs['sub'] =
    subRaw === 'preview' ? 'preview' :
    subRaw === 'help' || subRaw === '--help' || subRaw === '-h' ? 'help' :
    'list';

  let themeName: string | undefined;
  let powerline = false;
  let powerlineStyle: ThemesArgs['powerlineStyle'];
  let all = false;

  for (let i = 4; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--powerline') { powerline = true; continue; }
    if (arg === '--all') { all = true; continue; }
    const styleMatch = arg.match(/^--style=(.+)$/);
    if (styleMatch && VALID_POWERLINE_STYLES.includes(styleMatch[1] as never)) {
      powerline = true;
      powerlineStyle = styleMatch[1] as NonNullable<HudConfig['powerline']>['style'];
      continue;
    }
    if (!arg.startsWith('--') && !themeName) {
      themeName = arg;
    }
  }

  return { sub, themeName, powerline, powerlineStyle, all };
}

function listText(): string {
  const names = Object.keys(THEMES);
  const longest = Math.max(...names.map(n => n.length));
  let out = `Available themes (${names.length}):\n\n`;
  for (const name of names) {
    const desc = THEME_DESCRIPTIONS[name] ?? '';
    out += `  ${name.padEnd(longest + 2)}${desc}\n`;
  }
  out += "\nUse 'lumira themes preview <name>' to render a sample.\n";
  out += 'Add --powerline (optionally --style=<name>) for the powerline style,\n';
  out += "or --all to preview every theme in one shot (great for screenshots).\n";
  return out;
}

function helpText(): string {
  return [
    'lumira themes — list, describe, and preview built-in themes',
    '',
    'USAGE',
    '  lumira themes [list]                          List all themes (default)',
    '  lumira themes preview <name>                  Render a sample with <name>',
    '  lumira themes preview <name> --powerline      Render with powerline style',
    '  lumira themes preview <name> --style=<x>      Powerline + specific separator',
    '  lumira themes preview --all [--powerline]     Render every theme in sequence',
    '',
    'THEMES',
    `  ${Object.keys(THEMES).join(', ')}`,
    '',
    'POWERLINE STYLES',
    `  ${VALID_POWERLINE_STYLES.join(', ')}`,
    '',
  ].join('\n');
}

function previewBlock(name: string, args: ThemesArgs): string {
  const opts: PreviewOpts = {
    preset: 'full',
    theme: name,
    icons: 'nerd',
    colorMode: detectColorMode(),
  };
  if (args.powerline) {
    opts.style = 'powerline';
    opts.powerlineStyle = args.powerlineStyle ?? 'auto';
  }
  const banner = `── ${name}${args.powerline ? ` · powerline${args.powerlineStyle ? ` (${args.powerlineStyle})` : ''}` : ''}`;
  return `${banner}\n${buildPreview(opts)}\n`;
}

/**
 * Returns the rendered output for `lumira themes [...]`. Caller is responsible
 * for writing to stdout. Returns an empty string only on internal failure.
 */
export function runThemesCommand(argv: string[]): string {
  const args = parseThemesArgs(argv);

  if (args.sub === 'help') return helpText();
  if (args.sub === 'list') return listText();

  // sub === 'preview'
  if (args.all) {
    return Object.keys(THEMES).map(n => previewBlock(n, args)).join('\n');
  }

  if (!args.themeName) {
    return 'lumira themes preview: missing theme name.\n\n'
      + "Use 'lumira themes list' to see available themes,\n"
      + "or 'lumira themes preview --all' to render all of them.\n";
  }

  if (!THEMES[args.themeName]) {
    return `lumira themes preview: unknown theme "${args.themeName}".\n\n`
      + `Available: ${Object.keys(THEMES).join(', ')}\n`;
  }

  return previewBlock(args.themeName, args);
}
