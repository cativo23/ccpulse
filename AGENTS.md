# AGENTS.md

> Instructions for AI coding agents working on this repository.

## Project Overview

**lumira** — Cross-platform terminal statusline for Claude Code & Qwen Code.

- **Type:** TypeScript CLI tool (statusline renderer)
- **Installs:** `npm install -g lumira`
- **License:** MIT
- **Node:** >= 22.14.0

## Commands

```bash
# Build
npm run build

# Test
npm test

# Test with coverage
npm run test:coverage

# Lint
npm run lint
```

## Code Style

- **TypeScript:** Strict mode, no `any` except for platform detection (`as any` in renderers)
- **Naming:** Functions are `camelCase`, types are `PascalCase`
- **Formatting:** Handled by ESLint (no manual formatting needed)
- **Imports:** `.js` extension on relative imports, alphabetical grouping
- **No unnecessary additions:** Don't add error handling beyond what's asked
- **No comments in code** unless logic isn't self-evident

## Architecture

```
src/
├── index.ts              ← CLI entry point, --full/--balanced/--qwen presets
├── stdin.ts              ← Reads JSON from stdin with timeout
├── config.ts             ← Loads config, CLI flags, presets
├── types.ts              ← ClaudeCodeInput, QwenInput, RenderContext
├── normalize.ts          ← normalize() unifies both platforms
├── parsers/              ← git, memory, transcript, token-speed, mcp, gsd
├── render/               ← line1.ts (model/git/dir), line2.ts (tokens/metrics)
│   ├── index.ts          ← Dispatches to multiline or singleline
│   ├── minimal.ts        ← Single-line renderer (for --qwen)
│   └── colors.ts/icons.ts/text.ts
└── utils/                ← cache, exec, format, terminal
```

## Git Workflow

- **Branches:** `main` (stable), `develop` (integration), `feat/*`, `fix/*`
- **Commits:** One concern per commit, imperative mood
- **PRs:** Merge to `develop` via squash merge
- **Releases:** Branch from `develop` → PR to `main` → squash merge → `npm publish`

## Testing

- **Framework:** Vitest
- **Coverage:** `npm run test:coverage` — target 90%+ line coverage
- **Fixtures:** `tests/fixtures/` contains real JSON payloads from Claude & Qwen
- **Rules:** Add or update tests for code you change

## Guardrails

- **No platform-specific branching in renderers** — use feature detection (`input.metrics?.models`), not platform identity
- **`normalize()` is the single source of truth** for platform differences
- **`as any` only in renderers** for accessing Qwen-specific fields; never in core logic
- **Never commit secrets** — tests use mock data only
- **All changes must pass `npm test`** before committing

## References

- [README.md](README.md) — User-facing documentation
- [CONTRIBUTING.md](CONTRIBUTING.md) — Human contributor guide
- [CHANGELOG.md](CHANGELOG.md) — Version history
