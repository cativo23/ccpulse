# lumira

Real-time statusline plugin for [Claude Code](https://code.claude.com) and Qwen Code.

![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)
![Tests](https://img.shields.io/badge/tests-136%20passing-green)
![Dependencies](https://img.shields.io/badge/runtime%20deps-0-brightgreen)

## Features

- **3-line custom mode** + **1-line minimal mode** (auto-switches at <70 columns)
- **Context bar** with color thresholds (green → yellow → orange → blinking red)
- **Git status** with branch, staged/modified/untracked counts (5s TTL cache)
- **Token metrics** — input/output counts, speed (tok/s), cost + burn rate ($/h)
- **Rate limits** — 5h/7d usage with color warnings and reset countdown
- **Transcript parsing** — active tools, agents, and todo progress
- **GSD integration** — current task and update notifications
- **Memory usage** display
- **Nerd Font icons** throughout
- **3-tier color system** — named ANSI, 256-color, truecolor (auto-detected)
- **Config-driven** — toggle any feature via JSON config + CLI flags
- **Zero runtime dependencies**
- **Dual-platform support** — works with both Claude Code and Qwen Code statusline payloads

## Install

Quick setup (auto-configures Claude Code):

```bash
npx lumira install
```

Or install globally:

```bash
npm install -g lumira
lumira install
```

To uninstall:

```bash
npx lumira uninstall
```

### Manual setup

Add to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "npx lumira@latest",
    "padding": 0
  }
}
```

If installed from source:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node /path/to/claude-cc/dist/index.js",
    "padding": 0
  }
}
```

## Display

### Custom Mode (default, >=70 columns)

```
 Opus 4.6 (1M context) │  main ⇡1 !2 │  my-project     +150 -30 │ default │ v2.1.92
[████████░░░░░░░░░░░░] 21% │  131k↑ 25k↓ │ $1.31 $2.24/h │  35m06s │ 142 tok/s │  72%(5h)
✓ Read ×3 | ✓ Edit ×2 | ✓ Bash ×5 │ ████████░░ 8/10 | ◐ 1 | ○ 1
```

### Minimal Mode (<70 columns or `--minimal`)

```
my-project |  main | Opus 4.6 | ████░░░░░░░░░░░░░░░░ 21% | 131k↑ 25k↓ | $1.31
```

## Configuration

Create `~/.config/lumira/config.json`:

```json
{
  "layout": "auto",
  "gsd": false,
  "display": {
    "model": true,
    "branch": true,
    "gitChanges": true,
    "directory": true,
    "contextBar": true,
    "tokens": true,
    "cost": true,
    "burnRate": true,
    "duration": true,
    "tokenSpeed": true,
    "rateLimits": true,
    "tools": true,
    "todos": true,
    "vim": true,
    "effort": true,
    "worktree": true,
    "agent": true,
    "sessionName": true,
    "style": true,
    "version": true,
    "linesChanged": true,
    "memory": true
  },
  "colors": {
    "mode": "auto"
  }
}
```

All fields are optional — defaults are shown above.

### CLI Flags

```bash
lumira --minimal    # Force minimal mode
lumira --gsd        # Enable GSD integration
lumira --qwen       # Force Qwen Code single-line output
```

### Qwen Code Support

Lumira detects the platform automatically. When running under Qwen Code, it parses Qwen-specific fields:

```jsonc
{
  "git": { "branch": "main" },
  "metrics": {
    "models": {
      "qwen-coder-plus": {
        "api": { "total_requests": 42, "total_errors": 0, "total_latency_ms": 12000 },
        "tokens": { "prompt": 15000, "completion": 5000, "total": 20000, "cached": 8000, "thoughts": 150 }
      }
    },
    "files": { "total_lines_added": 150, "total_lines_removed": 30 }
  }
}
```

The `--qwen` preset is recommended for Qwen Code, which renders a single line with model, context bar, requests, cached tokens, and thoughts.

#### Qwen Code Setup

```json
{
  "statusLine": {
    "type": "command",
    "command": "npx lumira@latest --qwen",
    "padding": 0
  }
}
```

## Architecture

```text
stdin (JSON from Claude Code or Qwen Code)
  → normalize() — unifies both platform payloads
  → parsers (git, transcript, token-speed, memory, gsd)
  → RenderContext
  → render (line1-4 or minimal)
  → stdout
```

- **Dependency injection** for testability
- **File caching** — TTL-based (git, speed) and mtime-based (transcript)
- **Progressive truncation** — adapts to terminal width

## Development

```bash
npm run dev          # Watch mode (tsc --watch)
npm test             # Run tests
npm run test:watch   # Watch mode
npm run test:coverage # With coverage
npm run lint         # Type check
npm run build        # Compile to dist/
```

## Credits

Inspired by [claude-hud](https://github.com/jarrodwatts/claude-hud). Migrated from [claude-setup](https://github.com/cativo23/claude-setup) statusline.

## License

MIT
