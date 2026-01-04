---
aliases: []
date created: Saturday, January 4th 2026
date modified: Saturday, January 4th 2026
tags:
  - load-testing
  - monitoring
  - performance
  - vista
type: tech-spec
---

# Vista LoadTest — Sentinel Integration

> *Adding eyes to see what the forest can withstand.*

Load testing capabilities for Vista implementing the Sentinel pattern within the Vista monorepo. Provides scenario-based testing with virtual user simulation, real-time metrics collection, and bottleneck detection for Grove infrastructure validation.

**Package:** `packages/loadtest`  
**Parent Project:** Vista (GroveMonitor)  
**Dependencies:** Sentinel Pattern, Loom Pattern  
**Last Updated:** January 2026  

This spec defines how to add load testing capabilities to Vista, implementing the Sentinel pattern within the Vista monorepo structure.

---

## Package Structure

```
Vista/
├── packages/
│   ├── collector/        # Existing - metrics collection
│   ├── api/              # Existing - dashboard API
│   ├── dashboard/        # Existing - SvelteKit UI
│   └── loadtest/         # NEW - Sentinel implementation
│       ├── src/
│       │   ├── index.ts           # Entry point
│       │   ├── runner.ts          # Test orchestration
│       │   ├── scenarios/
│       │   │   ├── index.ts       # Scenario exports
│       │   │   ├── grove-mix.ts   # Default traffic mix
│       │   │   ├── launch-day.ts  # Launch simulation
│       │   │   ├── auth-stress.ts # Heartwood stress test
│       │   │   └── multi-tenant.ts # Tenant isolation test
│       │   ├── applications/
│       │   │   ├── index.ts       # App profile exports
│       │   │   ├── auth-flow.ts   # OAuth flow simulation
│       │   │   ├── post-read.ts   # Blog reading simulation
│       │   │   ├── post-write.ts  # Content creation
│       │   │   └── media-upload.ts # Upload simulation
│       │   ├── metrics/
│       │   │   ├── collector.ts   # Real-time metrics
│       │   │   ├── aggregator.ts  # Result aggregation
│       │   │   └── reporter.ts    # Vista integration
│       │   ├── generators/
│       │   │   ├── users.ts       # Virtual user generation
│       │   │   ├── content.ts     # Test content generation
│       │   │   └── traffic.ts     # Traffic pattern generation
│       │   └── lib/
│       │       ├── types.ts       # TypeScript interfaces
│       │       ├── utils.ts       # Helpers
│       │       └── assertions.ts  # Pass/fail logic
│       ├── wrangler.toml          # Worker config
│       ├── package.json
│       └── tsconfig.json
├── migrations/
│   └── 0003_loadtest_results.sql  # NEW - Results storage
└── shared/
    └── types/
        └── loadtest.ts            # Shared types
```

---

## Database Schema

