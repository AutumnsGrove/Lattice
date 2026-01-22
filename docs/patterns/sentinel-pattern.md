---
title: Sentinel — Load Testing & Scale Validation
description: Realistic traffic profiles and ramp-up testing for Durable Objects and D1
category: patterns
icon: radar
lastUpdated: '2026-01-01'
---
# Sentinel Pattern

# Sentinel: Load Testing & Scale Validation

> *The watchful guardian who tests the forest's defenses before the storm.*

**Public Name:** Sentinel  
**Internal Name:** GroveSentinel  
**Pattern Type:** Testing & Observability  
**Last Updated:** January 2026  

Sentinel is Grove's load testing and scale validation framework. Inspired by enterprise-grade network testing methodologies, Sentinel doesn't just ask "can it handle 500 users?" — it asks "what happens to p95 latency during the ramp-up, and which Durable Object becomes the bottleneck first?"

---

## Executive Summary

Traditional testing asks: "Does it work?"  
Sentinel asks: "At what point does it stop working gracefully?"

This pattern defines:
1. **Realistic Traffic Profiles** — Not synthetic blasts, but actual user behavior patterns
2. **Ramp-Up Testing** — Observe system behavior during scale transitions
3. **Multi-Vector Observation** — Correlate latency, throughput, error rates, and resource usage
4. **DO Coordination Testing** — Specifically test SessionDO, TenantDO, and PostDO under load
5. **Integration with Vista** — Feed results into the monitoring dashboard

---

## Why Realistic Testing Matters

### The iperf vs CyPerf Lesson

| Test Type | What It Proves | What It Misses |
|-----------|----------------|----------------|
| **Raw Throughput** (iperf-style) | "Can the pipe handle 10 Gbps?" | Actual user experience |
| **Real Traffic** (CyPerf-style) | "What happens with actual web traffic patterns?" | Nothing — this is the goal |

**Key insight:** Raw throughput testing on the Mono Gateway showed 20 Gbps theoretical capacity, but **real HTTP traffic** achieved 17.5-18.4 Gbps — and **mixed application traffic** dropped to 16-17 Gbps.

That 15-20% delta is the difference between "it works in staging" and "users are complaining."

---

## The Grove Traffic Mix

Like enterprise testing uses an "11-application mix" to simulate real users, Sentinel defines Grove's realistic traffic distribution:

### Grove Application Mix (Default Profile)

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

### Why These Weights?

Based on typical blog platform usage patterns:
- **35% post-read**: Most users are readers, not writers
- **25% blog-list**: Discovery/browsing behavior
- **10% auth**: Sessions last ~30 days, but login/logout still happens
- **5% writes**: 1 writer per ~20 readers

---

## Ramp-Up Testing Methodology

### The Three Phases

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

### What to Measure During Each Phase

**Ramp-Up Phase:**
- At what user count does p95 latency start climbing?
- Do any DOs start hibernating/waking rapidly?
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

## Scenario Definitions

### Basic Scenario Structure

```typescript
interface LoadScenario {
  name: string;
  description: string;
  
  // Traffic composition
  applications: Array<{
    name: string;
    weight: number;  // 0.0 - 1.0, must sum to 1.0
  }>;
  
  // User simulation profile
  userProfile: {
    rampUp: { from: number; to: number; duration: string };
    peak: { users: number; duration: string };
    steadyState: { users: number; duration: string };
    rampDown: { to: number; duration: string };
  };
  
  // Pass/fail criteria
  assertions: Array<{
    metric: MetricType;
    operator: '>' | '<' | '=' | '>=' | '<=';
    value: number;
  }>;
  
  // Optional: Target specific tenants
  tenants?: string[];  // If omitted, use test tenants
}

type MetricType = 
  | 'throughput_requests_per_sec'
  | 'p50_latency_ms'
  | 'p95_latency_ms'
  | 'p99_latency_ms'
  | 'error_rate'
  | 'do_wake_rate'
  | 'd1_queue_depth';
```

### Core Scenarios

#### 1. Grove Launch Day

