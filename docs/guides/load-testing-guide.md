---
date created: Thursday, January 2nd 2026
date modified: Thursday, January 2nd 2026
tags:
  - testing
  - observability
  - performance
  - scalability
type: guide
---

# Load Testing & Scale Validation Guide

Step-by-step guide for implementing and using the Sentinel load testing framework to validate Grove's scalability.

---

## Overview

Sentinel is Grove's realistic load testing and scale validation framework. Unlike synthetic blasts, Sentinel simulates actual user behavior patterns to answer: "At what point does the system stop working gracefully?"

**Key Features:**
- **Realistic traffic profiles** - Simulates actual Grove user behavior
- **Ramp-up testing** - Observes system behavior during scale transitions
- **Multi-vector observation** - Correlates latency, throughput, error rates, and resource usage
- **DO coordination testing** - Specifically tests SessionDO, TenantDO, and PostDO under load
- **Vista integration** - Results feed directly into the monitoring dashboard

---

## Prerequisites

Before running Sentinel tests, ensure you have:

- [ ] Vista monitoring deployed (`vista.grove.place`)
- [ ] Durable Objects enabled (SessionDO, TenantDO, PostDO)
- [ ] Test tenant accounts created
- [ ] Access to Cloudflare Workers for test execution
- [ ] Staging environment (recommended to avoid polluting production data)

---

## Step 1: Understand Grove Traffic Mix

### Why Realistic Testing Matters

Traditional throughput testing (like iperf) shows raw capacity but misses real user experience. Sentinel uses an "application mix" based on actual Grove usage patterns:

### Default Grove Application Mix

| Application | Weight | Description | Key Resources |
|-------------|--------|-------------|---------------|
| `auth-flow` | 10% | OAuth sign-in/sign-out | SessionDO, Heartwood |
| `blog-list` | 25% | Browse tenant's post listing | TenantDO, D1 |
| `post-read` | 35% | Read single blog post | PostDO, D1, Amber/R2 |
| `post-write` | 5% | Create/edit posts (autosave) | TenantDO, D1 |
| `media-upload` | 5% | Upload images | Amber, R2 |
| `media-fetch` | 10% | Load images/assets | R2, CDN |
| `analytics-ping` | 5% | Rings pageview tracking | AnalyticsDO |
| `comment-read` | 3% | Load post comments | PostDO, D1 |
| `comment-write` | 2% | Submit comments | PostDO, D1 |

### Weight Justification

- **35% post-read**: Most users are readers, not writers
- **25% blog-list**: Discovery/browsing behavior  
- **10% auth**: Sessions last ~30 days, but login/logout still happens
- **5% writes**: 1 writer per ~20 readers (typical blog ratio)

---

## Step 2: Configure Test Scenarios

### Scenario Structure

Sentinel scenarios define traffic composition, user simulation, and pass/fail criteria:

```typescript
// Example: Launch Day scenario
export const launchDayScenario: LoadScenario = {
  name: 'launch-day',
  description: 'Simulate a Product Hunt launch or viral post',
  
  applications: [
    { name: 'blog-list', weight: 0.40 },   // Lots of discovery
    { name: 'post-read', weight: 0.45 },   // Reading the viral post
    { name: 'auth-flow', weight: 0.10 },   // New signups
    { name: 'comment-write', weight: 0.05 }, // Engagement
  ],
  
  userProfile: {
    rampUp: { from: 0, to: 1000, duration: '5m' },  // Rapid growth
    peak: { users: 1000, duration: '10m' },         // Sustained attention
    steadyState: { users: 200, duration: '30m' },   // Long tail
    rampDown: { to: 0, duration: '5m' },
  },
  
  assertions: [
    { metric: 'p95_latency_ms', operator: '<', value: 1000 },
    { metric: 'error_rate', operator: '<', value: 0.05 },
    { metric: 'throughput_requests_per_sec', operator: '>', value: 500 },
  ],
};
```

