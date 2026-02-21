# Workflow Safari — What the Wild Is Doing That We Haven't Tried Yet

> _"The jeep cools under an acacia tree. The journal is full — 13 new creatures spotted in the wild, each one a pattern we haven't brought home to the grove yet."_
>
> **Territory:** GitHub Actions workflow patterns from the open-source ecosystem
> **Aesthetic principle:** Only adopt what serves the grove — warm, purposeful, never cargo-culted
> **Scope:** Patterns we don't currently use across our 36 existing workflows

---

## Our Baseline — What We Already Do Well

Before the drive, we mapped the grove. **36 workflows** covering:

| Category | Workflows | Highlights |
| --- | --- | --- |
| **CI/CD Core** | `ci.yml` | Multi-package type checks, engine-first builds |
| **AI Integration** | `claude.yml`, `claude-code-review.yml` | Reactive @claude + proactive auto-review with Mermaid diagrams |
| **Security** | `codeql.yml`, `semgrep.yml` | Dual-scanner (CodeQL + Semgrep), SARIF + JSON reporting |
| **Inventory Tracking** | `component-inventory.yml`, `graft-inventory.yml`, `waystone-inventory.yml` | JSON manifests, drift detection, scheduled + PR-triggered |
| **Docs Health** | `docs-freshness.yml` | Frontmatter aging, per-category tracking, 90-day staleness |
| **Issue/PR Mgmt** | `auto-label-issues.yml`, `link-pr-to-issue.yml`, `stale-issues.yml` | Sophisticated regex, stateful label transitions, Grove-themed messages |
| **Release Engineering** | `auto-tag.yml` | Version detection, snapshot generation, OpenRouter summaries, CSV history |
| **Deployment** | 15+ deploy workflows | Cloudflare Pages/Workers, health check polling, engine-first builds |
| **Validation** | `validate-deployments.yml` | Dry-run deploys with matrix strategy, worker.js verification |
| **Tooling** | `rebuild-gf-binaries.yml` | Cross-platform Go builds, artifact collection, auto-commit |

That's genuinely impressive. Most repos have 3-5 workflows. We have 36 doing sophisticated things. But the savanna always has more to show.

---

## Route Map — 13 New Creatures Spotted

| # | Creature | Category | Our Current State | Priority |
| --- | --- | --- | --- | --- |
| 1 | Dynamic Matrix Generation | Build Intelligence | Static matrices only | 🟡 Medium |
| 2 | Reusable Workflows / Composite Actions | DRY Patterns | Zero reuse — 15 deploy workflows with copy-paste | 🔴 High |
| 3 | Workflow Telemetry (OpenTelemetry) | Observability | No CI observability at all | 🟡 Medium |
| 4 | Lighthouse CI Performance Budgets | Quality Gates | No performance tracking on PRs | 🟠 High |
| 5 | Bundle Size Tracking | Quality Gates | Package size only at release (auto-tag) | 🟡 Medium |
| 6 | Visual Regression Testing | Testing | No visual testing | 🟡 Medium |
| 7 | Environment Protection Rules | Deployment Safety | No approval gates for production | 🟠 High |
| 8 | Self-Mutation / Auto-Fix on PR | Developer Experience | No auto-formatting in CI | 🟡 Medium |
| 9 | OIDC Keyless Cloud Auth | Security | Using stored secrets for Cloudflare | 🟢 Low |
| 10 | PR Size Labeling | Developer Experience | No size indicators on PRs | 🟢 Low |
| 11 | Cache Key Rotation | Performance | No rotation strategy, possible stale caches | 🟢 Low |
| 12 | Codebase Visualization SVG | Documentation | No auto-generated visual maps | 🟢 Low |
| 13 | Affected-Only CI (Smart Filtering) | Build Intelligence | Path filters only — no dependency-aware filtering | 🟠 High |

---

## The Stops

---

### 1. Dynamic Matrix Generation

_The jeep rolls to a stop at a watering hole. Something shimmers beneath the surface — a matrix that writes itself at runtime._

**What it is:** Instead of hardcoding matrix values in YAML, a setup job generates a JSON array dynamically (based on changed files, config, or API data), and downstream jobs consume it via `fromJson()`.

