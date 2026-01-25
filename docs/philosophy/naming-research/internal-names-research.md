---
lastUpdated: '2026-01-25'
---

# Internal Names Research - Grove Ecosystem

> **Research Date:** January 6, 2026
> **Repository:** AutumnsGrove/GroveEngine
> **Total Commits Analyzed:** 349
> **Earliest Commit:** December 30, 2025 (7defa51)

---

## Executive Summary

This document maps all public-facing Grove service names to their internal codenames, tracks naming evolution through git history, and documents repository locations. The Grove ecosystem uses a dual naming convention: **warm, nature-themed public names** for user-facing content, and **`Grove[Thing]` internal names** for development, debugging, and infrastructure.

**Key Finding:** The comprehensive naming system was established on **December 30, 2025** with the creation of `docs/grove-naming.md` (commit 7defa51). Several names have evolved since then through community feedback and metaphor refinement.

---

## Complete Public → Internal Name Mappings

| Public Name | Internal Name | Domain | Repository | Status |
|-------------|---------------|--------|------------|--------|
| **Meadow** | GroveSocial | meadow.grove.place | - | In Development |
| **Forage** | GroveDomainTool | forage.grove.place | [AutumnsGrove/Forage](https://github.com/AutumnsGrove/Forage) | Active |
| **Foliage** | GroveThemes | foliage.grove.place | [AutumnsGrove/Foliage](https://github.com/AutumnsGrove/Foliage) | Active |
| **Terrarium** | GroveTerrarium | grove.place/terrarium | - | Planned |
| **Heartwood** | GroveAuth | heartwood.grove.place | [AutumnsGrove/GroveAuth](https://github.com/AutumnsGrove/GroveAuth) | Active |
| **Patina** | GrovePatina | *(internal)* | [AutumnsGrove/Patina](https://github.com/AutumnsGrove/Patina) | Live |
| **Trove** | TreasureTrove | trove.grove.place | [AutumnsGrove/TreasureTrove](https://github.com/AutumnsGrove/TreasureTrove) | Active |
| **Outpost** | GroveMC | mc.grove.place | [AutumnsGrove/GroveMC](https://github.com/AutumnsGrove/GroveMC) | Active |
| **Aria** | GroveMusic | aria.grove.place | [AutumnsGrove/GroveMusic](https://github.com/AutumnsGrove/GroveMusic) | Active |
| **Lattice** | GroveEngine | npm: @autumnsgrove/lattice | [AutumnsGrove/GroveEngine](https://github.com/AutumnsGrove/GroveEngine) | Active |
| **Plant** | Seedbed | plant.grove.place | *(integrated in GroveEngine)* | Active |
| **Rings** | GroveAnalytics | *(integrated)* | *(integrated in GroveEngine)* | Active |
| **Ivy** | GroveMail | ivy.grove.place | [AutumnsGrove/Ivy](https://github.com/AutumnsGrove/Ivy) | Planned |
| **Amber** | GroveStorage | amber.grove.place | [AutumnsGrove/Amber](https://github.com/AutumnsGrove/Amber) | Planned |
| **Shade** | GroveShade | grove.place/shade | *(integrated in GroveEngine)* | Active |
| **Trails** | GroveTrails | username.grove.place/trail | *(integrated in GroveEngine)* | Active |
| **Vineyard** | GroveShowcase | *.grove.place/vineyard | *(integrated in GroveEngine)* | Active |
| **Bloom** | GroveBloom | bloom.grove.place | [AutumnsGrove/GroveBloom](https://github.com/AutumnsGrove/GroveBloom) | Planned |
| **Mycelium** | GroveMCP | mycelium.grove.place | [AutumnsGrove/GroveMCP](https://github.com/AutumnsGrove/GroveMCP) | In Development |
| **Vista** | GroveMonitor | vista.grove.place | [AutumnsGrove/GroveMonitor](https://github.com/AutumnsGrove/GroveMonitor) | Active |
| **Wisp** | GroveWisp | *(integrated)* | *(integrated in GroveEngine)* | Planned |
| **Pantry** | GroveShop | pantry.grove.place | - | Planned |
| **Nook** | GroveNook | nook.grove.place | [AutumnsGrove/Nook](https://github.com/AutumnsGrove/Nook) | Planned |
| **Clearing** | GroveClear | status.grove.place | *(integrated in GroveEngine)* | Active |
| **Waystone** | GroveWaystone | *(integrated)* | *(integrated in GroveEngine)* | Planned |
| **Reeds** | GroveReeds | *(integrated)* | *(integrated in GroveEngine)* | Planned |
| **Porch** | GrovePorch | porch.grove.place | - | Planned |

### Additional Internal Components (Not in Public Naming Doc)

| Public Name | Internal Name | Location | Notes |
|-------------|---------------|----------|-------|
| **Arbor** | GroveArbor | {blog}.grove.place/admin | Admin panel - added Jan 1, 2026, later removed from public naming |
| **Thorn** | GroveThorn | *(integrated)* | Content moderation system |
| **Songbird** | GroveSongbird | *(integrated)* | Prompt injection protection |
| **Loom** | GroveLoom | *(integrated)* | Durable Objects architecture pattern |
| **Prism** | GrovePrism | *(integrated)* | Design system pattern |

---

## Naming Evolution Timeline

### December 30, 2025: Grove Naming System Established
- **Commit:** 7defa51 - "feat: expand landing page content and fix marketing doc category"
- **Action:** Created `docs/grove-naming.md` with initial ecosystem naming
- **Initial Name:** "Cache" for backup system (GroveBackups repository)
- **Established:** Complete internal names table with Grove[Thing] convention

### December 30-31, 2025: Patina Replaces Cache
- **Action:** Backup system renamed from "Cache" to "Patina"
- **Repository:** Changed from GroveBackups to Patina
- **Reasoning:** Better nature metaphor - "a protective layer that forms over time"
- **Commit:** Between 7defa51 and later commits updating the naming doc

### January 1, 2026: Admin Panel Named "Arbor"
- **Commit:** 68ddf93 - "feat: add Grove-themed names to four specification files"
- **Action:** Renamed `admin-panel-spec.md` → `arbor-spec.md`
- **Public Name:** Arbor
- **Internal Name:** GroveArbor
- **Metaphor:** "A garden structure that supports climbing plants"
- **Current Status:** Removed from public naming doc, admin panel is now unnamed/integrated

### January 1, 2026: Other Specs Named
Same commit (68ddf93) also named:
- **Thorn** (GroveThorn) - Content moderation
- **Reeds** (GroveReeds) - Comments system
- **Waystone** (GroveWaystone) - Help center

### January 4, 2026: Vineyard Standalone Deprecated
- **Commit:** 29ac41e - "refactor: archive standalone vineyard and sync landing vineyard"
- **Action:** Archived standalone vineyard.grove.place site
- **Reason:** Vineyard integrated into landing page as /vineyard showcase
- **Location:** `_archived/vineyard-standalone-deprecated-2026-01-04/`

### January 5, 2026: Pantry Shop Added
- **Commit:** 3f99596 - "feat(naming): add Pantry shop and claim reserved subdomains"
- **Action:** Added Pantry, Nook, Clearing, Waystone, Reeds to naming doc
- **Public Name:** Pantry
- **Internal Name:** GroveShop
- **Domain:** pantry.grove.place

### January 6, 2026: Echo Renamed to Porch
- **Commit:** bdcdf25 - "feat(support): rename Echo to Porch, add naming skill"
- **Previous Name:** Echo (GroveSupport) - "Voices carry across the grove"
- **New Name:** Porch (GrovePorch) - "Front porch conversations"
- **Reasoning:** More personal, less corporate than "ticket system"
- **Terminology Change:** "tickets" → "visits"
- **Domain:** Changed from echo.grove.place to porch.grove.place

### January 1, 2026: Pattern Naming Evolution
- **Glass → Prism**
  - Commit: d3ec579 - "docs: rename Glass pattern to Prism"
  - Reasoning: Better describes multi-faceted design system
- **Durable Objects → Loom**
  - Commits: e6aa3dc, 80b09c0 - "feat: rename DO pattern to Loom"
  - Reasoning: More evocative nature metaphor

---

## Repository Mapping

### Active Repositories (Confirmed)

| Repository URL | Public Name | Internal Name | Created |
|----------------|-------------|---------------|---------|
| github.com/AutumnsGrove/GroveEngine | Lattice | GroveEngine | Dec 30, 2025 |
| github.com/AutumnsGrove/GroveAuth | Heartwood | GroveAuth | Before Dec 30, 2025 |
| github.com/AutumnsGrove/Forage | Forage | GroveDomainTool | Before Dec 30, 2025 |
| github.com/AutumnsGrove/Foliage | Foliage | GroveThemes | Before Dec 30, 2025 |
| github.com/AutumnsGrove/Patina | Patina | GrovePatina | ~Dec 31, 2025 |
| github.com/AutumnsGrove/TreasureTrove | Trove | TreasureTrove | Before Dec 30, 2025 |
| github.com/AutumnsGrove/GroveMC | Outpost | GroveMC | Before Dec 30, 2025 |
| github.com/AutumnsGrove/GroveMusic | Aria | GroveMusic | Before Dec 30, 2025 |
| github.com/AutumnsGrove/Ivy | Ivy | GroveMail | Before Dec 30, 2025 |
| github.com/AutumnsGrove/Amber | Amber | GroveStorage | Before Dec 30, 2025 |
| github.com/AutumnsGrove/GroveBloom | Bloom | GroveBloom | Before Dec 30, 2025 |
| github.com/AutumnsGrove/GroveMCP | Mycelium | GroveMCP | Dec 30, 2025 |
| github.com/AutumnsGrove/GroveMonitor | Vista | GroveMonitor | ~Dec 30, 2025 |
| github.com/AutumnsGrove/Nook | Nook | GroveNook | Before Jan 5, 2026 |

### Deprecated/Archived Repositories

| Repository | Status | Archived Date | Reason |
|------------|--------|---------------|--------|
| GroveBackups | Renamed | ~Dec 31, 2025 | Renamed to Patina |

### Integrated Components (No Separate Repo)

These live inside the GroveEngine monorepo:

- **Plant** (Seedbed) - `/plant` directory
- **Rings** (GroveAnalytics) - Integrated in engine
- **Shade** (GroveShade) - Integrated in engine
- **Trails** (GroveTrails) - Integrated in engine
- **Vineyard** (GroveShowcase) - Integrated in landing page
- **Clearing** (GroveClear) - `/clearing` directory
- **Wisp** (GroveWisp) - Integrated in engine editor
- **Waystone** (GroveWaystone) - Integrated in engine
- **Reeds** (GroveReeds) - Integrated in engine
- **Arbor** (GroveArbor) - Integrated in engine admin
- **Thorn** (GroveThorn) - Integrated in engine
- **Songbird** (GroveSongbird) - Integrated in engine
- **Loom** (GroveLoom) - Architecture pattern in engine
- **Prism** (GrovePrism) - Design system pattern in engine

---

## Vineyard Special Case: Standalone → Integrated

**History:**
1. **Dec 30, 2025:** Vineyard created as external component library
   - Linked as `@autumnsgrove/vineyard` package
   - Referenced via `link:../../../Vineyard` in package.json
   - Intended as independent npm package

2. **Dec 30, 2025:** Standalone site created
   - `vineyard.grove.place` as dedicated showcase
   - Directory: `/vineyard`

3. **Jan 4, 2026:** Standalone deprecated
   - Commit: 29ac41e
   - Archived to `_archived/vineyard-standalone-deprecated-2026-01-04/`
   - Vineyard integrated into landing page as `/vineyard` route
   - Became showcase pattern rather than independent product

**Current Status:** Vineyard is the **documentation and demo pattern** for Grove tools. Each product gets its own `/vineyard` route (e.g., `amber.grove.place/vineyard`). The standalone vineyard.grove.place site was replaced with landing page integration.

---

## Plant Special Case: Public Name Evolution

**Internal Name:** Seedbed (established Dec 30, 2025)
**Public Name:** Plant (established later)

**Timeline:**
- **Dec 30, 2025:** Internal name "Seedbed" established in grove-naming.md
- **Later:** Public name changed to "Plant" for clarity
- **Commit:** 50fb381 - "docs: establish Plant as public name (Seedbed as internal)"

**Reasoning:** "Plant" is more active and clear for onboarding action. "Seedbed" remains as internal codename for consistency with Grove[Thing] pattern.

---

## Cases Where Internal Name Came Before Public Name

In most cases, the internal `Grove[Thing]` names existed **before** the public nature-themed names:

1. **GroveEngine → Lattice**
   - Repository created as "GroveEngine"
   - Public name "Lattice" applied Dec 30, 2025
   - npm package: `@autumnsgrove/groveengine`
   - Public branding: "Lattice"

2. **Seedbed → Plant**
   - Internal name existed first
   - Public name refined for clarity

3. **GroveSupport/Echo → Porch**
   - Initial public name "Echo" (Jan 5, 2026)
   - Renamed to "Porch" (Jan 6, 2026)
   - Internal name may have been GroveSupport initially

4. **GroveBackups → Patina**
   - Repository existed as "GroveBackups"
   - Public name refined to "Patina" ~Dec 31, 2025

**Pattern:** Most Grove services start with functional `Grove[Thing]` internal names during development, then receive nature-themed public names when ready for launch or documentation.

---

## Reserved Subdomains (Claimed Jan 5, 2026)

Commit 3f99596 reserved these subdomains in `grove-router`:

- pantry.grove.place
- nook.grove.place
- trove.grove.place
- bloom.grove.place
- vista.grove.place
- foliage.grove.place
- status.grove.place (Clearing)
- clearing.grove.place
- mc.grove.place (Outpost)
- search.grove.place

---

## Git History Insights

### Repository Age
- **First Commit:** December 30, 2025 (commit 7defa51)
- **Total Commits:** 349 (as of Jan 6, 2026)
- **Age:** Approximately 7 days old

### Major Naming Milestones
1. **Dec 30, 2025:** Comprehensive naming system established
2. **Dec 31, 2025:** Patina replaces Cache
3. **Jan 1, 2026:** Arbor, Thorn, Reeds, Waystone named
4. **Jan 4, 2026:** Vineyard standalone deprecated
5. **Jan 5, 2026:** Pantry, Nook, Clearing, Waystone, Reeds added
6. **Jan 6, 2026:** Echo renamed to Porch

### Naming Philosophy Establishment
The naming philosophy was documented from the start:
> "A forest of voices. Every user is a tree in the grove."

Core principles established Dec 30, 2025:
- Names draw from nature: forests, growth, shelter, connection
- Not about trees directly—about what happens in/around the forest
- Dual naming: warm public names + functional internal names
- Internal names useful "at 2am when something breaks"

---

## Prism/Groveview Investigation

**Finding:** No evidence of "Groveview" as a historical name.

**Prism History:**
- Previously called "Glass" pattern
- Renamed to "Prism" on Jan 1, 2026
- Commit: d3ec579 - "docs: rename Glass pattern to Prism"
- **Public Name:** Prism
- **Internal Name:** GrovePrism
- **Purpose:** Grove's design system pattern
- **Description:** "Multi-tenant data isolation & access control" pattern with glassmorphism styling

**Conclusion:** Prism was never an independent npm package. It's an architecture pattern documented in `/docs/patterns/prism-pattern.md`. The "Glass" → "Prism" rename was for better metaphor clarity.

---

## Naming Skill Created

**Date:** January 6, 2026
**Commit:** bdcdf25
**Skill:** `walking-through-the-grove`

A naming ritual for the Grove ecosystem. Documents the process for finding nature-themed names that fit. Includes:
- Reading the naming philosophy
- Creating visualization scratchpads
- ASCII art of the grove
- Questions to ask when naming
- The journey process (not just a checklist)

**Location:** `.claude/skills/walking-through-the-grove/SKILL.md`

This skill was created alongside the Echo → Porch rename to document the naming process for future services.

---

## Summary Statistics

- **Total Services:** 26 public-facing services
- **Active Repositories:** 14 confirmed
- **Integrated Components:** 12+ within GroveEngine monorepo
- **Renamed Services:** 4 (Cache→Patina, Echo→Porch, Glass→Prism, Seedbed→Plant)
- **Deprecated Projects:** 1 (vineyard-standalone)
- **Documentation Start Date:** December 30, 2025
- **Repository Age:** 7 days (349 commits)

---

## Research Methodology

This research was conducted by:

1. Reading `/home/user/GroveEngine/docs/grove-naming.md` (current state)
2. Analyzing all `package.json` files for repository references
3. Searching git history for:
   - First mentions of each internal name
   - Renaming commits (`rename`, `formerly`, `was called`)
   - Repository references
   - Specific service names (GroveSocial, GroveDomainTool, etc.)
4. Examining commit timeline from earliest to latest
5. Checking archived directories for historical context
6. Analyzing pattern documents for architectural naming

**Commands Used:**
- `git log --all --oneline --grep="pattern"`
- `git log --all --reverse -p -S "ServiceName"`
- `grep -r "github.com/AutumnsGrove"`
- Analysis of 349 commits spanning 7 days

---

**Research Completed:** January 6, 2026
**Researcher:** Claude (Sonnet 4.5)
**Repository:** github.com/AutumnsGrove/GroveEngine