### Core Scenarios

#### 1. **Launch Day** - Viral post scenario
- **Purpose**: Test rapid growth and sustained attention
- **Users**: 0 → 1000 over 5 minutes, sustain for 10 minutes
- **Focus**: Discovery-heavy (blog-list 40%, post-read 45%)

#### 2. **Multi-Tenant Chaos** - Cross-tenant isolation
- **Purpose**: Verify tenant isolation under concurrent load
- **Users**: 0 → 500 over 2 minutes, 5 concurrent tenants
- **Focus**: Higher write ratio (post-write 15%, media-upload 15%)

#### 3. **Auth Stress** - SessionDO validation
- **Purpose**: Hammer authentication system
- **Users**: 0 → 200 over 1 minute
- **Focus**: Heavy auth (auth-flow 70%, session-validate 30%)

---

## Step 3: Implement Ramp-Up Testing

### Three-Phase Methodology

Sentinel uses a structured ramp-up approach:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           RAMP-UP PHASE                                 │
│  Users: 0 → 500 over 2 minutes                                          │
│  Goal: Observe latency increase, find early warning signs               │
│                                                                         │
│  ▲ Users                                                                │
│  │     ╱────                                                            │
│  │   ╱                                                                  │
│  │ ╱                                                                    │
│  └─────────── Time                                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            PEAK PHASE                                   │
│  Users: 500 sustained for 1 minute                                      │
│  Goal: Find breaking points, saturate resources                         │
│                                                                         │
│  ▲ Users                                                                │
│  │        ─────────                                                     │
│  │       │                                                              │
│  │       │                                                              │
│  └─────────── Time                                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         STEADY-STATE PHASE                              │
│  Users: 128 sustained for 5 minutes                                     │
│  Goal: Validate recovery, measure sustainable performance               │
│                                                                         │
│  ▲ Users                                                                │
│  │                                                                      │
│  │        ──────────────────────                                        │
│  │       │                                                              │
│  └─────────── Time                                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

### What to Measure in Each Phase

**Ramp-Up Phase:**
- At what user count does p95 latency start climbing?
- Do any Durable Objects start hibernating/waking rapidly?
- Are D1 queries getting queued?

**Peak Phase:**
- What's the error rate at maximum load?
- Which component saturates first? (CPU, D1, DO storage)
- Do WebSocket connections survive?

**Steady-State Phase:**
- Does latency return to baseline after peak?
- Any lingering degradation?
- Memory pressure resolved?

---

## Step 4: Configure Application Profiles

### Example: Post-Read Application

```typescript
export const postReadApp: ApplicationProfile = {
  name: 'post-read',
  
  steps: [
    {
      name: 'fetch-post',
      request: {
        method: 'GET',
        url: 'https://{{tenant}}.grove.place/{{slug}}',
      },
      expect: { 
        status: 200, 
        latencyMs: { p95: 400 } 
      },
    },
    {
      name: 'fetch-reactions',
      request: {
        method: 'GET',
        url: 'https://{{tenant}}.grove.place/api/posts/{{postId}}/reactions',
      },
      expect: { 
        status: 200, 
        latencyMs: { p95: 100 } 
      },
      parallel: true,  // Runs in parallel with comments
    },
    {
      name: 'fetch-comments',
      request: {
        method: 'GET',
        url: 'https://{{tenant}}.grove.place/api/posts/{{postId}}/comments',
      },
      expect: { 
        status: 200, 
        latencyMs: { p95: 150 } 
      },
      parallel: true,
    },
    {
      name: 'analytics-ping',
      request: {
        method: 'POST',
        url: 'https://rings.grove.place/track',
        body: { 
          event: 'page_view', 
          tenant: '{{tenant}}', 
          path: '/{{slug}}' 
        },
      },
      expect: { status: 204 },
      background: true,  // Fire-and-forget
    },
  ],
  
  doInteractions: [
    { do: 'TenantDO', pattern: 'read-heavy', id: 'tenant:{{tenant}}' },
    { do: 'PostDO', pattern: 'read-heavy', id: 'post:{{tenant}}:{{postId}}' },
    { do: 'AnalyticsDO', pattern: 'write-append', id: 'analytics:{{tenant}}:{{date}}' },
  ],
};
```

