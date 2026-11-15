---
title: "Lyra repository: name, layout, release, and moving over"
status: planning
category: features
---

# The new repository

Last updated: 2026-11-15. Facts are from reading and from a few registry checks. Everything here is decided (decisions 68 to 77).

## Facts

- **Name.** Nothing named `lyra` was in your repository list when the session began, and I assumed the repository is `AutumnsGrove/lyra`. I could not check GitHub directly for it from this session. On npm, `@autumnsgrove/lyra` is free. The unscoped `lyra` is taken, and `lyra-agent` is free. So the package is scoped, which is how everything else of yours ships.
- **Licenses differ.** Nova is MIT. Lattice's own packages (`prism`, `engine`, `infra`, `grove-agent`) are AGPL-3.0-only. Pi is MIT.
- **Your published packages point at source.** `libs/prism/package.json` sets `main` and `types` to `./src/index.ts`, with `publishConfig.access: public`. That works inside a monorepo that compiles everything together. A shared library used from other projects needs built output.
- **Releases today.** Lattice has deploy workflows per service, a `release-tools.yml` for the `gw` and `gf` binaries, and `gw` handles npm publishing (`AGENT.md`). Nova has `ci.yml`, `release.yml`, and a review workflow. I found no npm publish workflow in Lattice to copy.
- **Pi's and Nova's rule.** Both keep the core free of the front end and check it with a script. Nova also enforces size budgets and has an `examples/` consumer built in CI so the library cannot rot as embeddable.

## Decisions

### 68. Name and home (decided)
The repository is `AutumnsGrove/lyra`, public, and the package is `@autumnsgrove/lyra`. This follows decision 1. The Lattice repository is already public, so the references to Lattice in these docs are not a new exposure.

### 69. One package with subpath exports (decided)
A pnpm workspace, with one published package and several entry points:

| Entry point | What it holds | May import |
|---|---|---|
| `@autumnsgrove/lyra` | The core: loop, recipes, record, slots, protocol frames | Web-standard APIs only |
| `@autumnsgrove/lyra/memory` | In-memory storage and waking | The core |
| `@autumnsgrove/lyra/cloudflare` | Durable Object storage and alarm waking | The core, Cloudflare types |
| `@autumnsgrove/lyra/openai` | The OpenAI-style model adapter (OpenRouter, OpenCode Go) | The core, `fetch` |
| `@autumnsgrove/lyra/testkit` | The scripted model, fake server, fake clock, scenario runner | The core |

Each entry point has its own allowed imports, enforced by the import check, so the core cannot pull in an adapter. A Node SQLite adapter and the shell slot come later. If one of them needs a heavy dependency, it can become its own package then, without changing the rest. A single package keeps versioning simple for one maintainer. Pi uses many packages in lockstep, which costs more to run.

The testkit is public on purpose. Lattice uses it for the mock Lumens (decision 67), and your other TypeScript projects can use it for their own tests.

### 70. Layout (decided)

```
lyra/
  packages/lyra/
    src/
      core/            loop, recipes, tools, limits
      record/          entries, replay, resume
      protocol/        frames, commands, events
      adapters/        memory, cloudflare, openai
      testkit/         scripted model, fake server, clock, scenario runner
    scenarios/         the YAML scenario files (decision 63)
  examples/
    workers-minimal/   a small Workers consumer, built in CI so the library stays embeddable
  scripts/             importcheck, matrixcheck, budget
  docs/                the specs, with a table of row IDs in each; decisions.md; the research
  .github/workflows/   ci.yml, release.yml
```

### 71. Release process (decided: publish to npm from the start)
- **Versioning:** semver, 0.x until version one is complete and used, with breaking changes allowed in minor versions and written in the changelog.
- **CI:** one workflow runs `pnpm ci` (decision 66) on every push and pull request, with limited parallelism so it does not saturate a small runner.
- **Release:** a version tag runs the same gate, builds, and publishes to npm as public. The changelog is written by hand. Whether to publish with npm provenance is to confirm.
- **The package ships built output,** not source files, unlike the packages in Lattice.
- **Node and tools:** pnpm for dependencies, Vitest for tests. Pi requires Node 22.19 or newer, which is a reasonable floor to confirm. I would not bring in bun, since the tests that matter run in workerd through Node.

### 72. The Cloudflare foundation (decided: plain Durable Objects)
The question left open since decision 12: build the Cloudflare adapter on Cloudflare's agent tooling, or on plain Durable Objects behind Lyra's slots?

The research (notes in `research/cloudflare-notes.md`) found that Cloudflare's `agents` package now ships a harness and a durable-execution layer. It also found them marked beta or experimental, with fast-changing versions, and that Cloudflare's own guidance points to starting with a hand-rolled Durable Object, an alarm, and SQLite checkpoints. Lyra's Cloudflare adapter needs only three stable pieces: SQLite storage, an alarm, and hibernation. Those are core Durable Object features, and they are what the `evictDurableObject` test helpers exercise.

