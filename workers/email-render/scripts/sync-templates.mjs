#!/usr/bin/env node
/**
 * Sync email templates from engine package to worker
 *
 * This copies the necessary files to bundle with the worker.
 * Run automatically during build via `bun run prebuild`.
 */

import { cpSync, mkdirSync, existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const workerRoot = join(__dirname, "..");
const engineEmail = join(__dirname, "../../../packages/engine/src/lib/email");

const destinations = {
  components: join(workerRoot, "src/templates/components"),
  sequences: join(workerRoot, "src/templates"),
};

console.log("📧 Syncing email templates from engine package...");

// Ensure directories exist
mkdirSync(destinations.components, { recursive: true });
mkdirSync(destinations.sequences, { recursive: true });

// Copy components
const componentFiles = [
  "GroveEmail.tsx",
  "GroveButton.tsx",
  "GroveDivider.tsx",
  "GroveHighlight.tsx",
  "GroveText.tsx",
  "GrovePatchNote.tsx",
  "styles.ts",
  "index.ts",
];

for (const file of componentFiles) {
  const src = join(engineEmail, "components", file);
  const dest = join(destinations.components, file);
  if (existsSync(src)) {
    cpSync(src, dest, { force: true });
    console.log(`  ✓ ${file}`);
  } else {
    console.log(`  ⚠ Missing: ${file}`);
  }
}

// Copy sequence templates
const sequenceFiles = [
  "WelcomeEmail.tsx",
  "Day1Email.tsx",
  "Day7Email.tsx",
  "Day14Email.tsx",
  "Day30Email.tsx",
  "BetaInviteEmail.tsx",
];

for (const file of sequenceFiles) {
  const src = join(engineEmail, "sequences", file);
  const dest = join(destinations.sequences, file);
  if (existsSync(src)) {
    cpSync(src, dest, { force: true });

    // Rewrite import paths: in the engine, sequences/ imports from ../components/
    // but in the worker, templates are siblings with components/ so it's ./components/
    let content = readFileSync(dest, "utf-8");
    content = content.replace(
      /from ["']\.\.\/components\//g,
      'from "./components/',
    );
    content = content.replace(/from ["']\.\.\/urls/g, 'from "./urls');
    content = content.replace(/from ["']\.\.\/types/g, 'from "./types');
    writeFileSync(dest, content);

    console.log(`  ✓ ${file}`);
  } else {
    console.log(`  ⚠ Missing: ${file}`);
  }
}

// Copy URL helpers
const urlSrc = join(engineEmail, "urls.ts");
const urlDest = join(destinations.sequences, "urls.ts");
if (existsSync(urlSrc)) {
  cpSync(urlSrc, urlDest, { force: true });
  console.log(`  ✓ urls.ts`);
}

// Copy types
const typesSrc = join(engineEmail, "types.ts");
const typesDest = join(destinations.sequences, "types.ts");
if (existsSync(typesSrc)) {
  cpSync(typesSrc, typesDest, { force: true });
  console.log(`  ✓ types.ts`);
}

console.log("📧 Template sync complete!");