```sql
-- migrations/0003_loadtest_results.sql

-- Test run metadata
CREATE TABLE load_test_runs (
  id TEXT PRIMARY KEY,
  scenario_name TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  duration_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed', 'cancelled'
  config_json TEXT NOT NULL,              -- Scenario configuration
  summary_json TEXT,                      -- Aggregated results
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_runs_scenario ON load_test_runs(scenario_name);
CREATE INDEX idx_runs_started ON load_test_runs(started_at DESC);
CREATE INDEX idx_runs_status ON load_test_runs(status);

-- Detailed metrics timeline
CREATE TABLE load_test_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL REFERENCES load_test_runs(id) ON DELETE CASCADE,
  timestamp INTEGER NOT NULL,             -- Unix ms
  phase TEXT NOT NULL,                    -- 'ramp_up', 'peak', 'steady_state', 'ramp_down'
  active_users INTEGER NOT NULL,
  requests_per_sec REAL NOT NULL,
  latency_p50 REAL,
  latency_p95 REAL,
  latency_p99 REAL,
  latency_max REAL,
  error_rate REAL NOT NULL,
  errors_by_type TEXT,                    -- JSON
  do_metrics TEXT,                        -- JSON: DO-specific stats
  d1_metrics TEXT,                        -- JSON: D1 stats
  storage_metrics TEXT                    -- JSON: R2/KV stats
);

CREATE INDEX idx_metrics_run ON load_test_metrics(run_id);
CREATE INDEX idx_metrics_ts ON load_test_metrics(timestamp);

-- Per-application results
CREATE TABLE load_test_app_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL REFERENCES load_test_runs(id) ON DELETE CASCADE,
  app_name TEXT NOT NULL,
  total_requests INTEGER NOT NULL,
  successful_requests INTEGER NOT NULL,
  failed_requests INTEGER NOT NULL,
  avg_latency_ms REAL NOT NULL,
  p50_latency_ms REAL,
  p95_latency_ms REAL,
  p99_latency_ms REAL,
  errors_by_type TEXT                     -- JSON
);

CREATE INDEX idx_app_results_run ON load_test_app_results(run_id);

-- Bottleneck analysis
CREATE TABLE load_test_bottlenecks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL REFERENCES load_test_runs(id) ON DELETE CASCADE,
  component TEXT NOT NULL,                -- 'SessionDO', 'TenantDO', 'D1', etc.
  saturation_users INTEGER,               -- Users when degradation started
  symptom TEXT NOT NULL,                  -- 'latency_spike', 'error_increase', etc.
  severity TEXT NOT NULL,                 -- 'warning', 'critical'
  details TEXT                            -- JSON with additional context
);

CREATE INDEX idx_bottlenecks_run ON load_test_bottlenecks(run_id);

-- Assertion results
CREATE TABLE load_test_assertions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL REFERENCES load_test_runs(id) ON DELETE CASCADE,
  metric TEXT NOT NULL,
  operator TEXT NOT NULL,
  expected_value REAL NOT NULL,
  actual_value REAL NOT NULL,
  passed INTEGER NOT NULL                 -- 0 or 1
);

CREATE INDEX idx_assertions_run ON load_test_assertions(run_id);
```

---

## Core Types

```typescript
// shared/types/loadtest.ts

export interface LoadScenario {
  name: string;
  description: string;
  applications: ApplicationWeight[];
  userProfile: UserProfile;
  assertions: Assertion[];
  tenants?: string[];
  tags?: string[];
}

export interface ApplicationWeight {
  name: string;
  weight: number; // 0.0 - 1.0
}

export interface UserProfile {
  rampUp: { from: number; to: number; duration: string };
  peak: { users: number; duration: string };
  steadyState: { users: number; duration: string };
  rampDown: { to: number; duration: string };
}

export interface Assertion {
  metric: MetricType;
  operator: '>' | '<' | '=' | '>=' | '<=';
  value: number;
}

export type MetricType =
  | 'throughput_requests_per_sec'
  | 'p50_latency_ms'
  | 'p95_latency_ms'
  | 'p99_latency_ms'
  | 'error_rate'
  | 'do_wake_rate'
  | 'd1_queue_depth';

export interface ApplicationProfile {
  name: string;
  steps: RequestStep[];
  doInteractions: DOInteraction[];
  variants?: string[];
}

export interface RequestStep {
  name: string;
  request: RequestConfig;
  expect: ExpectConfig;
  extract?: Record<string, string>;
  parallel?: boolean;
  background?: boolean;
  probability?: number;
  repeatPattern?: { interval: string; variance: string };
}

export interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  body?: Record<string, unknown> | string;
}

export interface ExpectConfig {
  status?: number | number[];
  latencyMs?: { p50?: number; p95?: number; p99?: number; max?: number };
}

export interface DOInteraction {
  do: 'SessionDO' | 'TenantDO' | 'PostDO' | 'FeedDO' | 'NotificationDO' | 'AnalyticsDO';
  pattern: 'read-heavy' | 'write-heavy' | 'write-batch' | 'write-append';
  id: string; // Template: 'session:{{userId}}'
}

export interface TestRunConfig {
  scenarioName: string;
  scenario: LoadScenario;
  environment: 'staging' | 'production';
  dryRun?: boolean;
}

export interface TestRunResult {
  id: string;
  scenarioName: string;
  startTime: string;
  endTime: string;
  duration: number;
  passed: boolean;
  failedAssertions: string[];
  phases: {
    rampUp: PhaseSummary;
    peak: PhaseSummary;
    steadyState: PhaseSummary;
  };
  latencyPercentiles: LatencyPercentiles;
  bottlenecks: Bottleneck[];
  applicationResults: Map<string, ApplicationResult>;
  timeline: MetricsSnapshot[];
}

export interface PhaseSummary {
  avgLatency: number;
  p95Latency: number;
  errorRate: number;
  throughput: number;
  peakUsers: number;
}

export interface LatencyPercentiles {
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  max: number;
}

export interface Bottleneck {
  component: string;
  saturationPoint: number;
  symptom: string;
  severity: 'warning' | 'critical';
  details?: Record<string, unknown>;
}

export interface ApplicationResult {
  successRate: number;
  avgLatency: number;
  p95Latency: number;
  errorBreakdown: Map<string, number>;
}

export interface MetricsSnapshot {
  timestamp: number;
  phase: 'ramp_up' | 'peak' | 'steady_state' | 'ramp_down';
  activeUsers: number;
  requestsPerSec: number;
  latency: LatencyPercentiles;
  errorRate: number;
  errorsByType: Map<string, number>;
  doMetrics: DOMetrics;
  d1Metrics: D1Metrics;
  storageMetrics: StorageMetrics;
}

export interface DOMetrics {
  sessionDO: { wakeRate: number; avgLatency: number; errorRate: number };
  tenantDO: { wakeRate: number; avgLatency: number; errorRate: number };
  postDO: { wakeRate: number; avgLatency: number; errorRate: number };
}

export interface D1Metrics {
  queriesPerSecond: number;
  batchedWritesPerSecond: number;
  avgQueryLatency: number;
  rowsReadPerSecond: number;
  rowsWrittenPerSecond: number;
}

export interface StorageMetrics {
  readsPerSecond: number;
  writesPerSecond: number;
  bytesTransferred: number;
}
```