### Available Application Profiles

1. **auth-flow**: OAuth sign-in/sign-out flow
2. **blog-list**: Browse tenant's post listing  
3. **post-read**: Read single blog post with reactions/comments
4. **post-write**: Create/edit posts with autosave
5. **media-upload**: Upload images to R2
6. **media-fetch**: Load images/assets from CDN
7. **analytics-ping**: Rings pageview tracking
8. **comment-read/write**: Comment system interactions

---

## Step 5: Test Durable Object Coordination

### SessionDO Fan-Out Test

```typescript
// Test SessionDO fan-out
async function testSessionDOFanout(ctx: TestContext) {
  const userIds = generateTestUserIds(100);
  
  // Simulate 100 users validating sessions simultaneously
  const start = Date.now();
  const results = await Promise.allSettled(
    userIds.map(userId => {
      const sessionDO = ctx.env.SESSIONS.get(
        ctx.env.SESSIONS.idFromName(`session:${userId}`)
      );
      return sessionDO.validateSession(userId);
    })
  );
  const duration = Date.now() - start;
  
  // Analyze: DO cold starts, coalescing, errors
  const analysis = {
    totalRequests: results.length,
    successful: results.filter(r => r.status === 'fulfilled').length,
    failed: results.filter(r => r.status === 'rejected').length,
    totalDuration: duration,
    avgLatencyPerDO: duration / results.length,
  };
  
  return analysis;
}
```

### TenantDO Isolation Test

```typescript
// Test TenantDO under multi-tenant load
async function testTenantDOIsolation(ctx: TestContext) {
  const tenants = ['alice', 'bob', 'carol', 'dave', 'eve'];
  
  // Each tenant gets hit with 100 requests simultaneously
  const results = await Promise.allSettled(
    tenants.flatMap(tenant => 
      Array(100).fill(null).map(() => {
        const tenantDO = ctx.env.TENANTS.get(
          ctx.env.TENANTS.idFromName(`tenant:${tenant}`)
        );
        return tenantDO.getConfig();
      })
    )
  );
  
  // Verify: No cross-tenant data leakage
  // Verify: Each tenant's DO handled its own requests
  // Measure: Per-tenant latency distribution
}
```

### PostDO Race Condition Test

```typescript
// Test PostDO reaction race conditions
async function testPostDOReactionRace(ctx: TestContext) {
  const postDO = ctx.env.POSTS.get(
    ctx.env.POSTS.idFromName('post:testTenant:testPost')
  );
  
  // 50 users try to toggle the same reaction simultaneously
  const users = generateTestUserIds(50);
  const results = await Promise.allSettled(
    users.map(userId => postDO.toggleReaction(userId, 'like'))
  );
  
  // Verify: Final count is correct (atomic operations)
  const finalCount = await postDO.getReactionCounts();
  
  // All 50 should have succeeded, count should be 50
  assert(finalCount.get('like') === 50, 'Reaction count race condition!');
}
```

---

## Step 6: Configure Metrics Collection

### Real-Time Metrics

Sentinel collects comprehensive metrics during tests:

