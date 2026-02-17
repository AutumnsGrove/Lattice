---
published: false
lastUpdated: "2026-01-25"
---

# Grove Ecosystem Naming History Research

> **Research Date:** January 6, 2026
> **Purpose:** Document the naming origins, renames, and evolution of all Grove services, tools, and patterns

---

## Executive Summary

The Grove naming philosophy document (`docs/grove-naming.md`) was created on **December 30, 2025** (commit `7defa51`). The major naming standardization occurred on **January 1, 2026** (commit `95a834b`), when 10 specification files were renamed to use Grove-themed names instead of functional names.

The ecosystem has undergone several significant renames to align with the forest/nature metaphor, with the most recent being **Porch** (formerly Echo) on January 6, 2026.

---

## The Naming Philosophy Document

**File:** `docs/grove-naming.md`
**Created:** December 30, 2025 (commit `7defa51`)
**Last Updated:** January 6, 2026

This document establishes the philosophical foundation for naming in the Grove ecosystem, emphasizing names drawn from forests, growth, shelter, and connection rather than functional descriptions.

---

## Complete Naming History by Service

### Core Infrastructure

#### **Lattice**

- **Original Name:** Lattice (internal), engine-spec.md
- **Renamed:** January 1, 2026 (commit `95a834b`)
- **Internal Name:** Lattice (still used for repository, infrastructure)
- **Public Name:** Lattice
- **NPM Package:** `@autumnsgrove/lattice`
- **Philosophy:** A lattice is the framework that supports growth—vines climb it, gardens are built around it
- **First Spec:** December 30, 2025 (as engine-spec.md)

### Platform Services

#### **Heartwood**

