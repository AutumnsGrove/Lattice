# CI Punt List

Real pre-existing type/test errors that the new `validate-deployments` pipeline
surfaced during PR #1554 setup but we deferred fixing.

**Status at PR #1554 merge:** the validation pipeline is live and correct.
These errors failed locally via `.githooks/pre-push` and on PRs via
`validate-deployments.yml`. They did NOT affect production deploys today
because most had never run through a typecheck gate before.

**Status after `claude/plan-ci-tech-debt-cMvuW`:** all items resolved.
Root cause for Classes A–D was build ordering (engine not built before tsc).
Class E required real code fixes. See each section for details.

---

## Class A — Real class-property errors ✓ RESOLVED

`ExportJobV2`, `SentinelDO`, and `SearchJobDO` all correctly extend
`LoomDO<State, Env>` which declares `env`, `log`, `sql`, `sockets`,
`state_data` as `protected readonly`. The TS2339 errors appeared because
`libs/engine` was not built before running `tsc --noEmit`, so
`@autumnsgrove/lattice/loom` couldn't resolve. Building engine first
makes all errors vanish.

**Fix:** `scripts/pre-push/validate.mjs` now unconditionally builds all
shared libs (foliage, gossamer, engine) before any typecheck runs,
rather than only when affected shims declare `needs-engine: true`.

---

## Class B — tsconfig module/moduleResolution mismatch ✓ RESOLVED

TS5095 (`Option 'bundler' can only be used when 'module' is set to 'preserve'
or 'es2015' or later`) does not reproduce once `svelte-kit sync` generates
`.svelte-kit/tsconfig.json`, which sets a compatible `module` value. No
tsconfig edits were needed. The pre-push hook now attempts `svelte-kit sync`
for every affected shim before typechecking.

---

## Class C — Implicit-any parameters ✓ RESOLVED

Build-ordering artifact — same root cause as Class A. All pass after engine
is built.

---

## Class D — `unknown` typed values ✓ RESOLVED

Build-ordering artifact — same root cause as Class A. All pass after engine
is built.

---

## Class E — Pre-existing CI failures ✓ RESOLVED

These required real code or config fixes:

- **CI / Check: ivy** — `apps/ivy/src/routes/+layout.svelte` used bare
  `crossorigin` attribute (Svelte infers `true`, wrong type for the HTML
  attribute). Fixed: changed to `crossorigin="anonymous"` on both link tags.

- **CI / Check: aspen** — `EditorRef` interface in `garden/edit` and
  `garden/new` pages was missing `getAvailableParagraphs`. The actual editor
  component exposes `getAvailableParagraphs(): { index: number; preview: string }[]`.
  Fixed: added the method to both EditorRef interfaces with the correct return type.

- **CI / Check: subscription-digest** — `workers/subscription-digest/tsconfig.json`
  extends `../../tsconfig.base.json` which did not exist at the repo root.
  Without it TypeScript used lib defaults (DOM globals) which conflicted with
  `@cloudflare/workers-types`. Fixed: created `tsconfig.base.json` at repo root
  with `lib: ["ES2022"]` to exclude DOM globals.

---

## Notes on what's NOT in this list

Errors that looked like `Cannot find module '@autumnsgrove/lattice/errors'`
(or other `/lattice/*` subpaths) during the initial run of `validate.mjs` were
**false positives** caused by the pre-push hook not building `libs/engine`
before typechecking. The hook now builds all libs unconditionally.