---

## Test Runner Implementation

```typescript
// packages/loadtest/src/runner.ts

import { LoadScenario, TestRunConfig, TestRunResult, MetricsSnapshot } from '../../shared/types/loadtest';
import { getScenario } from './scenarios';
import { getApplication } from './applications';
import { MetricsCollector } from './metrics/collector';
import { MetricsAggregator } from './metrics/aggregator';
import { VistaReporter } from './metrics/reporter';
import { VirtualUserPool } from './generators/users';

export class LoadTestRunner {
  private config: TestRunConfig;
  private collector: MetricsCollector;
  private aggregator: MetricsAggregator;
  private reporter: VistaReporter;
  private userPool: VirtualUserPool;
  private abortController: AbortController;

  constructor(config: TestRunConfig, env: Env) {
    this.config = config;
    this.collector = new MetricsCollector();
    this.aggregator = new MetricsAggregator();
    this.reporter = new VistaReporter(env);
    this.userPool = new VirtualUserPool();
    this.abortController = new AbortController();
  }

  async run(): Promise<TestRunResult> {
    const runId = crypto.randomUUID();
    const startTime = new Date().toISOString();

    // Initialize run in Vista
    await this.reporter.initRun(runId, this.config);

    try {
      const scenario = this.config.scenario;
      const profile = scenario.userProfile;

      // Phase 1: Ramp Up
      await this.runPhase('ramp_up', {
        startUsers: profile.rampUp.from,
        endUsers: profile.rampUp.to,
        duration: this.parseDuration(profile.rampUp.duration),
      });

      // Phase 2: Peak
      await this.runPhase('peak', {
        startUsers: profile.peak.users,
        endUsers: profile.peak.users,
        duration: this.parseDuration(profile.peak.duration),
      });

      // Phase 3: Steady State
      await this.runPhase('steady_state', {
        startUsers: profile.steadyState.users,
        endUsers: profile.steadyState.users,
        duration: this.parseDuration(profile.steadyState.duration),
      });

      // Phase 4: Ramp Down
      await this.runPhase('ramp_down', {
        startUsers: profile.steadyState.users,
        endUsers: profile.rampDown.to,
        duration: this.parseDuration(profile.rampDown.duration),
      });

      // Aggregate results
      const result = this.aggregator.aggregate(runId, this.config, this.collector.getTimeline());

      // Evaluate assertions
      result.failedAssertions = this.evaluateAssertions(scenario.assertions, result);
      result.passed = result.failedAssertions.length === 0;

      // Report to Vista
      await this.reporter.completeRun(runId, result);

      return result;

    } catch (error) {
      await this.reporter.failRun(runId, error as Error);
      throw error;
    }
  }

  private async runPhase(
    phase: 'ramp_up' | 'peak' | 'steady_state' | 'ramp_down',
    config: { startUsers: number; endUsers: number; duration: number }
  ): Promise<void> {
    const { startUsers, endUsers, duration } = config;
    const startTime = Date.now();
    const interval = 1000; // Metrics collection interval

    while (Date.now() - startTime < duration) {
      if (this.abortController.signal.aborted) break;

      // Calculate current user count (linear interpolation)
      const progress = (Date.now() - startTime) / duration;
      const currentUsers = Math.floor(startUsers + (endUsers - startUsers) * progress);

      // Adjust user pool
      await this.userPool.setActiveUsers(currentUsers);

      // Execute user actions for this tick
      const results = await this.executeUserActions();

      // Collect metrics
      const snapshot: MetricsSnapshot = {
        timestamp: Date.now(),
        phase,
        activeUsers: currentUsers,
        ...this.collector.collectSnapshot(results),
      };

      // Report real-time metrics
      await this.reporter.reportSnapshot(snapshot);

      // Wait for next tick
      await this.sleep(interval);
    }
  }

  private async executeUserActions(): Promise<RequestResult[]> {
    const scenario = this.config.scenario;
    const activeUsers = this.userPool.getActiveUsers();
    const results: RequestResult[] = [];

    // Each user picks an application based on weights
    const actions = activeUsers.map(async (user) => {
      const app = this.selectApplication(scenario.applications);
      const profile = getApplication(app.name);

      // Execute application steps
      for (const step of profile.steps) {
        if (step.probability && Math.random() > step.probability) continue;

        const result = await this.executeStep(user, step);
        results.push(result);
      }
    });

    await Promise.allSettled(actions);
    return results;
  }

  private selectApplication(weights: ApplicationWeight[]): ApplicationWeight {
    const random = Math.random();
    let cumulative = 0;

    for (const app of weights) {
      cumulative += app.weight;
      if (random <= cumulative) return app;
    }

    return weights[weights.length - 1];
  }

  private async executeStep(user: VirtualUser, step: RequestStep): Promise<RequestResult> {
    const startTime = Date.now();

    try {
      const url = this.interpolate(step.request.url, user);
      const response = await fetch(url, {
        method: step.request.method,
        headers: this.interpolateHeaders(step.request.headers, user),
        body: step.request.body ? JSON.stringify(this.interpolateBody(step.request.body, user)) : undefined,
        signal: this.abortController.signal,
      });

      const latency = Date.now() - startTime;
      const success = step.expect.status
        ? Array.isArray(step.expect.status)
          ? step.expect.status.includes(response.status)
          : response.status === step.expect.status
        : response.ok;

      return {
        step: step.name,
        success,
        latency,
        status: response.status,
        error: success ? undefined : `Unexpected status: ${response.status}`,
      };

    } catch (error) {
      return {
        step: step.name,
        success: false,
        latency: Date.now() - startTime,
        status: 0,
        error: (error as Error).message,
      };
    }
  }

  private evaluateAssertions(assertions: Assertion[], result: TestRunResult): string[] {
    const failed: string[] = [];

    for (const assertion of assertions) {
      const actual = this.getMetricValue(assertion.metric, result);
      const passed = this.compare(actual, assertion.operator, assertion.value);

      if (!passed) {
        failed.push(`${assertion.metric} ${assertion.operator} ${assertion.value} (actual: ${actual})`);
      }
    }

    return failed;
  }

  private getMetricValue(metric: MetricType, result: TestRunResult): number {
    switch (metric) {
      case 'throughput_requests_per_sec':
        return result.phases.steadyState.throughput;
      case 'p50_latency_ms':
        return result.latencyPercentiles.p50;
      case 'p95_latency_ms':
        return result.latencyPercentiles.p95;
      case 'p99_latency_ms':
        return result.latencyPercentiles.p99;
      case 'error_rate':
        return result.phases.steadyState.errorRate;
      default:
        return 0;
    }
  }

  private compare(actual: number, operator: string, expected: number): boolean {
    switch (operator) {
      case '>': return actual > expected;
      case '<': return actual < expected;
      case '>=': return actual >= expected;
      case '<=': return actual <= expected;
      case '=': return actual === expected;
      default: return false;
    }
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)(s|m|h)$/);
    if (!match) throw new Error(`Invalid duration: ${duration}`);

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      default: return value * 1000;
    }
  }

  private interpolate(template: string, user: VirtualUser): string {
    return template
      .replace(/\{\{userId\}\}/g, user.id)
      .replace(/\{\{tenant\}\}/g, user.tenant)
      .replace(/\{\{token\}\}/g, user.token ?? '')
      .replace(/\{\{sessionId\}\}/g, user.sessionId ?? '');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  abort(): void {
    this.abortController.abort();
  }
}

interface VirtualUser {
  id: string;
  tenant: string;
  token?: string;
  sessionId?: string;
}

interface RequestResult {
  step: string;
  success: boolean;
  latency: number;
  status: number;
  error?: string;
}
```

