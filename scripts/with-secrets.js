#!/usr/bin/env node
/**
 * Loads secrets from secrets.json and runs a command with them as environment variables.
 *
 * Usage: node scripts/with-secrets.js <command> [args...]
 * Example: node scripts/with-secrets.js pnpm exec sst deploy --stage dev
 *
 * This keeps secrets in a file (more reliable than shell exports) while providing
 * them to tools like SST that expect environment variables.
 */

import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const secretsPath = join(rootDir, 'secrets.json');

// Load secrets
let secrets = {};
if (existsSync(secretsPath)) {
  try {
    const content = readFileSync(secretsPath, 'utf-8');
    secrets = JSON.parse(content);
    // Remove non-env entries like "comment"
    delete secrets.comment;
    console.log(`✓ Loaded ${Object.keys(secrets).length} secrets from secrets.json`);
  } catch (err) {
    console.error(`✗ Error reading secrets.json: ${err.message}`);
    process.exit(1);
  }
} else {
  console.warn('⚠ secrets.json not found - running without secrets');
  console.warn('  Copy secrets_template.json to secrets.json and add your tokens');
}

// Get command to run
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/with-secrets.js <command> [args...]');
  console.error('Example: node scripts/with-secrets.js pnpm exec sst deploy --stage dev');
  process.exit(1);
}

const [command, ...commandArgs] = args;

// Spawn command with secrets merged into environment
const child = spawn(command, commandArgs, {
  stdio: 'inherit',
  env: {
    ...process.env,
    ...secrets,
  },
  shell: true,
});

child.on('close', (code) => {
  process.exit(code ?? 0);
});

child.on('error', (err) => {
  console.error(`✗ Failed to run command: ${err.message}`);
  process.exit(1);
});
