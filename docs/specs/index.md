---
lastUpdated: '2026-02-25'
aliases: []
date created: Thursday, January 2nd 2026
date modified: Tuesday, February 25th 2026
tags:
  - specifications
  - architecture
  - components
type: index
---

```
         /\
        /  \
       /____\
         |
      ___|___
     |       |
     | SPECS |
     |_______|
         |
    ╱────┼────╲
   ╱     │     ╲
  ⟿     ⟿     ⟿
Core  Tools  Docs
```

> *All paths through the grove*

---

# Grove Specifications

68 technical specifications covering every component, service, and tool in the Grove ecosystem. Organized by domain, linked to source files, kept current.

---

## Core Specifications

### Foundation & Infrastructure

| Specification | Purpose | Status |
|---------------|---------|--------|
| **[Lattice](lattice-spec.md)** | Core framework and multi-tenant engine | Active |
| ~~[Engine](engine-spec.md)~~ | ~~Blog rendering and content management~~ | Deprecated (merged into Lattice) |
| **[Heartwood](heartwood-spec.md)** | Centralized authentication service | Active |
| **[Passage](passage-spec.md)** | Subdomain routing infrastructure | Active |
| **[Plant](plant-spec.md)** | Tenant onboarding and signup flow | Active |
| **[Grafts](grafts-spec.md)** | Per-tenant feature customization | Active |
| **[Threshold](threshold-spec.md)** | Unified rate limiting SDK | Active |
| **[Burrow](burrow-spec.md)** | Cross-property access for greenhouse-mode | Active |
| **[Grove Garden Bloom](grove-garden-bloom-spec.md)** | Foundational terminology for spaces, collections, content | Active |
| **[File Formats](file-formats-spec.md)** | Custom .grove and .foliage ZIP-based file formats | Active |
| **[Grove Types](grove-types-spec.md)** | Type safety at boundaries, cast elimination, type unification | Active |

### Monitoring & Analytics

| Specification | Purpose | Status |
|---------------|---------|--------|
| **[Vista](vista-spec.md)** | Infrastructure monitoring dashboard | Active |
| **[Vista Observability](vista-observability.md)** | Observability dashboard implementation details | Active |
| **[Vista LoadTest](vista-loadtest-spec.md)** | Load testing integration | Active |
| **[Rings](rings-spec.md)** | Privacy-first analytics system | Active |
| **[Vineyard](vineyard-spec.md)** | Component showcase and load test integration | Active |
| **[Glimpse](glimpse-spec.md)** | Automated screenshot capture via Playwright | Active |

### Customization & Theming

| Specification | Purpose | Status |
|---------------|---------|--------|
| **[Foliage](foliage-project-spec.md)** | Theme system and visual customization | Active |
| **[Terrarium](terrarium-spec.md)** | Creative canvas for scene composition | Active |
| **[Weave](weave-spec.md)** | Visual composition studio (node-graph) | Active |
| **[Curios](curios-spec.md)** | Cabinet of wonders and personal touches | Active |
| **[Reverie](reverie-spec.md)** | AI-powered composition layer | Planned |
| **[Gossamer](gossamer-spec.md)** | ASCII visual effects for Glass UI | Active |

---

## Content & Community

### Social Layer

| Specification | Purpose | Status |
|---------------|---------|--------|
| **[Meadow](meadow-spec.md)** | Community feed and social features | In Development |
| **[Blazes](blazes-spec.md)** | Content type indicators for Meadow posts | Planned |
| **[Meadow Loom](meadow-loom-spec.md)** | Durable Object coordination for community feed | Active |
| **[Reeds](reeds-spec.md)** | Comments system | Active |
| **[Canopy](canopy-spec.md)** | Opt-in wanderer directory for discovery | Active |
| **[Forests](forests-spec.md)** | Community aggregators and neighborhoods | Planned |
| **[Wander](wander-spec.md)** | First-person grove discovery experience | Planned |

### Content Tools