---

## API Endpoints

```typescript
// packages/api/src/routes/loadtest.ts

import { Hono } from 'hono';
import { LoadTestRunner } from '../../loadtest/src/runner';
import { getScenario, listScenarios } from '../../loadtest/src/scenarios';

const app = new Hono<{ Bindings: Env }>();

// List available scenarios
app.get('/scenarios', async (c) => {
  const scenarios = listScenarios();
  return c.json({ scenarios });
});

// Get scenario details
app.get('/scenarios/:name', async (c) => {
  const name = c.req.param('name');
  const scenario = getScenario(name);

  if (!scenario) {
    return c.json({ error: 'Scenario not found' }, 404);
  }

  return c.json({ scenario });
});

// Start a new test run
app.post('/runs', async (c) => {
  const body = await c.req.json<{
    scenario: string;
    environment?: 'staging' | 'production';
    dryRun?: boolean;
  }>();

  const scenario = getScenario(body.scenario);
  if (!scenario) {
    return c.json({ error: 'Scenario not found' }, 404);
  }

  // Don't allow production tests without explicit flag
  if (body.environment === 'production' && !body.dryRun) {
    return c.json({ error: 'Production tests require dryRun: false confirmation' }, 400);
  }

  const runner = new LoadTestRunner({
    scenarioName: body.scenario,
    scenario,
    environment: body.environment ?? 'staging',
    dryRun: body.dryRun,
  }, c.env);

  // Start test in background
  c.executionCtx.waitUntil(runner.run());

  return c.json({
    message: 'Test started',
    scenario: body.scenario,
    environment: body.environment ?? 'staging',
  }, 202);
});

// Get test run status
app.get('/runs/:id', async (c) => {
  const id = c.req.param('id');

  const result = await c.env.DB.prepare(`
    SELECT * FROM load_test_runs WHERE id = ?
  `).bind(id).first();

  if (!result) {
    return c.json({ error: 'Run not found' }, 404);
  }

  return c.json({ run: result });
});

// List recent test runs
app.get('/runs', async (c) => {
  const limit = parseInt(c.req.query('limit') ?? '20', 10);
  const scenario = c.req.query('scenario');

  let query = 'SELECT * FROM load_test_runs';
  const params: string[] = [];

  if (scenario) {
    query += ' WHERE scenario_name = ?';
    params.push(scenario);
  }

  query += ' ORDER BY started_at DESC LIMIT ?';
  params.push(String(limit));

  const results = await c.env.DB.prepare(query).bind(...params).all();

  return c.json({ runs: results.results });
});

// Get test run metrics timeline
app.get('/runs/:id/metrics', async (c) => {
  const id = c.req.param('id');

  const metrics = await c.env.DB.prepare(`
    SELECT * FROM load_test_metrics WHERE run_id = ? ORDER BY timestamp
  `).bind(id).all();

  return c.json({ metrics: metrics.results });
});

// Get test run bottleneck analysis
app.get('/runs/:id/bottlenecks', async (c) => {
  const id = c.req.param('id');

  const bottlenecks = await c.env.DB.prepare(`
    SELECT * FROM load_test_bottlenecks WHERE run_id = ?
  `).bind(id).all();

  return c.json({ bottlenecks: bottlenecks.results });
});

// Cancel a running test
app.post('/runs/:id/cancel', async (c) => {
  const id = c.req.param('id');

  // Update status in DB
  await c.env.DB.prepare(`
    UPDATE load_test_runs SET status = 'cancelled' WHERE id = ? AND status = 'running'
  `).bind(id).run();

  // Note: Actual cancellation requires the runner to check DB status
  // or use a separate signaling mechanism (KV flag, etc.)

  return c.json({ message: 'Cancellation requested' });
});

export default app;
```

