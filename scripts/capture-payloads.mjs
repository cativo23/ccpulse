#!/usr/bin/env node
/**
 * Statusline wrapper that tees Claude Code's stdin payload to a per-call file
 * before forwarding to lumira. Used to collect real sample data for the
 * asciinema demo (scripts/build-asciinema.mjs reads the captures and replays
 * them through lumira to render a .cast).
 *
 * Wire it into ~/.claude/settings.json:
 *   "statusLine": {
 *     "type": "command",
 *     "command": "node /path/to/lumira/scripts/capture-payloads.mjs",
 *     "padding": 0
 *   }
 *
 * Captures land in /tmp/lumira-capture/<timestamp>.json. Forwarding output
 * is unchanged so the statusline still renders normally during capture.
 */

import { mkdirSync, createWriteStream } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LUMIRA = join(__dirname, '..', 'dist', 'index.js');
const CAPTURE_DIR = process.env['LUMIRA_CAPTURE_DIR'] ?? '/tmp/lumira-capture';

mkdirSync(CAPTURE_DIR, { recursive: true });

const ts = `${Date.now()}-${process.pid}`;
const captureFile = join(CAPTURE_DIR, `${ts}.json`);

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { buf += chunk; });
process.stdin.on('end', () => {
  // Persist the raw payload for the demo builder.
  try {
    const out = createWriteStream(captureFile);
    out.write(buf);
    out.end();
  } catch {
    // Capture is best-effort; failing here must never break the statusline.
  }

  // Forward to lumira itself, identical pipeline. We re-feed the buffered
  // payload via spawn's stdin so output streaming still works the same way.
  const child = spawn('node', [LUMIRA], {
    stdio: ['pipe', 'inherit', 'inherit'],
    env: process.env,
  });
  child.on('error', () => process.exit(1));
  child.on('exit', code => process.exit(code ?? 0));
  child.stdin.write(buf);
  child.stdin.end();
});