| Specification | Purpose | Status |
|---------------|---------|--------|
| **[Flow](flow-spec.md)** | Immersive Markdown editor | Active |
| **[Arbor](arbor-spec.md)** | Admin panel and content management | Active |
| **[Arbor Panel Refactor](arbor-panel-refactor-spec.md)** | ArborPanel component extraction | Implemented |
| **[Trails](trails-spec.md)** | Personal roadmaps and build-in-public | Planned |
| **[Trace](trace-spec.md)** | Inline feedback component for wanderers | Active |
| **[Etch](etch-spec.md)** | Link saving, highlights, and curation | Active |

### Commerce & Support

| Specification | Purpose | Status |
|---------------|---------|--------|
| **[Pantry](pantry-spec.md)** | Shop, merchandise, and provisioning | Active |
| **[Porch](porch-spec.md)** | Front porch conversations and support | Active |
| **[Waystone](waystone-spec.md)** | Help center and contextual documentation | Planned |
| **[Wanderer Plan](wanderer-plan-spec.md)** | Free blog tier for trying Grove | Active |
| **[Centennial](centennial-spec.md)** | 100-year domain preservation | Planned |

---

## Tools & Services

### Media & Storage

| Specification | Purpose | Status |
|---------------|---------|--------|
| **[Amber](amber-spec.md)** | Storage management and optimization | Active |
| **[Amber Sync](amber-sync-spec.md)** | Cross-device synchronization for vaults | Planned |
| **[Press](press-spec.md)** | Image processing CLI | Active |
| **[Nook](nook-spec.md)** | Private video sharing | Planned |

### Communication

| Specification | Purpose | Status |
|---------------|---------|--------|
| **[Zephyr](zephyr-spec.md)** | Unified email gateway | Planned |
| **[Zephyr Social](zephyr-social-spec.md)** | Cross-platform social broadcasting | Planned |
| **[Ivy](ivy-mail-spec.md)** | Grove mail client for @grove.place | Planned |

### Discovery & Domains

| Specification | Purpose | Status |
|---------------|---------|--------|
| **[Forage](forage-spec.md)** | AI-powered domain discovery | Active |
| **[Loam](loam-spec.md)** | Username and name protection | Active |
| **[Website](website-spec.md)** | Public marketing site and landing pages | Active |

### Developer Tools

| Specification | Purpose | Status |
|---------------|---------|--------|
| **[gw CLI](gw-cli-spec.md)** | GroveWrap infrastructure CLI for D1, KV, R2 | Active |
| **[Seasons](seasons-spec.md)** | Semantic versioning and release workflow | Active |
| ~~[Versioning](versioning-spec.md)~~ | ~~npm publishing workflow~~ | Deprecated (merged into Seasons) |
| **[Testing](testing-spec.md)** | Testing strategy and infrastructure | Active |
| **[Clearing](clearing-spec.md)** | Data export and migration tools | Active |

---

## Security & Operations

### Authentication & Access

| Specification | Purpose | Status |
|---------------|---------|--------|
| **[Heartwood](heartwood-spec.md)** | Centralized authentication | Active |
| **[Warden](warden-spec.md)** | External API gateway with secure credential injection | Active |
| **[Shade](shade-spec.md)** | AI content protection and crawler defense | Active |

### Content Safety

| Specification | Purpose | Status |
|---------------|---------|--------|
| **[Thorn](thorn-spec.md)** | Content moderation and compliance | Active |
| **[Petal](petal-spec.md)** | Privacy-first image moderation | Active |

### Infrastructure

| Specification | Purpose | Status |
|---------------|---------|--------|
| **[Mycelium](mycelium-spec.md)** | MCP server and service integration | Active |
| **[Patina](patina-spec.md)** | Backup and disaster recovery | Active |
| **[Passage](passage-spec.md)** | Subdomain routing | Active |
| **[Threshold](threshold-spec.md)** | Rate limiting SDK | Active |

---

## AI & Machine Learning