---

## Dashboard Components

### Load Test Overview Page

```svelte
<!-- packages/dashboard/src/routes/loadtest/+page.svelte -->

<script lang="ts">
  import { onMount } from 'svelte';
  import ScenarioSelector from '$lib/components/loadtest/ScenarioSelector.svelte';
  import RecentRuns from '$lib/components/loadtest/RecentRuns.svelte';
  import QuickStats from '$lib/components/loadtest/QuickStats.svelte';

  let scenarios: Scenario[] = [];
  let recentRuns: TestRun[] = [];
  let loading = true;

  onMount(async () => {
    const [scenariosRes, runsRes] = await Promise.all([
      fetch('/api/loadtest/scenarios'),
      fetch('/api/loadtest/runs?limit=10'),
    ]);

    scenarios = (await scenariosRes.json()).scenarios;
    recentRuns = (await runsRes.json()).runs;
    loading = false;
  });

  async function startTest(scenarioName: string) {
    const res = await fetch('/api/loadtest/runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: scenarioName, environment: 'staging' }),
    });

    if (res.ok) {
      // Refresh runs list
      const runsRes = await fetch('/api/loadtest/runs?limit=10');
      recentRuns = (await runsRes.json()).runs;
    }
  }
</script>

<div class="loadtest-page">
  <header>
    <h1>Load Testing</h1>
    <p class="subtitle">Sentinel-powered scale validation for Grove</p>
  </header>

  {#if loading}
    <div class="loading">Loading...</div>
  {:else}
    <section class="quick-stats">
      <QuickStats runs={recentRuns} />
    </section>

    <section class="run-test">
      <h2>Run New Test</h2>
      <ScenarioSelector {scenarios} onSelect={startTest} />
    </section>

    <section class="recent-runs">
      <h2>Recent Test Runs</h2>
      <RecentRuns runs={recentRuns} />
    </section>
  {/if}
</div>

<style>
  .loadtest-page {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .subtitle {
    color: var(--grove-secondary);
    margin-top: 0.5rem;
  }

  section {
    margin-top: 2rem;
  }

  h2 {
    font-size: 1.25rem;
    margin-bottom: 1rem;
  }
</style>
```

