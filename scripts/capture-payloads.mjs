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

import { mkdirSync, createWriteStream, copyFileSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LUMIRA = join(__dirname, '..', 'dist', 'index.js');
const CAPTURE_DIR = process.env['LUMIRA_CAPTURE_DIR'] ?? '/tmp/lumira-capture';
const TRANSCRIPT_DIR = join(CAPTURE_DIR, 'transcripts');

mkdirSync(CAPTURE_DIR, { recursive: true });
mkdirSync(TRANSCRIPT_DIR, { recursive: true });

const ts = `${Date.now()}-${process.pid}`;
const captureFile = join(CAPTURE_DIR, `${ts}.json`);

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { buf += chunk; });
process.stdin.on('end', () => {
  // Snapshot the transcript file alongside the payload, then rewrite the
  // payload's transcript_path to point at the snapshot. Without this the
  // demo builder reads the live transcript (which keeps growing) and every
  // frame shows the same "current" tools/todos instead of the state that
  // was active at capture time.
  let toWrite = buf;
  try {
    const payload = JSON.parse(buf);
    const tp = payload.transcript_path;
    if (tp && existsSync(tp)) {
      const snapPath = join(TRANSCRIPT_DIR, `${ts}.jsonl`);
      copyFileSync(tp, snapPath);
      payload.transcript_path = snapPath;
      toWrite = JSON.stringify(payload);
    }
  } catch {
    // Best-effort: if snapshotting fails for any reason, fall back to the
    // raw payload so capture still happens.
  }

  try {
    const out = createWriteStream(captureFile);
    out.write(toWrite);
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