```typescript
interface SentinelMetrics {
  timestamp: number;
  
  // User simulation
  activeUsers: number;
  connectionsPerSecond: number;
  
  // Throughput
  requestsPerSecond: number;
  bytesPerSecond: number;
  
  // Latency distribution
  latency: {
    p50: number;
    p95: number;
    p99: number;
    max: number;
  };
  
  // Error tracking
  errorRate: number;
  errorsByType: Map<string, number>;
  
  // DO-specific metrics
  doMetrics: {
    sessionDO: { wakeRate: number; avgLatency: number };
    tenantDO: { wakeRate: number; avgLatency: number };
    postDO: { wakeRate: number; avgLatency: number };
  };
  
  // D1 metrics (via Loom batching)
  d1Metrics: {
    queriesPerSecond: number;
    batchedWritesPerSecond: number;
    avgQueryLatency: number;
    rowsReadPerSecond: number;
    rowsWrittenPerSecond: number;
  };
  
  // R2/Amber metrics
  storageMetrics: {
    readsPerSecond: number;
    writesPerSecond: number;
    bytesTransferred: number;
  };
}
```

### Aggregated Test Results

After test completion, Sentinel generates a comprehensive report:

```typescript
interface SentinelTestResult {
  scenarioName: string;
  startTime: string;
  endTime: string;
  duration: number;
  
  // Overall status
  passed: boolean;
  failedAssertions: string[];
  
  // Phase summaries
  phases: {
    rampUp: PhaseSummary;
    peak: PhaseSummary;
    steadyState: PhaseSummary;
  };
  
  // Bottleneck analysis
  bottlenecks: Array<{
    component: string;  // 'SessionDO', 'D1', 'TenantDO', etc.
    saturationPoint: number;  // Users at which degradation started
    symptom: string;  // 'latency spike', 'error rate increase', etc.
  }>;
  
  // Per-application breakdown
  applicationResults: Map<string, {
    successRate: number;
    avgLatency: number;
    p95Latency: number;
    errorBreakdown: Map<string, number>;
  }>;
  
  // Raw timeline data (for charting)
  timeline: SentinelMetrics[];
}
```

---

## Step 7: Integrate with Vista Monitoring

### Report Results to Vista

```typescript
// After test completion
async function reportToVista(result: SentinelTestResult, env: Env) {
  // Store in D1 for historical tracking
  await env.DB.prepare(`
    INSERT INTO load_test_results 
    (id, scenario_name, started_at, duration_ms, passed, summary_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(),
    result.scenarioName,
    result.startTime,
    result.duration,
    result.passed ? 1 : 0,
    JSON.stringify(result)
  ).run();
  
  // Update Vista KV for real-time dashboard
  await env.MONITOR_KV.put(
    `load_test:latest:${result.scenarioName}`,
    JSON.stringify(result),
    { expirationTtl: 60 * 60 * 24 * 7 }  // 7 days
  );
  
  // Trigger alert if failed
  if (!result.passed) {
    await env.ALERT_QUEUE.send({
      type: 'load_test_failed',
      scenario: result.scenarioName,
      failedAssertions: result.failedAssertions,
      timestamp: new Date().toISOString(),
    });
  }
}
```

### Vista Dashboard Components

```
Vista Dashboard
├── Overview
│   └── Latest Load Test: ✅ Passed / ❌ Failed
├── Load Tests
│   ├── Run New Test (scenario selector)
│   ├── Test History (table)
│   └── Test Detail View
│       ├── Timeline Chart (users vs latency)
│       ├── Phase Breakdown
│       ├── Bottleneck Analysis
│       └── Per-Application Results
└── Alerts
    └── Load Test Failures
```

---

## Step 8: Run Load Tests

### CLI Commands

```bash
# Install Sentinel package
pnpm add @autumnsgrove/sentinel

# Run default scenario (grove-mix)
pnpm sentinel:run --scenario grove-mix

# Run specific scenario
pnpm sentinel:run --scenario launch-day --target staging.grove.place

# Run with custom parameters
pnpm sentinel:run \
  --scenario multi-tenant-chaos \
  --users 1000 \
  --duration 30m \
  --tenants alice,bob,carol

# Generate report only (no execution)
pnpm sentinel:report --scenario launch-day --compare-with previous-run
```

### GitHub Actions Integration

Add to your CI/CD pipeline:

```yaml
# .github/workflows/load-test.yml
name: Load Test
on:
  push:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM

jobs:
  load-test:
    runs-on