### Timeline Chart Component

```svelte
<!-- packages/dashboard/src/lib/components/loadtest/TimelineChart.svelte -->

<script lang="ts">
  import { onMount } from 'svelte';
  import Chart from 'chart.js/auto';

  export let metrics: MetricsSnapshot[];

  let canvas: HTMLCanvasElement;
  let chart: Chart;

  onMount(() => {
    const ctx = canvas.getContext('2d');

    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: metrics.map(m => new Date(m.timestamp).toLocaleTimeString()),
        datasets: [
          {
            label: 'Active Users',
            data: metrics.map(m => m.activeUsers),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            yAxisID: 'y-users',
            fill: true,
          },
          {
            label: 'p95 Latency (ms)',
            data: metrics.map(m => m.latency.p95),
            borderColor: '#f59e0b',
            yAxisID: 'y-latency',
          },
          {
            label: 'Error Rate',
            data: metrics.map(m => m.errorRate * 100),
            borderColor: '#ef4444',
            yAxisID: 'y-error',
          },
        ],
      },
      options: {
        responsive: true,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        scales: {
          'y-users': {
            type: 'linear',
            position: 'left',
            title: { display: true, text: 'Users' },
          },
          'y-latency': {
            type: 'linear',
            position: 'right',
            title: { display: true, text: 'Latency (ms)' },
            grid: { drawOnChartArea: false },
          },
          'y-error': {
            type: 'linear',
            position: 'right',
            title: { display: true, text: 'Error %' },
            grid: { drawOnChartArea: false },
            max: 100,
          },
        },
        plugins: {
          annotation: {
            annotations: getPhaseAnnotations(metrics),
          },
        },
      },
    });

    return () => chart.destroy();
  });

  function getPhaseAnnotations(metrics: MetricsSnapshot[]) {
    // Add vertical lines at phase transitions
    const phases = ['ramp_up', 'peak', 'steady_state', 'ramp_down'];
    const annotations: any[] = [];

    let currentPhase = metrics[0]?.phase;
    metrics.forEach((m, i) => {
      if (m.phase !== currentPhase) {
        annotations.push({
          type: 'line',
          xMin: i,
          xMax: i,
          borderColor: 'rgba(0, 0, 0, 0.2)',
          borderWidth: 2,
          borderDash: [5, 5],
          label: {
            display: true,
            content: m.phase.replace('_', ' '),
            position: 'start',
          },
        });
        currentPhase = m.phase;
      }
    });

    return annotations;
  }
</script>

<div class="timeline-chart">
  <canvas bind:this={canvas}></canvas>
</div>

<style>
  .timeline-chart {
    width: 100%;
    height: 400px;
  }
</style>
```