```typescript
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

#### 2. Multi-Tenant Chaos

```typescript
export const multiTenantChaosScenario: LoadScenario = {
  name: 'multi-tenant-chaos',
  description: 'Test tenant isolation under cross-tenant load',
  
  applications: [
    { name: 'post-read', weight: 0.40 },
    { name: 'blog-list', weight: 0.30 },
    { name: 'post-write', weight: 0.15 },  // Higher write ratio
    { name: 'media-upload', weight: 0.15 }, // Concurrent uploads
  ],
  
  userProfile: {
    rampUp: { from: 0, to: 500, duration: '2m' },
    peak: { users: 500, duration: '5m' },
    steadyState: { users: 128, duration: '5m' },
    rampDown: { to: 0, duration: '1m' },
  },
  
  assertions: [
    { metric: 'p99_latency_ms', operator: '<', value: 2000 },
    { metric: 'error_rate', operator: '<', value: 0.01 },
  ],
  
  tenants: ['alice', 'bob', 'carol', 'dave', 'eve'],  // 5 concurrent tenants
};
```

#### 3. Auth Stress Test

```typescript
export const authStressScenario: LoadScenario = {
  name: 'auth-stress',
  description: 'Hammer SessionDO with auth operations',
  
  applications: [
    { name: 'auth-flow', weight: 0.70 },       // Heavy auth
    { name: 'session-validate', weight: 0.30 }, // Constant validation
  ],
  
  userProfile: {
    rampUp: { from: 0, to: 200, duration: '1m' },
    peak: { users: 200, duration: '3m' },
    steadyState: { users: 50, duration: '2m' },
    rampDown: { to: 0, duration: '30s' },
  },
  
  assertions: [
    { metric: 'p95_latency_ms', operator: '<', value: 300 },
    { metric: 'error_rate', operator: '<', value: 0.001 },  // Auth must be reliable
  ],
};
```

---

## Application Profiles

Each application in the mix has a detailed behavior profile:

### auth-flow

```typescript
export const authFlowApp: ApplicationProfile = {
  name: 'auth-flow',
  
  steps: [
    {
      name: 'authorize-redirect',
      request: {
        method: 'GET',
        url: 'https://auth.grove.place/oauth/authorize',
        params: { 
          client_id: '{{client}}', 
          redirect_uri: '{{callback}}',
          response_type: 'code',
          scope: 'profile',
        },
      },
      expect: { 
        status: 302, 
        latencyMs: { p95: 200 } 
      },
    },
    {
      name: 'token-exchange',
      request: {
        method: 'POST',
        url: 'https://auth.grove.place/oauth/token',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: { 
          code: '{{auth_code}}', 
          grant_type: 'authorization_code',
          client_id: '{{client}}',
          redirect_uri: '{{callback}}',
        },
      },
      expect: { 
        status: 200, 
        latencyMs: { p95: 300 } 
      },
      extract: { token: 'response.access_token' },
    },
    {
      name: 'session-create',
      request: {
        method: 'GET',
        url: 'https://{{tenant}}.grove.place/api/me',
        headers: { Authorization: 'Bearer {{token}}' },
      },
      expect: { 
        status: 200, 
        latencyMs: { p95: 150 } 
      },
    },
  ],
  
  variants: ['sign-in', 'sign-out', 'token-refresh'],
  
  // DO interaction pattern
  doInteractions: [
    { do: 'SessionDO', pattern: 'write-heavy', id: 'session:{{userId}}' },
  ],
};
```

### post-read

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

### post-write

```typescript
export const postWriteApp: ApplicationProfile = {
  name: 'post-write',
  
  steps: [
    {
      name: 'autosave-draft',
      request: {
        method: 'PUT',
        url: 'https://{{tenant}}.grove.place/api/drafts/{{slug}}',
        headers: { Authorization: 'Bearer {{token}}' },
        body: { 
          content: '{{markdownContent}}',
          metadata: '{{postMetadata}}',
        },
      },
      expect: { 
        status: 200, 
        latencyMs: { p95: 500 } 
      },
      // Simulate autosave every 30 seconds
      repeatPattern: { interval: '30s', variance: '5s' },
    },
    {
      name: 'publish-post',
      request: {
        method: 'POST',
        url: 'https://{{tenant}}.grove.place/api/posts',
        headers: { Authorization: 'Bearer {{token}}' },
        body: { 
          content: '{{markdownContent}}',
          metadata: '{{postMetadata}}',
          publish: true,
        },
      },
      expect: { 
        status: 201, 
        latencyMs: { p95: 1000 }  // Publish is heavier
      },
      // Only 10% of write sessions actually publish
      probability: 0.10,
    },
  ],
  
  doInteractions: [
    { do: 'TenantDO', pattern: 'write-batch', id: 'tenant:{{tenant}}' },
  ],
};
```

---

## Metrics Collection

### Real-Time Metrics (During Test)

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

### Aggregated Results

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
  
  // Percentile summaries
  latencyPercentiles: {
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
    max: number;
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

interface PhaseSummary {
  avgLatency: number;
  p95Latency: number;
  errorRate: number;
  throughput: number;
  peakUsers: number;
}
```

---

## Integration with Loom DOs

### Testing DO Coordination

Sentinel specifically validates Loom DO behavior under load:

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

## Vista Integration

### Feeding Results to Vista

Sentinel results should appear in the Vista dashboard:

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

## Implementation Phases

### Phase 1: Core Framework (Week 1)

- [ ] Create `packages/loadtest` in Vista monorepo
- [ ] Implement scenario runner with ramp-up/peak/steady-state
- [ ] Build basic metrics collection
- [ ] Create `grove-mix` scenario with 5 applications

### Phase 2: DO Testing (Week 2)

- [ ] Add DO-specific metrics (wake rate, latency)
- [ ] Implement SessionDO stress scenarios
- [ ] Implement TenantDO isolation tests
- [ ] Add PostDO race condition tests

### Phase 3: Dashboard Integration (Week 3)

- [ ] Add `/loadtest` route to Vista dashboard
- [ ] Build timeline chart component
- [ ] Add test history view
- [ ] Implement bottleneck visualization

### Phase 4: Automation (Week 4)

- [ ] Add pre-deploy load test to CI
- [ ] Configure alert thresholds
- [ ] Build comparison reports (this run vs last run)
- [ ] Document runbooks for common failures

---

## Cost Considerations

### Estimated Per-Run Costs

| Scenario | Duration | Est. Requests | D1 Cost | DO Cost | Total |
|----------|----------|---------------|---------|---------|-------|
| Launch Day | 50 min | ~500K | ~$0.50 | ~$0.75 | ~$1.25 |
| Multi-Tenant | 13 min | ~150K | ~$0.15 | ~$0.25 | ~$0.40 |
| Auth Stress | 6.5 min | ~50K | ~$0.05 | ~$0.10 | ~$0.15 |

Run load tests against staging environment to avoid polluting production data.

---

## Future Considerations

- **Distributed Load Generation:** Currently single-worker; may need multi-region workers for global testing
- **Chaos Engineering:** Add fault injection (DO failures, D1 timeouts)
- **Baseline Regression:** Automatic comparison against historical baselines
- **Cost Projection:** Estimate monthly costs at various user counts

---

*Pattern created: January 2026*  
*For use by: Vista, Grove DevOps*
