# UI Placeholder Investigation

**Created**: January 18, 2026
**Priority**: P2 (Medium - Post-launch feature work)
**Status**: Investigation Complete, Ready for Phased Implementation
**Estimated Effort**: 40-60 hours (full implementation), 4-6 hours (placeholder improvements)

---

## Overview

Two placeholder pages detected in the engine's `(apps)` route group. Both have comprehensive specs but minimal UI implementation.

---

## Page 1: Monitor (Vista)

### Current State

**File**: `libs/engine/src/routes/(apps)/monitor/+page.svelte`

```svelte
<!-- Current placeholder -->
<h1>GroveMonitor</h1>
<p>Uptime monitoring and status pages for your services.</p>
<p class="coming-soon">Monitoring dashboard coming soon.</p>
```

### Intended Purpose

**Vista** is the infrastructure monitoring dashboard. It provides a "single pane of glass" for all Grove services.

**Spec**: `docs/specs/vista-spec.md`

### Key Features (From Spec)

| Feature               | Description                                              |
| --------------------- | -------------------------------------------------------- |
| **Service Grid**      | 9 Workers, 9 D1 databases, 6 R2 buckets, 7 KV namespaces |
| **Real-time Metrics** | Request volume, error rates, latency (p50/p95/p99)       |
| **Historical Data**   | 90-day retention in D1                                   |
| **Uptime Display**    | GitHub-style contribution grid                           |
| **Alerting**          | Email notifications via Resend                           |
| **Cost Tracking**     | Per-resource cost breakdown                              |

### Implementation Phases

#### Phase 1: Enhanced Placeholder (Low Effort)

Update the placeholder with:

- Feature preview mockup
- "Coming in Q2 2026" timeline
- Link to public status page (Clearing)

```svelte
<script>
  import { GlassCard } from '@autumnsgrove/lattice/ui';
</script>

<div class="vista-placeholder">
  <GlassCard>
    <h1>Vista</h1>
    <p class="subtitle">Infrastructure Monitoring Dashboard</p>

    <div class="preview-grid">
      <div class="preview-item">
        <span class="icon">📊</span>
        <span>Real-time metrics</span>
      </div>
      <div class="preview-item">
        <span class="icon">🔔</span>
        <span>Smart alerting</span>
      </div>
      <div class="preview-item">
        <span class="icon">📈</span>
        <span>90-day history</span>
      </div>
    </div>

    <p class="timeline">Coming Q2 2026</p>
    <a href="https://status.grove.place">View public status page</a>
  </GlassCard>
</div>
```

#### Phase 2: MVP Dashboard

- Health check indicators for critical services
- Simple up/down status
- Last 24 hours uptime percentage

#### Phase 3: Full Implementation

Follow `docs/specs/vista-spec.md` for complete implementation.

### Dependencies

- Cloudflare API access for metrics
- D1 database for historical storage
- Resend integration for alerting
- Heartwood authentication (admin-only)

---

## Page 2: Domains (Forage)

### Current State

**File**: `libs/engine/src/routes/(apps)/domains/+page.svelte`

```svelte
<!-- Current placeholder -->
<h1>Domain Search</h1>
<p>Search for available domain names across multiple TLDs.</p>
<p class="coming-soon">Full domain search functionality coming soon.</p>
```

### Intended Purpose

**Forage** is an AI-powered domain discovery tool with a terminal aesthetic.

**Spec**: `docs/specs/forage-spec.md`

### Key Features (From Spec)

| Feature              | Description                                         |
| -------------------- | --------------------------------------------------- |
| **Quiz Interface**   | Terminal-style questionnaire                        |
| **AI Generation**    | Domain suggestions via LLM                          |
| **RDAP Checking**    | Real-time availability verification                 |
| **Batch Processing** | Up to 6 batches of suggestions                      |
| **Pricing Display**  | Registrar pricing for available domains             |
| **Follow-up Quiz**   | Dynamic clarification if first results insufficient |

### Implementation Phases

#### Phase 1: Enhanced Placeholder (Low Effort)

Update with terminal aesthetic preview:

```svelte
<script>
  import { GlassCard } from '@autumnsgrove/lattice/ui';
</script>

<div class="forage-placeholder terminal-aesthetic">
  <GlassCard class="terminal-card">
    <pre class="terminal-header">
┌─────────────────────────────────────┐
│  🌲 Forage - Domain Discovery       │
└─────────────────────────────────────┘</pre>

    <div class="terminal-content">
      <p class="prompt">$ forage search --help</p>
      <p class="output">AI-powered domain name discovery</p>
      <p class="output dim">Find the perfect domain for your project</p>
      <br/>
      <p class="feature">✓ Natural language input</p>
      <p class="feature">✓ Real-time availability checking</p>
      <p class="feature">✓ Price comparison across registrars</p>
      <br/>
      <p class="coming-soon blink">[ Coming Q2 2026 ]</p>
    </div>
  </GlassCard>
</div>
```

#### Phase 2: Basic Search

- Simple text input for domain ideas
- Basic availability check via RDAP
- Display available/taken status

#### Phase 3: Full Implementation

Follow `docs/specs/forage-spec.md` for AI-powered quiz flow.

### Dependencies

- OpenRouter for AI suggestions
- RDAP API access for availability
- Durable Objects for job management
- Terminal UI components

---

## Recommended Short-Term Action

For both pages, implement **Phase 1: Enhanced Placeholder** to:

1. Improve user experience when discovering these routes
2. Set expectations with timeline
3. Showcase intended design aesthetic
4. Remove "broken page" impression

**Estimated effort**: 2-3 hours per page

---

## Files to Modify

| File                                                     | Change               |
| -------------------------------------------------------- | -------------------- |
| `libs/engine/src/routes/(apps)/monitor/+page.svelte` | Enhanced placeholder |
| `libs/engine/src/routes/(apps)/domains/+page.svelte` | Enhanced placeholder |

---

## Related Documents

- Vista spec: `docs/specs/vista-spec.md`
- Forage spec: `docs/specs/forage-spec.md`
- Clearing (status page): `apps/clearing/`
- Grove UI components: `libs/engine/src/lib/ui/`