**Proposal: plain Durable Objects.** It keeps Lyra's slots as the only contract, avoids depending on a fast-moving beta, and the test tooling for it is documented. Cloudflare's tooling can still be used by a consumer, and a separate adapter for it can be added later if it proves worth it. The cost is writing the small amount of scheduling and storage code ourselves.

### 73. License (decided: MIT)
Like Nova and Pi. Lattice's own packages stay AGPL-3.0-only.

## Release notes and review by an agent in CI (decided: 74 to 77)

### What Nova does

Read from `.github/workflows/release.yml`, `scripts/release-notes/`, and `AGENTS.md` in the Nova repository.

- **A release is a changelog edit, a PR, and a tag.** A person or coding agent renames `[Unreleased]` to the new version in `CHANGELOG.md`, adds upgrade notes for anything that changes behavior for an existing caller, opens a PR titled `release: vX.Y.Z`, and after it merges tags the merge commit.
- **The agent writes the release body, not the changelog.** On the tag push, the release job installs the Pi CLI at a pinned version, builds a small script, and runs it over the range between the previous tag and this one. The agent gets the changelog section and the commit log as equal evidence, because the changelog has the upgrade notes and issue numbers, and the commits have the why. It writes a short, user-facing summary: upgrade notes first, then added, changed, and fixed.
- **It is pinned and bounded.** A fixed provider (OpenCode Go), a fixed model, high thinking, read-only inspection tools plus `bash`, a 12 minute limit inside a 15 minute step limit, and a 16 KiB cap on the body.
- **It can never block a release.** Every step before publishing is allowed to fail. If the agent fails, times out, or returns something unusable, the changelog section becomes the body, and if there is no section either, the release publishes with no body. The exit status says which body you got.
- **There is a dry run.** A manual workflow run does everything except publishing, and shows the body in the job summary and as an artifact, so the path is exercised before a tag exists.
- **The prompt has hard rules:** never invent a number, version, file, or change; omit anything the evidence does not ground; keep every upgrade note; at most 20 bullets; no mention of the model or the process.
- **PR review is separate.** `pi-review` is an extension in your `pi-extensions` repo. It provisions a credential and an identity, commits a workflow generated from `.github/pi-review.json`, and runs the same agent on pull requests.

### How it would be adapted for Lyra

- **A TypeScript script** in `scripts/release-notes`, since Lyra has no Go. Same behavior: the range, the two kinds of evidence, the fallback chain, the exit codes, the size cap, the dry run. Nova's prompt is reused with its wording changed for a library that people install from npm.
- **Written test-first** like everything else (decision 62): a fake agent executable stands in for Pi, so the fallback paths (agent crashes, times out, returns an empty or oversized body, no changelog section) are all tested without a model.
- **Same provider and key** as Nova's, OpenCode Go, so it draws on the allowance you already have. The key lives in the repository's secrets.
- **The release procedure carries over** (decision 75), with npm publishing added to the tag job, after the gate and before the release is created.
- **Tools (decision 76): `bash` stays,** as in Nova. I had recommended read-only, because the step has a key in its environment and reads commit and changelog text as evidence. The choice was to keep the shell. The cheap mitigations: only the owner pushes tags, the key goes to the notes step and no other, the runner is discarded after the job, and the key is subject to the allowance. The risk is accepted, not removed.
- **PR review (decision 77)** is installed by you from the Pi harness, as PR #1. It needs an initial commit to branch from, and it provisions the same credential the release step uses.

### What this does not do

It does not write `CHANGELOG.md`. In Nova the changelog is edited by hand, or by a coding agent following the written procedure. If you want the agent to draft that too (for example, proposing the changelog entry on each merged PR), that is a different and larger piece, and it is not in Nova to copy.

## Moving the plan over

1. Create the repository and copy this folder's docs into `docs/` (the history stays in Lattice). Keep `decisions.md` as the log.
2. Keep #1605 open in Lattice as the tracking issue. Update it with the new name, a link to the repository, and the corrections found in the research (the protocol frame families, and that Nova has no budgets).
3. File the Lumen changes (L1 to L6, decision 57) as issues in Lattice. They block the first job, and they belong in the repository that owns Lumen.
4. The vine placement issue (#1687) already exists.
5. The repository starts with an initial commit (license, README, the docs). PR #1 is the `pi-review` install, done by you from the Pi harness (decision 77). The CI gate and the check scripts follow as the next changes, before any feature code, so step 1 begins with `pnpm ci` already passing on an empty core.

## Open

- Whether the agent should ever also draft changelog entries. Decided no for now (decision 74).