**What we do today:** Our `validate-deployments.yml` has a static matrix of 7 workers and 7 pages apps. When we add a new app, we manually update the matrix. Our `rebuild-gf-binaries.yml` has a hardcoded platform list.

**What we could do:**

```yaml
jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.set-matrix.outputs.matrix }}
    steps:
      - uses: actions/checkout@v4
      - id: set-matrix
        run: |
          # Scan for changed packages, generate matrix JSON
          CHANGED=$(... detect changed apps/services ...)
          echo "matrix=${CHANGED}" >> $GITHUB_OUTPUT

  validate:
    needs: detect-changes
    strategy:
      matrix: ${{ fromJson(needs.detect-changes.outputs.matrix) }}
```

**Grove adoption spec:**

- [ ] Create a `detect-affected-packages` composite action that outputs a JSON matrix of changed packages
- [ ] Wire it into `validate-deployments.yml` so only affected workers/pages get validated
- [ ] Wire it into `ci.yml` so type-checks only run for affected packages
- [ ] Keep a fallback: if detection fails, run everything (fail-open, not fail-closed)

**Sources:** [josh-ops: Dynamic Matrix](https://josh-ops.com/posts/github-actions-dynamic-matrix/), [Ken Muse: Dynamic Build Matrices](https://www.kenmuse.com/blog/dynamic-build-matrices-in-github-actions/), [OneUptime: Dynamic Matrix](https://oneuptime.com/blog/post/2025-12-20-dynamic-matrix-github-actions/view)

---

### 2. Reusable Workflows / Composite Actions

_Through the dust haze, I can see fifteen nearly identical creatures — our deploy workflows — moving in formation. They look the same. They ARE the same. There has to be a better way._

**What it is:** `workflow_call` lets you define a workflow once and invoke it from many callers. Composite actions let you bundle multiple steps into a single reusable action.

**What we do today:** We have 15+ deploy workflows (`deploy-landing.yml`, `deploy-plant.yml`, `deploy-heartwood.yml`, `deploy-amber.yml`, `deploy-clearing.yml`, ...) that all follow the same pattern: checkout → setup node/pnpm → install → maybe build engine → type check → maybe test → deploy. Copy-pasted with minor variations.

**What we could do:**

```yaml
# .github/workflows/reusable-deploy-pages.yml
on:
  workflow_call:
    inputs:
      app-name: { required: true, type: string }
      working-directory: { required: true, type: string }
      needs-engine: { default: false, type: boolean }
      run-tests: { default: false, type: boolean }
      health-check-url: { default: '', type: string }

# Then each app just calls:
# .github/workflows/deploy-plant.yml
jobs:
  deploy:
    uses: ./.github/workflows/reusable-deploy-pages.yml
    with:
      app-name: plant
      working-directory: apps/plant
      needs-engine: true
      run-tests: true
      health-check-url: '/api/health/payments'
```

**Grove adoption spec:**

- [ ] Create `.github/workflows/reusable-deploy-pages.yml` — shared SvelteKit Pages deploy workflow
- [ ] Create `.github/workflows/reusable-deploy-worker.yml` — shared Cloudflare Workers deploy workflow
- [ ] Create `.github/actions/setup-grove/action.yml` — composite action for checkout + node + pnpm + install + optional engine build
- [ ] Migrate all 15+ deploy workflows to use reusable workflows (each becomes ~15 lines instead of ~60)
- [ ] Preserve per-app customizations (health checks, post-deploy steps) via workflow inputs

**Sources:** [GitHub Docs: Reusable Workflows](https://docs.github.com/en/actions/concepts/workflows-and-actions/reusing-workflow-configurations), [Sachith: Reusable Workflows Practical Guide](https://www.sachith.co.uk/github-actions-reusable-workflows-practical-guide-nov-11-2025/), [General Reasoning: Vanilla Monorepo CI](https://generalreasoning.com/blog/2025/03/22/github-actions-vanilla-monorepo.html)

---

### 3. Workflow Telemetry (OpenTelemetry)

_Something glints in the tall grass — an instrument panel, measuring the heartbeat of every workflow run. CPU, memory, I/O, duration. The data you never knew you needed._

**What it is:** Drop-in actions that collect CPU, memory, I/O metrics and step-by-step timing traces from every workflow run. Some export to OpenTelemetry backends for dashboards.

**What we do today:** Nothing. When CI is slow, we squint at the Actions tab and guess.

**What we could do:**

```yaml
steps:
  - uses: catchpoint/workflow-telemetry-action@v2
    with:
      comment_on_pr: true     # Adds timing breakdown as PR comment
      theme: dark
  # ... rest of your steps
```

**Grove adoption spec:**

- [ ] Add `catchpoint/workflow-telemetry-action@v2` to `ci.yml` and `validate-deployments.yml`
- [ ] Enable PR comments with timing breakdown (helps spot regressions)
- [ ] Evaluate `corentinmusard/otel-cicd-action` for deeper tracing if we want a dashboard later
- [ ] Track metrics over time to identify which steps are getting slower

**Sources:** [Catchpoint Workflow Telemetry](https://github.com/catchpoint/workflow-telemetry-action), [Dash0: GitHub Actions Observability](https://www.dash0.com/guides/github-actions-observability-opentelemetry-tracing), [krzko/run-with-telemetry](https://github.com/krzko/run-with-telemetry)

---

### 4. Lighthouse CI Performance Budgets

_The jeep crests a ridge. Below, a lighthouse sweeps the savanna — scanning for performance regressions before they ship. Every PR gets a score. Every deploy earns its light._

**What it is:** Automated Lighthouse audits on every PR, with performance budgets that fail the build if scores drop below thresholds. Tracks accessibility, SEO, performance, and best practices.

**What we do today:** Nothing. We have no automated performance checks. A PR could ship a 2MB hero image and we'd never know until someone complains.

**What we could do:**

```yaml
- uses: treosh/lighthouse-ci-action@v12
  with:
    urls: |
      https://preview-${{ github.sha }}.grove-landing.pages.dev/
      https://preview-${{ github.sha }}.grove-landing.pages.dev/about
    budgetPath: .github/lighthouse-budget.json
    runs: 3  # Multiple runs to reduce variance
```

**Grove adoption spec:**

- [ ] Create `.github/lighthouse-budget.json` with performance budgets (LCP < 2.5s, CLS < 0.1, etc.)
- [ ] Create `lighthouse-ci.yml` workflow triggered on PRs to landing/clearing/plant
- [ ] Run against Cloudflare Pages preview URLs (they exist already per-branch)
- [ ] Set accessibility score threshold to 90+ (aligns with our WCAG AA commitment)
- [ ] Post results as PR comment with score badges

**Sources:** [Lighthouse CI (Google Chrome)](https://github.com/GoogleChrome/lighthouse-ci), [treosh/lighthouse-ci-action](https://github.com/treosh/lighthouse-ci-action), [SitePen: Web Vitals + GitHub Actions](https://www.sitepen.com/blog/automate-web-vitals-checks-with-github-actions-and-lighthouse)

---

### 5. Bundle Size Tracking

_A small creature scurries past — barely noticeable, but it's been growing. Every dependency adds weight. Every import costs bytes. This one watches the scale._

**What it is:** Track JavaScript bundle sizes on every PR, with comments showing size diff and warnings if bundles exceed budgets.

**What we do today:** We track tarball + unpacked size at release time (in `auto-tag.yml`), but never on PRs. We have no idea if a PR is adding 50KB to a bundle until it ships.

**What we could do:**

Tools like `size-limit`, `bundlewatch`, or `preactjs/compressed-size-action` can compare bundle sizes between the PR branch and main, posting a diff table as a PR comment.

**Grove adoption spec:**

- [ ] Evaluate `andresz1/size-limit-action` vs `preactjs/compressed-size-action` for our SvelteKit setup
- [ ] Add to CI for the engine package (the most widely shared bundle)
- [ ] Set budget thresholds per package (engine, landing, clearing)
- [ ] Post diff table as PR comment showing which files grew/shrank

---

### 6. Visual Regression Testing

_In the distance, two creatures that look almost identical — but one has a slightly different stripe pattern. The difference is subtle. Only a screenshot catches it._

**What it is:** Playwright takes screenshots of key pages, compares them pixel-by-pixel against baseline images, and flags visual regressions on PRs. Engineers can approve changes by commenting `/approve-snapshots`.

**What we do today:** Nothing visual. We rely on manual review to catch CSS regressions.

**Grove adoption spec:**

- [ ] Set up Playwright for visual regression on 5-10 key pages (landing home, about, login, clearing dashboard)
- [ ] Store baseline screenshots in the repo or as artifacts
- [ ] Run on PRs that touch `.svelte`, `.css`, or `.ts` files in UI packages
- [ ] Support `/approve-snapshots` comment to update baselines
- [ ] Respect `prefers-reduced-motion` and `prefers-color-scheme` — test both light and dark

**Sources:** [Duncan Mackenzie: Visual Regression Testing with Playwright](https://www.duncanmackenzie.net/blog/visual-regression-testing/), [Haley Ward: Playwright Visual Regression + GitHub Actions](https://medium.com/@haleywardo/streamlining-playwright-visual-regression-testing-with-github-actions-e077fd33c27c)

---

### 7. Environment Protection Rules & Deployment Approval Gates

_A gate across the road. Not a barrier — a checkpoint. The ranger checks your permit before you enter the reserve. Production is sacred ground._

**What it is:** GitHub Environments with required reviewers, wait timers, branch restrictions, and custom deployment protection rules. Jobs targeting protected environments pause until approved.

**What we do today:** Our deploys push straight to production on merge to main. No approval gate. No wait timer. No "are you sure?"

**What we could do:**

```yaml
jobs:
  deploy:
    environment:
      name: production
      url: https://grove.autumns.cc
    # This job pauses until a reviewer approves
```

**Grove adoption spec:**

- [ ] Create GitHub environments: `staging`, `production`
- [ ] Add required reviewers for `production` environment (1 reviewer minimum)
- [ ] Add branch restriction: only `main` can deploy to `production`
- [ ] Optional: Add a 5-minute wait timer to catch "oh no" moments
- [ ] Evaluate custom protection rules (e.g., Honeycomb health check before deploy)

**Sources:** [GitHub Docs: Deployments and Environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments), [OneUptime: Deployment Gates](https://oneuptime.com/blog/post/2025-12-20-deployment-gates-github-actions/view), [GitHub Docs: Custom Deployment Protection Rules](https://docs.github.com/en/actions/deployment/protecting-deployments/creating-custom-deployment-protection-rules)

---

### 8. Self-Mutation / Auto-Fix on PR

_A creature that cleans itself. Formatting issues? Fixed. Lint errors? Corrected. A commit pushed back to your branch before you even notice the problem._

**What it is:** CI runs formatters/linters, and if files change, automatically commits the fixes back to the PR branch.

**What we do today:** Our `gw git ship` command formats locally before commit, but if someone pushes without using `gw`, there's no safety net. CI doesn't auto-fix.

**What we could do:**

```yaml
- uses: wearerequired/lint-action@v2
  with:
    prettier: true
    eslint: true
    auto_fix: true
```

Or the more secure fork-safe option:

```yaml
- uses: autofix-ci/action@v1  # Handles forks safely
```

**Grove adoption spec:**

- [ ] Evaluate `autofix.ci` (secure, fork-safe) vs `wearerequired/lint-action` (simpler, no fork support needed since we don't accept external PRs)
- [ ] Run Prettier + ESLint auto-fix on PRs
- [ ] Exclude `.github/workflows/` from auto-fix (token permission limitation)
- [ ] Add a `[bot]` commit message prefix so auto-fix commits are clearly identified

**Sources:** [autofix.ci](https://autofix.ci/), [wearerequired/lint-action](https://github.com/wearerequired/lint-action), [stefanzweifel/git-auto-commit-action](https://github.com/stefanzweifel/git-auto-commit-action)

---

### 9. OIDC Keyless Cloud Authentication

_No keys in the ignition. The jeep starts with a handshake — your identity, verified by the universe itself. No secrets to steal. No tokens to rotate._

**What it is:** Instead of storing cloud credentials as GitHub secrets, workflows request short-lived tokens via OpenID Connect. The cloud provider trusts GitHub's OIDC issuer and grants temporary access.

**What we do today:** We store Cloudflare API tokens as repository secrets. They're long-lived and need manual rotation.

**What we could do:** Cloudflare supports OIDC via API tokens with service tokens. The workflow would request a short-lived token per job, no secrets stored.

**Grove adoption spec:**

- [ ] Research Cloudflare's OIDC support for Workers/Pages deployments
- [ ] If supported, configure OIDC trust in Cloudflare dashboard
- [ ] Update deploy workflows to use `id-token: write` permission
- [ ] Remove stored Cloudflare secrets from GitHub
- [ ] Document the setup in AGENT.md

**Sources:** [GitHub Docs: OpenID Connect](https://docs.github.com/en/actions/concepts/security/openid-connect), [Datadog Security Labs: Keyless Auth Risks](https://securitylabs.datadoghq.com/articles/exploring-github-to-aws-keyless-authentication-flaws/), [OneUptime: OIDC Cloud Auth](https://oneuptime.com/blog/post/2025-12-20-oidc-cloud-authentication-github-actions/view)

---

### 10. PR Size Labeling

_A small, simple creature. But useful. At a glance, you know if a PR is a gentle breeze or a hurricane._

**What it is:** Automatically label PRs with size indicators (XS/S/M/L/XL) based on lines changed. Large PRs get flagged for extra review attention.

**What we do today:** Nothing. A PR could be 3 lines or 3000 lines and there's no visual indicator.

**Grove adoption spec:**

- [ ] Add a workflow using `CodelyTV/pr-size-labeler` or similar
- [ ] Define Grove-themed size labels: `size/seedling` (XS), `size/sapling` (S), `size/tree` (M), `size/grove` (L), `size/forest` (XL)
- [ ] Thresholds: 0-10 lines = seedling, 10-50 = sapling, 50-200 = tree, 200-500 = grove, 500+ = forest
- [ ] Add a warning comment on `size/forest` PRs encouraging smaller PRs

---

### 11. Cache Key Rotation

_The water in this watering hole is... stagnant. Months old. The animals drink, but it's not fresh. Time to rotate._

**What it is:** Include a year-month value in cache keys so caches automatically rotate monthly, preventing bloat from accumulated stale data.

**What we do today:** Standard pnpm cache keys based on lockfile hash. No rotation. Caches can accumulate stale entries indefinitely.

**Grove adoption spec:**

- [ ] Add `YEAR_MONTH=$(date +%Y%m)` to cache key generation
- [ ] Update cache key format: `${{ runner.os }}-pnpm-$YEAR_MONTH-${{ hashFiles('**/pnpm-lock.yaml') }}`
- [ ] Apply to all workflows that use caching

**Sources:** [belgattitude: Composite pnpm cache action](https://gist.github.com/belgattitude/838b2eba30c324f1f0033a797bab2e31), [theodorusclarence: pnpm GitHub Actions Cache](https://theodorusclarence.com/shorts/github/pnpm-github-actions-cache)

---

### 12. Codebase Visualization SVG

_A bird's-eye map of the forest, auto-drawn every time a tree grows. You see the shape of your codebase at a glance._

**What it is:** GitHub Next built a tool that generates an SVG diagram of your codebase structure, auto-updated on every commit. The visualization shows the relative size and structure of directories and files.

**What we do today:** Nothing. We have no visual map of the monorepo structure.

**Grove adoption spec:**

- [ ] Evaluate GitHub Next's `repo-visualizer` action
- [ ] Generate SVG on push to main, commit to `docs/` or repo root
- [ ] Consider a simpler approach: Mermaid diagram auto-generated from `gw packages list`
- [ ] Add to landing page as a "how we're built" section (very on-brand for the grove)

**Sources:** [GitHub Next: Visualizing a Codebase](https://githubnext.com/projects/repo-visualization/)

---

### 13. Affected-Only CI (Smart Dependency-Aware Filtering)

_The last creature — and maybe the most powerful. Instead of testing everything on every PR, test only what changed... and everything that depends on it._

**What it is:** Tools like Turborepo's `--filter` or Nx's `nx affected` understand your package dependency graph and only run CI for packages that were actually affected by a change — not just the changed files, but their downstream dependents too.

**What we do today:** We use `paths` filters in YAML, which is good but doesn't understand dependencies. If someone changes `libs/engine/`, we manually configured each deploy workflow to watch `libs/engine/**`. But if we add a new shared library, we have to update every workflow.

**What we could do:**

```yaml
- run: pnpm turbo run build test typecheck --filter='...[origin/main...HEAD]'
```

This single command builds/tests/typechecks only affected packages and their dependents. No manual path filter maintenance.

**Grove adoption spec:**

- [ ] Evaluate Turborepo integration (we already use pnpm workspaces)
- [ ] Start with `turbo run typecheck test --filter='...[origin/main...HEAD]'` in CI
- [ ] Remove manual path filters from deploy workflows if dependency detection handles it
- [ ] Keep path filters as a fallback for non-code triggers (docs, configs)

**Sources:** [Turborepo + GitHub Actions Guide](https://turborepo.dev/docs/guides/ci-vendors/github-actions), [WarpBuild: Complete Guide to GitHub Actions for Monorepos](https://www.warpbuild.com/blog/github-actions-monorepo-guide), [Turbo Changed Action](https://github.com/marketplace/actions/turbo-changed)

---

## Expedition Summary

### By the Numbers

| Metric | Count |
| --- | --- |
| **Creatures spotted** | 13 |
| **Already thriving in our grove** | 0 (all new!) |
| **High priority** | 4 (reusable workflows, Lighthouse, env protection, affected-only CI) |
| **Medium priority** | 5 (dynamic matrix, telemetry, bundle size, visual regression, auto-fix) |
| **Low priority** | 4 (OIDC, PR size labels, cache rotation, codebase viz) |
| **Total action items** | ~50 checkboxes |

### Recommended Trek Order

**Phase 1 — Foundation (biggest impact, least risk):**
1. **Reusable Workflows** — DRY up 15 deploy workflows. Massive maintenance win.
2. **PR Size Labels** — Trivial to add, immediate quality-of-life improvement.
3. **Cache Key Rotation** — One-line change per workflow, prevents cache bloat.

**Phase 2 — Quality Gates (raise the bar):**
4. **Lighthouse CI** — Performance budgets on PRs. Protects user experience.
5. **Affected-Only CI** — Faster CI, smarter builds. Evaluate Turborepo fit.
6. **Environment Protection Rules** — Approval gates for production deploys.

**Phase 3 — Developer Experience (polish the workflow):**
7. **Workflow Telemetry** — Understand where CI time goes.
8. **Self-Mutation / Auto-Fix** — Format and lint automatically on PRs.
9. **Dynamic Matrix** — Runtime-generated matrices for smarter validation.

**Phase 4 — Advanced (when we're ready):**
10. **Visual Regression Testing** — Screenshot diffing for UI changes.
11. **Bundle Size Tracking** — Watch the weight of every import.
12. **Codebase Visualization** — Auto-generated SVG maps.
13. **OIDC Keyless Auth** — Eliminate stored Cloudflare secrets.

### Cross-Cutting Themes

1. **DRY is our biggest win.** 15 nearly-identical deploy workflows is the most obvious improvement. Reusable workflows would cut ~700 lines of duplicated YAML.

2. **We're strong on inventory, weak on performance.** We meticulously track component counts, graft flags, and waystone slugs — but we have zero automated performance checks. Lighthouse CI would close that gap.

3. **Our CI is honest but not smart.** Path filters work, but they don't understand dependencies. Affected-only CI with Turborepo would make our monorepo CI dramatically faster.

4. **Security is solid, deployment safety is not.** CodeQL + Semgrep is excellent, but any merge to main deploys to production immediately. Environment protection rules would add a necessary checkpoint.

5. **We build for ourselves.** No external contributors, no fork PRs. This means simpler auto-fix solutions work fine — we don't need the fork-safe complexity of `autofix.ci`.

---

_The fire dies to embers. The journal is full — 13 stops, ~50 fixes sketched, the whole landscape mapped. Tomorrow, the animals go to work. But tonight? Tonight was the drive. And it was glorious._ 🚙
