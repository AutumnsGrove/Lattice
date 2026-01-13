#!/usr/bin/env node
/**
 * Post-build script to inject Durable Object exports into _worker.js
 *
 * adapter-cloudflare doesn't natively support DO exports.
 * This script compiles DO classes and appends them to the generated worker.
 *
 * Run after: pnpm build
 * Run before: wrangler pages deploy
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Configuration
const WORKER_PATH = join(ROOT, ".svelte-kit/cloudflare/_worker.js");
const DO_DIR = join(ROOT, "src/lib/durable-objects");
const OUT_DIR = join(ROOT, ".svelte-kit/cloudflare");

// All DO classes to compile and inject
const DO_CLASSES = [
  { name: "TenantDO", description: "config caching, draft sync, analytics" },
  { name: "PostMetaDO", description: "reactions, views, real-time presence" },
  {
    name: "PostContentDO",
    description: "content caching, hot/warm/cold storage",
  },
];

// Marker to detect if DOs are already injected
const INJECTION_MARKER = "// === DURABLE OBJECTS (injected) ===";

console.log("🔧 Injecting Durable Objects into worker...\n");

// Check if build output exists
if (!existsSync(WORKER_PATH)) {
  console.error("❌ Worker not found at:", WORKER_PATH);
  console.error("   Run 'pnpm build:sveltekit' first.");
  process.exit(1);
}

// Read current worker
let workerCode = readFileSync(WORKER_PATH, "utf-8");

// Check if already injected
if (workerCode.includes(INJECTION_MARKER)) {
  console.log("ℹ️  Durable Objects already injected, skipping...");
  process.exit(0);
}

// Compile each DO class
const compiledCode = [];

for (const doClass of DO_CLASSES) {
  const sourcePath = join(DO_DIR, `${doClass.name}.ts`);
  const outPath = join(OUT_DIR, `${doClass.name}.js`);

  // Check if source exists
  if (!existsSync(sourcePath)) {
    console.error(`❌ ${doClass.name} source not found at:`, sourcePath);
    process.exit(1);
  }

  console.log(`📦 Compiling ${doClass.name}.ts...`);

  // Compile with esbuild (bundle to inline dependencies like tiers.js)
  const result = spawnSync(
    "npx",
    [
      "esbuild",
      sourcePath,
      `--outfile=${outPath}`,
      "--bundle",
      "--format=esm",
      "--target=es2022",
      "--platform=neutral",
    ],
    {
      cwd: ROOT,
      stdio: "inherit",
      shell: false,
    },
  );

  if (result.status !== 0) {
    console.error(`❌ Failed to compile ${doClass.name}`);
    process.exit(1);
  }

  // Read compiled code
  const code = readFileSync(outPath, "utf-8");
  compiledCode.push(`// --- ${doClass.name} ---\n${code}`);
}

// Create injection block
const doExport = `
${INJECTION_MARKER}

${compiledCode.join("\n\n")}
`;

// Append DO exports to worker
workerCode += doExport;
writeFileSync(WORKER_PATH, workerCode);

console.log("\n✅ Injected Durable Objects into _worker.js");
console.log("\n📋 DO exports added:");
for (const doClass of DO_CLASSES) {
  console.log(`   - ${doClass.name} (${doClass.description})`);
}
console.log("\n🚀 Ready to deploy with: pnpm deploy");