| Specification | Purpose | Status |
|---------------|---------|--------|
| **[Lumen](lumen-spec.md)** | Unified AI routing layer with task-based provider selection | Active |
| **[AI Gateway](../developer/integration/grove-ai-gateway-integration.md)** | Central AI observability and per-tenant quota management | Active |
| **[Wisp](wisp-spec.md)** | Ethical writing assistant | Planned |
| **[Scribe](scribe-voice-transcription-spec.md)** | Voice-to-text transcription via Lumen | Active |
| **[Shutter](shutter-spec.md)** | Web content distillation with prompt injection defense | Active |
| **[Release Summaries](release-summaries-spec.md)** | Automated LLM release note generation | Active |
| **[Verge](verge-spec.md)** | Serverless autonomous coding agent | Active |
| **[Firefly SDK](firefly-sdk-spec.md)** | Ephemeral server provisioning SDK | Active |
| **[Queen Firefly](queen-firefly-coordinator-spec.md)** | Pool coordinator for Firefly CI/CD instances | Active |

---

## Reference & Implementation Plans

| Specification | Purpose | Status |
|---------------|---------|--------|
| **[Customer Repository](customer-repo-spec.md)** | Template structure for customer repos | Reference |
| **[Fiction House Publishing](fiction-house-publishing-spec.md)** | Publishing house client site | Client |
| **[Tenant Onboarding Plan](tenant-onboarding-implementation-plan.md)** | Detailed onboarding implementation guide | Reference |

---

## Implementation Roadmap

### Phase 1: Core Infrastructure (Complete)
- [x] Lattice framework
- [x] Engine blog rendering
- [x] Vista monitoring
- [x] Rings analytics

### Phase 2: Security & Scale (Current)
- [x] Threshold rate limiting
- [x] Sentinel load testing
- [x] Vineyard integration
- [x] Mycelium MCP server
- [-] Heartwood authentication hardening
- [-] Patina backup automation

### Phase 3: Community & Growth (Q1-Q2 2026)
- [-] Meadow community feed
  - [ ] Blazes content type indicators
- [ ] Bloom newsletters
- [ ] Arbor theme marketplace
- [ ] Thorn content moderation
- [ ] Canopy directory
- [ ] Forests community aggregation

---

## Related Documentation

### Patterns
- [Patterns Index](../patterns/index.md) - Architectural patterns
- [Threshold Pattern](../patterns/threshold-pattern.md) - Rate limiting
- [Sentinel Pattern](../patterns/sentinel-pattern.md) - Load testing
- [Loom Pattern](../patterns/loom-durable-objects-pattern.md) - DO coordination

### Guides
- [Rate Limiting Guide](../guides/rate-limiting-guide.md) - Threshold implementation
- [Load Testing Guide](../guides/load-testing-guide.md) - Sentinel implementation
- [Tenant Setup Guide](../tenant-setup-guide.md) - Multi-tenant configuration

### Architecture
- [Multi-Tenant Architecture](../multi-tenant-architecture.md) - Core architecture
- [Cloudflare Architecture](../cloudflare-architecture-guide.md) - Infrastructure
- [Project Organization](../project-organization.md) - Codebase structure

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-21 | 3.0 | Full audit: added 24 missing specs, fixed broken links, reorganized categories |
| 2026-01-25 | 2.6 | Added Flow spec; corrected Arbor description |
| 2026-01-20 | 2.5 | Added Grafts spec |
| 2026-01-14 | 2.4 | Added 19 missing specs |
| 2026-01-13 | 2.3 | Added Shutter spec |
| 2026-01-06 | 2.2 | Added Porch spec (renamed from Echo) |
| 2026-01-06 | 2.1 | Added Pantry spec; added Commerce & Community section |
| 2026-01-02 | 2.0 | Added Vineyard, Vista LoadTest specs; updated integration matrix |
| 2025-12-25 | 1.5 | Added Mycelium, Patina, Renovate specs |
| 2025-11-30 | 1.0 | Initial specifications collection |

---

*Last Updated: February 2026*
*Part of the Grove Technical Documentation*