- **Original Name:** GroveAuth (repository name remains)
- **Repository:** [AutumnsGrove/GroveAuth](https://github.com/AutumnsGrove/GroveAuth)
- **First Mentioned:** December 30, 2025 in grove-naming.md
- **No rename:** Created with Heartwood name
- **Philosophy:** The densest, most durable part at the center of a tree—the authentic core

#### **Arbor**

- **Original Name:** admin-panel-spec.md
- **Renamed:** January 1, 2026 (commit `68ddf93`)
- **Sub-rename:** Gutter → Vines on January 5, 2026 (commit `5e47c6c`)
- **Status:** Live
- **Philosophy:** Admin panel for managing blog content
- **Note:** The gutter widgets were renamed to "Vines" to align with the Lattice metaphor (vines climb the lattice)

#### **Plant**

- **Original Name:** tenant-onboarding-spec.md, Seedbed
- **Renamed:** January 1, 2026 (commit `95a834b`)
- **Established:** Public name "Plant", internal name "Seedbed" (commit `50fb381`)
- **Philosophy:** Where seeds are planted and nurtured until ready to grow on their own
- **First Spec:** December 30, 2025

#### **Amber**

- **Repository:** [AutumnsGrove/Amber](https://github.com/AutumnsGrove/Amber)
- **First Mentioned:** December 30, 2025 in grove-naming.md
- **No rename:** Created with Amber name
- **Philosophy:** Fossilized tree resin that preserves moments in time

#### **Pantry**

- **First Spec:** December 31, 2025 (commit `d907316`)
- **Workshop Added:** December 31, 2025 (commit `09e5b97`)
- **Subdomain Claimed:** December 31, 2025 (commit `3f99596`)
- **No previous name:** Created as Pantry
- **Philosophy:** Where you keep what sustains you—a cupboard in a warm kitchen

#### **Foliage**

- **Repository:** [AutumnsGrove/Foliage](https://github.com/AutumnsGrove/Foliage)
- **Spec Synced:** December 31, 2025 (commit `a8d3f99`)
- **No previous name:** Created as Foliage
- **Note:** Canopy was removed January 1, 2026 as redundant with Foliage (commit `31444c4`)
- **Philosophy:** What you see when you look at a tree—the leaves, color, personality

#### **Terrarium**

- **First Spec:** December 31, 2025 (commit `67ed06d`)
- **Workshop Added:** December 30, 2025 (commit `ae42cd0`)
- **MVP Implemented:** December 31, 2025 (commit `6506e7c`)
- **No previous name:** Created as Terrarium
- **Philosophy:** A sealed world under glass—a miniature ecosystem you design and arrange

#### **Rings**

- **Original Name:** analytics-spec.md
- **Renamed:** January 1, 2026 (commit `95a834b`)
- **First Spec:** December 30, 2025
- **Philosophy:** Count the rings to learn a tree's story—private insights about growth

#### **Clearing**

- **Original Name:** status-page-spec.md
- **Renamed:** January 1, 2026 (commit `95a834b`)
- **Frontend Added:** December 31, 2025 (commit `aa793b0`)
- **Status:** Live
- **Philosophy:** An open space where visibility opens up—transparent platform health

#### **Waystone**

- **Original Name:** help-center-spec.md
- **Renamed:** January 1, 2026 (commit `68ddf93`)
- **First Spec:** December 30, 2025
- **Philosophy:** Trail markers travelers leave along forest paths

#### **Porch**

- **Original Name:** Echo
- **Renamed:** January 6, 2026 (commit `bdcdf25`)
- **Echo Created:** December 31, 2025 (commit `849075a`)
- **Philosophy:** Where you sit and talk—not a ticket counter but two people on a porch
- **Note:** Most recent rename in the ecosystem
- **Naming Skill Added:** walking-through-the-grove skill created with this rename

### Content & Community

#### **Wisp**

- **Original Name:** ai-writing-assistant-spec.md
- **Renamed:** January 1, 2026 (commit `95a834b`)
- **Fireside Mode Added:** December 31, 2025 (commit `537f64c`)
- **First Spec:** December 30, 2025
- **Philosophy:** A will-o'-the-wisp—gentle, ephemeral light that guides without forcing
- **Sub-feature:** Fireside (conversation mode for writers who freeze at blank page)

#### **Reeds**

- **Original Name:** comments-spec.md
- **Renamed:** January 1, 2026 (commit `68ddf93`)
- **First Spec:** December 30, 2025
- **Philosophy:** Reeds swaying together at the water's edge—gentle murmur of community

#### **Thorn**

- **Original Name:** CONTENT-MODERATION.md
- **Renamed:** January 1, 2026 (commit `68ddf93`)
- **Songbird Integration:** January 1, 2026 (commit `1141436`)
- **First Spec:** December 30, 2025
- **Philosophy:** Content moderation system integrated with Songbird prompt injection protection

#### **Meadow**

- **Original Name:** social-spec.md
- **Renamed:** January 1, 2026 (commit `95a834b`)
- **Landing Page Added:** January 2, 2026 (commit `7e58368`)
- **First Spec:** December 30, 2025
- **Philosophy:** Where the forest opens up—social media that remembers what "social" means

#### **Trails**

- **First Spec:** December 30, 2025 (commit `7defa51`)
- **No previous name:** Created as Trails
- **Philosophy:** Personal roadmaps—the path you're walking through the forest

### Standalone Tools

#### **Ivy**

- **Repository:** [AutumnsGrove/Ivy](https://github.com/AutumnsGrove/Ivy)
- **First Mentioned:** December 30, 2025 in grove-naming.md
- **No previous name:** Created as Ivy
- **Philosophy:** Climbs the lattice—living connection that grows along the framework

#### **Bloom**

- **Repository:** [AutumnsGrove/GroveBloom](https://github.com/AutumnsGrove/GroveBloom)
- **First Spec:** December 30, 2025 (commit `7defa51`)
- **No previous name:** Created as Bloom
- **Philosophy:** Brief, brilliant moment when a flower opens—ephemeral serverless infrastructure

#### **Forage**

- **Repository:** [AutumnsGrove/Forage](https://github.com/AutumnsGrove/Forage)
- **First Mentioned:** December 30, 2025 in grove-naming.md
- **No previous name:** Created as Forage
- **Philosophy:** Searching the forest floor for what you need—domain discovery

#### **Nook**

- **Repository:** [AutumnsGrove/Nook](https://github.com/AutumnsGrove/Nook)
- **First Mentioned:** December 30, 2025 in grove-naming.md
- **No previous name:** Created as Nook
- **Philosophy:** A tucked-away corner—intimate, private video sharing

#### **Outpost**

- **Repository:** [AutumnsGrove/GroveMC](https://github.com/AutumnsGrove/GroveMC)
- **First Mentioned:** December 30, 2025 in grove-naming.md
- **No previous name:** Created as Outpost
- **Philosophy:** Where you gather at the edge of wilderness—on-demand Minecraft server

### Operations

#### **Vista**

- **Original Name:** GroveMonitor (internal)
- **Repository:** [AutumnsGrove/GroveMonitor](https://github.com/AutumnsGrove/GroveMonitor)
- **First Spec:** December 31, 2025 (commit `c81e6d2`)
- **No functional rename:** Created with Vista name
- **Philosophy:** A clearing where the canopy opens—infrastructure observability

#### **Patina**

- **Original Name:** Cache
- **Repository:** [AutumnsGrove/Patina](https://github.com/AutumnsGrove/Patina)
- **Cache Spec Added:** December 31, 2025 (commit `41d32fb` from GroveBackups repo)
- **Renamed:** Unclear exact date, but Patina used by December 30, 2025
- **Philosophy:** Thin protective layer that forms over time—backup system
- **Note:** Repository was originally GroveBackups, spec was cache-spec.md

#### **Mycelium**

- **Repository:** [AutumnsGrove/GroveMCP](https://github.com/AutumnsGrove/GroveMCP)
- **First Mentioned:** December 30, 2025 in grove-naming.md
- **No previous name:** Created as Mycelium
- **Philosophy:** The wood wide web—invisible fungal threads connecting the entire ecosystem
- **Status:** In development

#### **Shade**

- **First Spec:** December 30, 2025 (commit `7defa51`)
- **No previous name:** Created as Shade
- **Philosophy:** Cool relief beneath the canopy—protection from AI crawlers and scrapers

#### **CDN Uploader**

- **Status:** Not renamed to Grove name yet
- **Note:** Appears in Workshop categorization (commit `1a9ed22`)
- **Functional name still in use**

### Architecture Patterns

#### **Prism**

- **Original Name:** Glass
- **Created as Glass:** January 2, 2026 (commit `fe6b5f7`)
- **Renamed to Prism:** January 2, 2026 (commit `d3ec579`)
- **Note:** Renamed same day it was created
- **Philosophy:** Design pattern for Grove's glassmorphism UI system
- **File:** `docs/patterns/prism-pattern.md`

#### **Loom**

- **Original Name:** Durable Objects pattern, grove-durable-objects-architecture.md
- **Renamed:** January 1, 2026 (commit `80b09c0`)
- **File:** `docs/patterns/loom-durable-objects-pattern.md`
- **Philosophy:** Durable Objects architecture for auth, coordination, and real-time features

#### **Threshold**

- **First Added:** January 2, 2026 (commit `9223b54`)
- **No previous name:** Created as Threshold
- **Philosophy:** Authentication/authorization pattern
- **Integration Plan:** Created January 2, 2026 (commit `d754d76`)

#### **Songbird**

- **First Added:** December 31, 2025 (commit `462bd5a`)
- **Moved to patterns:** January 1, 2026 (commit `cf513cd`)
- **No previous name:** Created as Songbird
- **Philosophy:** Prompt injection protection with Canary, Kestrel, Robin layers
- **File:** `docs/patterns/songbird-pattern.md`

#### **Sentinel**

- **First Added:** January 2, 2026 (commit `9223b54`)
- **No previous name:** Created as Sentinel
- **Added to knowledge base:** January 2, 2026 (commit `30479e3`)
- **Philosophy:** Security and monitoring pattern

#### **Firefly**

- **First Added:** January 1, 2026 (commit `14f66ea`)
- **No previous name:** Created as Firefly
- **Added to knowledge base:** January 2, 2026 (commit `30479e3`)
- **Philosophy:** Ephemeral server pattern—brief lights that appear and disappear

#### **Vineyard**

- **First Spec:** December 30, 2025 (commit `7defa51`)
- **Showcase Site:** December 31, 2025 (commit `1f45133`)
- **No previous name:** Created as Vineyard
- **Philosophy:** Asset & tool showcase—where vines are tended before they're ready
- **Note:** Each tool gets its own `/vineyard` route for documentation and demos

---

## Timeline of Major Naming Events

### December 30, 2025

- **grove-naming.md created** with initial philosophy (commit `7defa51`)
- Initial batch of specs added with functional names:
  - admin-panel-spec.md (→ Arbor)
  - comments-spec.md (→ Reeds)
  - CONTENT-MODERATION.md (→ Thorn)
  - help-center-spec.md (→ Waystone)
  - analytics-spec.md (→ Rings)
  - ai-writing-assistant-spec.md (→ Wisp)
  - status-page-spec.md (→ Clearing)
  - social-spec.md (→ Meadow)
  - tenant-onboarding-spec.md (→ Plant/Seedbed)
  - engine-spec.md (→ Lattice)

### December 31, 2025

- Fireside mode added to Wisp spec
- Cache spec added (→ Patina)
- Vista spec added
- Songbird pattern added
- Echo support system added (→ Porch)
- Pantry spec added
- Terrarium spec added
- Clearing frontend added

### January 1, 2026

- **Major standardization:** 10 spec files renamed to Grove names (commit `95a834b`)
  - engine-spec.md → lattice-spec.md
  - theme-system-spec.md → canopy-spec.md
  - status-page-spec.md → clearing-spec.md
  - social-spec.md → meadow-spec.md
  - analytics-spec.md → rings-spec.md
  - versioning-spec.md → seasons-spec.md
  - tenant-onboarding-spec.md → seedbed-spec.md
  - ai-writing-assistant-spec.md → wisp-spec.md
- **Four additional spec files renamed** (commit `68ddf93`)
  - admin-panel-spec.md → arbor-spec.md
  - comments-spec.md → reeds-spec.md
  - CONTENT-MODERATION.md → thorn-spec.md
  - help-center-spec.md → waystone-spec.md
- **Patterns directory created** (commit `cf513cd`)
- **Loom pattern renamed** from Durable Objects (commit `80b09c0`)
- **Canopy removed** as redundant with Foliage (commit `31444c4`)
- Firefly pattern added
- Plant established as public name, Seedbed as internal

### January 2, 2026

- **Glass pattern created and renamed to Prism** same day (commits `fe6b5f7`, `d3ec579`)
- Sentinel and Firefly patterns added to knowledge base
- Threshold pattern added
- Meadow landing page added

### January 5, 2026

- **Gutter renamed to Vines** in Arbor admin panel (commit `5e47c6c`)

### January 6, 2026

- **Echo renamed to Porch** (commit `bdcdf25`)
- **walking-through-the-grove skill added** to help with future naming decisions

---

## Services That Never Had Functional Names

These services were created with Grove-themed names from the start:

- Heartwood (always been Heartwood, repo name GroveAuth)
- Amber
- Pantry
- Foliage
- Terrarium
- Trails
- Ivy
- Bloom
- Forage
- Nook
- Outpost
- Mycelium
- Shade
- Vineyard
- Threshold (pattern)
- Songbird (pattern)
- Sentinel (pattern)
- Firefly (pattern)

---

## Removed/Deprecated Services

### **Canopy**

- **Created:** January 1, 2026 as theme-system-spec.md → canopy-spec.md
- **Removed:** January 1, 2026 (commit `31444c4`)
- **Reason:** Redundant with Foliage
- **Lifespan:** Less than one day

### **Seasons**

- **Created:** January 1, 2026 as versioning-spec.md → seasons-spec.md
- **Status:** Appears to have been a versioning system
- **Current Status:** Unknown if still active

---

## Internal vs Public Names

| Public Name | Internal/Repo Name | Note                                 |
| ----------- | ------------------ | ------------------------------------ |
| Lattice     | Lattice            | Internal name remains for repository |
| Heartwood   | GroveAuth          | Repository name                      |
| Vista       | GroveMonitor       | Repository name                      |
| Patina      | GrovePatina        | Repository name                      |
| Plant       | Seedbed            | Internal name                        |
| Vines       | Gutter             | Old internal name                    |

---

## Special Features and Sub-Names

### **Vines** (feature of Lattice/Arbor)

- **Original Name:** Gutter
- **Renamed:** January 5, 2026 (commit `5e47c6c`)
- **Philosophy:** Like vines climbing a trellis, they grow alongside posts in the sidebar margins
- **Part of:** Arbor admin panel and Lattice framework

### **Fireside** (mode of Wisp)

- **Added:** December 31, 2025 (commit `537f64c`)
- **Not a separate service:** A conversation mode within Wisp
- **Philosophy:** Creates space where stories emerge for writers who can't start writing

---

## Repository Name Patterns

Most Grove services follow the naming convention:

- **Public Name:** Nature-themed (Forage, Bloom, Nook, etc.)
- **Repository:** Grove[PublicName] or Treasure[Name]
- **Examples:**
  - Bloom → GroveBloom
  - Forage → Forage (standalone)
  - Nook → GroveNook
  - Outpost → GroveMC
  - Mycelium → GroveMCP
  - Vista → GroveMonitor
  - Patina → GrovePatina or GroveBackups (older)

---

## Key Insights

1. **The Big Bang:** Most services received their Grove names in a concentrated period (Dec 30, 2025 - Jan 2, 2026)

2. **Two Waves of Renaming:**
   - Wave 1 (Jan 1): 10 spec files renamed to ecosystem names
   - Wave 2 (Jan 1): 4 additional spec files renamed (Arbor, Reeds, Thorn, Waystone)

3. **Quick Iteration:** Prism was renamed the same day it was created, showing active refinement

4. **Most Recent:** Porch (formerly Echo) on January 6, 2026

5. **Alignment Renames:** Some renames happened for consistency:
   - Gutter → Vines (to match the Lattice metaphor)
   - Glass → Prism (more unique, less generic)
   - Durable Objects → Loom (fits the weaving/connection metaphor)

6. **Naming Philosophy Document:** Created December 30, 2025, establishing the foundation for all subsequent names

7. **Patterns Emergence:** Architecture patterns directory created January 1, 2026, separate from service specs

---

## Notes for Future Naming

The **walking-through-the-grove** skill was added with the Porch rename to help guide future naming decisions. This skill helps walk through the forest metaphor to find where new concepts naturally fit.

**CDN Uploader** remains the only major service without a Grove-themed name as of January 6, 2026.

---

_Research compiled from git history of the Lattice repository_
_Last updated: January 6, 2026_