---

## Wrangler Configuration

```toml
# packages/loadtest/wrangler.toml

name = "grove-loadtest"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# Bindings to test against (staging)
[env.staging]
vars = { ENVIRONMENT = "staging" }

[[env.staging.d1_databases]]
binding = "DB"
database_name = "grove-monitor-db"
database_id = "your-staging-db-id"

[[env.staging.kv_namespaces]]
binding = "MONITOR_KV"
id = "your-staging-kv-id"

# For testing DOs directly
[[env.staging.durable_objects.bindings]]
name = "SESSIONS"
class_name = "SessionDO"
script_name = "grove-lattice"

[[env.staging.durable_objects.bindings]]
name = "TENANTS"
class_name = "TenantDO"
script_name = "grove-lattice"

# Cron trigger for scheduled tests
[triggers]
crons = ["0 4 * * *"]  # Run daily at 4 AM UTC
```

---

## Implementation Phases

### Phase 1: Core Infrastructure (3 days)

- [ ] Create `packages/loadtest` directory structure
- [ ] Add shared types to `shared/types/loadtest.ts`
- [ ] Run migration `0003_loadtest_results.sql`
- [ ] Implement basic `LoadTestRunner` with ramp-up/peak/steady-state
- [ ] Create `grove-mix` scenario

### Phase 2: Application Profiles (2 days)

- [ ] Implement `auth-flow` application profile
- [ ] Implement `post-read` application profile
- [ ] Implement `post-write` application profile
- [ ] Add virtual user pool with token management

### Phase 3: Metrics & Reporting (2 days)

- [ ] Implement `MetricsCollector` with percentile tracking
- [ ] Implement `MetricsAggregator` with bottleneck detection
- [ ] Implement `VistaReporter` for D1/KV storage
- [ ] Add real-time metrics streaming

### Phase 4: API & Dashboard (3 days)

- [ ] Add load test routes to Vista API
- [ ] Create dashboard overview page
- [ ] Create timeline chart component
- [ ] Create test detail view with bottleneck analysis

### Phase 5: Automation (2 days)

- [ ] Add cron trigger for nightly tests
- [ ] Configure alerting for test failures
- [ ] Add comparison reporting (this run vs baseline)
- [ ] Document runbooks

---

## Usage Examples

### Running a Test via API

```bash
# Start a test
curl -X POST https://vista.grove.place/api/loadtest/runs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $VISTA_TOKEN" \
  -d '{"scenario": "grove-mix", "environment": "staging"}'

# Check status
curl https://vista.grove.place/api/loadtest/runs/$RUN_ID

# Get metrics timeline
curl https://vista.grove.place/api/loadtest/runs/$RUN_ID/metrics
```

### Running a Test via CLI

```bash
# In Vista repo
cd packages/loadtest

# Run locally against staging
pnpm test:scenario grove-mix --env staging

# Run with custom user count
pnpm test:scenario grove-mix --env staging --users 100
```

---

*Spec created: January 2026*  
*For use by: Vista, Grove DevOps*
