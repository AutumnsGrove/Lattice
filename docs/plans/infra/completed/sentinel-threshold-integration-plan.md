# Sentinel & Threshold Integration Plan

**Created:** January 2, 2026
**Status:** Approved  
**Related Documents:**
- `sentinel-load-testing-pattern.md`
- `threshold-rate-limiting-pattern.md`
- `vista-loadtest-package-spec.md`
- `docs/specs/vista-spec.md`
- `docs/patterns/grove-durable-objects-architecture.md`
- `docs/specs/rings-spec.md`

---

## Executive Summary

Three new patterns have been added to the Grove ecosystem:
1. **Sentinel** - Load testing & scale validation framework
2. **Threshold** - Advanced rate limiting & abuse prevention
3. **Vista LoadTest** - Implementation spec for Sentinel within Vista

These patterns deeply integrate with existing Grove infrastructure:
- Vista (monitoring dashboard)
- Durable Objects (Loom pattern)
- Rings (analytics)
- Heartwood (auth)

---

## Cross-Reference Mapping

### Sentinel Pattern Integration Points

| Component | Integration | File Reference |
|-----------|-------------|----------------|
| **Vista Dashboard** | Load test results feed into Vista UI | `docs/specs/vista-spec.md` |
| **Durable Objects** | Tests SessionDO, TenantDO, PostDO under load | `docs/patterns/grove-durable-objects-architecture.md` |
| **Rings Analytics** | Uses similar metrics collection patterns | `docs/specs/rings-spec.md` |
| **Heartwood Auth** | Auth stress test scenarios | `sentinel-load-testing-pattern.md:241-265` |

### Threshold Pattern Integration Points

| Component | Integration | File Reference |
|-----------|-------------|----------------|
| **TenantDO** | Per-tenant rate limiting implementation | `threshold-rate-limiting-pattern.md:213-327` |
| **SessionDO** | Per-user rate limiting & graduated response | `threshold-rate-limiting-pattern.md:388-527` |
| **Cloudflare WAF** | Edge rate limiting rules (Layer 1) | `threshold-rate-limiting-pattern.md:95-199` |
| **Heartwood** | Auth-specific rate limiting | `threshold-rate-limiting-pattern.md:684-799` |

### Vista LoadTest Package Integration

| Component | Integration | File Reference |
|-----------|-------------|----------------|
| **Vista Monorepo** | New `packages/loadtest` directory | `vista-loadtest-package-spec.md:18-60` |
| **Vista API** | New `/api/loadtest/*` endpoints | `vista-loadtest-package-spec.md:617-754` |
| **Vista Dashboard** | New load test UI components | `vista-loadtest-package-spec.md:761-970` |
| **Vista D1** | New tables for test results | `vista-loadtest-package-spec.md:66-150` |

---

## Implementation Strategy

### Phase 1: Foundation (Week 1-2)
1. Move pattern docs to `docs/patterns/` directory
2. Update cross-references in existing specs
3. Add implementation tasks to TODOS.md
4. Create stub files for implementation

### Phase 2: Threshold Implementation (Week 3-4)
1. Implement Cloudflare WAF rate limiting rules
2. Add rate limit tables to TenantDO
3. Add rate limit tables to SessionDO
4. Integrate with router middleware
5. Add monitoring & alerting

### Phase 3: Sentinel Core (Week 5-6)
1. Create Vista LoadTest package structure
2. Implement test runner with scenarios
3. Add metrics collection & aggregation
4. Create basic application profiles

### Phase 4: Integration & UI (Week 7-8)
1. Build Vista dashboard components
2. Add API endpoints
3. Create timeline visualization
4. Set up alerting

### Phase 5: Automation (Week 9-10)
1. Add pre-deploy load tests to CI/CD
2. Configure scheduled tests
3. Create runbooks
4. Documentation

---

## Detailed Integration Tasks

### 1. File Organization

```bash
# Move pattern docs to proper location
mv sentinel-load-testing-pattern.md docs/patterns/
mv threshold-rate-limiting-pattern.md docs/patterns/
mv vista-loadtest-package-spec.md docs/specs/

# Update internal references in moved files
# Add header references to related specs
```

### 2. TODOS.md Updates

Add to **Security Audit** section:
```markdown
### Rate Limiting Enhancement (Threshold Pattern)
- [ ] Configure Cloudflare WAF rate limiting rules (Layer 1)
- [ ] Implement TenantDO rate limiting (Layer 2)
- [ ] Implement SessionDO user rate limiting (Layer 3)
- [ ] Add endpoint-specific limits (Layer 4)
- [ ] Integrate graduated response system
- [ ] Add rate limit monitoring to Vista
```

Add to **Durable Objects Implementation**:
```markdown
### DO Phase 2.5: Rate Limiting Integration
- [ ] Add rate limit tables to TenantDO schema
- [ ] Add rate limit tables to SessionDO schema
- [ ] Implement `checkRateLimit()` methods
- [ ] Add abuse state tracking to SessionDO
- [ ] Implement shadow ban functionality
```

Add new **Load Testing** section:
```markdown
## Load Testing & Performance (Sentinel Pattern)
- [ ] Create Vista LoadTest package structure
- [ ] Implement core test runner with ramp-up/peak/steady-state
- [ ] Build application profiles (auth, post-read, post-write, etc.)
- [ ] Add metrics collection and aggregation
- [ ] Create Vista dashboard UI components
- [ ] Add API endpoints for test management
- [ ] Set up pre-deploy load tests in CI/CD
- [ ] Configure alerting for test failures
```

### 3. COMPLETED.md Updates

Add to **Architecture Decisions**:
```markdown
### New Patterns Added (January 2026)
- [x] Sentinel Pattern - Load testing framework spec
- [x] Threshold Pattern - Rate limiting & abuse prevention spec
- [x] Vista LoadTest Spec - Implementation plan for Sentinel
```

### 4. docs/specs/vista-spec.md Updates

Add to **Services Monitored**:
```markdown
| Service | Health Check | Metrics | Alerts |
|---------|-------------|---------|--------|
| LoadTest | `/api/loadtest/health` | Test results, success rates | Test failures |
```

Add new **Load Testing Integration** section:
```markdown
## Load Testing Integration (Sentinel)

Vista includes load testing capabilities via the Sentinel pattern:

### Components
- **LoadTest Package** (`packages/loadtest/`) - Test execution engine
- **Test Scenarios** - Pre-defined traffic patterns (launch day, multi-tenant, auth stress)
- **Results Storage** - D1 tables for historical test data
- **Dashboard UI** - Real-time test monitoring and results visualization

### Data Flow
1. User initiates test from Vista dashboard
2. LoadTest worker runs scenario against target environment
3. Metrics collected in real-time and stored in D1
4. Results appear in Vista dashboard with bottleneck analysis
5. Alerts triggered if assertions fail

### Key Metrics
- Throughput (requests/sec)
- Latency percentiles (p50, p95, p99)
- Error rates
- DO performance (wake rates, latency)
- D1 query performance
```

### 5. docs/patterns/grove-durable-objects-architecture.md Updates

Add to **DO Classes** section:
```markdown
### Rate Limiting Extensions

**TenantDO** includes rate limiting methods:
- `checkTenantRateLimit(category)` - Enforce tier-based limits
- `getRateLimitState()` - Current usage statistics

**SessionDO** includes user rate limiting:
- `checkUserRateLimit(endpoint, limit, window)` - Per-user limits
- `getAbuseState()` - Abuse escalation tracking
- `getShadowBanDelay()` - Artificial delay for shadow banned users
```

Add to **Best Practices**:
```markdown
### DO Testing with Sentinel

Use Sentinel load tests to validate DO behavior:
- Test SessionDO fan-out under concurrent load
- Verify TenantDO isolation between tenants
- Validate PostDO atomic operations (e.g., reaction race conditions)
- Measure DO wake rates and cold start impact
```

---

## Implementation Checklists

### Threshold Pattern Implementation

**Phase 1: Edge Rate Limiting (Days 1-2)**
- [ ] Configure Cloudflare WAF rules in terraform
- [ ] Set up general request limit (1000/min/IP)
- [ ] Set up auth endpoint limit (50/5min/IP)
- [ ] Set up upload endpoint limit (100/hour/IP)
- [ ] Set up AI endpoint limit (500/day/IP)
- [ ] Test with synthetic traffic

**Phase 2: TenantDO Rate Limiting (Days 3-4)**
- [ ] Add rate limit tables to TenantDO schema
- [ ] Implement `checkRateLimit()` method
- [ ] Add tier-based limit configuration
- [ ] Create `TIER_LIMITS` constant
- [ ] Integrate with router middleware
- [ ] Add rate limit headers to responses

**Phase 3: SessionDO Rate Limiting (Days 5-7)**
- [ ] Add rate limit tables to SessionDO schema
- [ ] Add abuse state tracking table
- [ ] Implement `checkUserRateLimit()` method
- [ ] Implement `escalateAbuse()` method
- [ ] Add shadow ban logic
- [ ] Integrate with Heartwood login flow

**Phase 4: Monitoring (Days 8-10)**
- [ ] Add rate limit event logging
- [ ] Create Vista dashboard component
- [ ] Configure alert thresholds
- [ ] Document runbooks for common scenarios

### Sentinel Pattern Implementation

**Phase 1: Core Infrastructure (Week 1)**
- [ ] Create `packages/loadtest` directory in Vista
- [ ] Set up TypeScript project structure
- [ ] Add shared types to `shared/types/loadtest.ts`
- [ ] Run D1 migration for load test tables
- [ ] Implement basic `LoadTestRunner` class
- [ ] Create `grove-mix` scenario

**Phase 2: Application Profiles (Week 2)**
- [ ] Implement `auth-flow` application profile
- [ ] Implement `post-read` application profile
- [ ] Implement `post-write` application profile
- [ ] Implement `media-upload` application profile
- [ ] Add virtual user pool with token management
- [ ] Add content generators

**Phase 3: Metrics & Reporting (Week 3)**
- [ ] Implement `MetricsCollector` with percentile tracking
- [ ] Implement `MetricsAggregator` with bottleneck detection
- [ ] Implement `VistaReporter` for D1/KV storage
- [ ] Add real-time metrics streaming
- [ ] Add assertion evaluation

**Phase 4: API & Dashboard (Week 4)**
- [ ] Add load test routes to Vista API
- [ ] Create dashboard overview page
- [ ] Create timeline chart component (Chart.js)
- [ ] Create test detail view
- [ ] Add scenario selector UI

**Phase 5: Automation (Week 5)**
- [ ] Add cron trigger for nightly tests
- [ ] Configure alerting for test failures
- [ ] Add comparison reporting (vs baseline)
- [ ] Create CLI for local test execution
- [ ] Document runbooks for common failures

---

## Testing Strategy

### Unit Tests
- Rate limit logic in isolation
- Metrics calculation accuracy
- Scenario configuration validation

### Integration Tests
- End-to-end rate limiting flow
- Load test against staging environment
- DO behavior under simulated load

### Performance Tests
- Rate limiting overhead (< 5ms per request)
- Load test accuracy (± 5% of actual traffic)
- Dashboard responsiveness under load

---

## Documentation Updates Needed

1. **Update `docs/patterns/index.md`** - Add Sentinel and Threshold
2. **Update `docs/specs/index.md`** - Add Vista LoadTest spec
3. **Update `README.md`** - Mention load testing capabilities
4. **Create `docs/guides/load-testing-guide.md`** - User guide
5. **Create `docs/guides/rate-limiting-guide.md`** - Technical guide
6. **Update `CONTRIBUTING.md`** - Add testing requirements

---

## Questions for User

Before proceeding with implementation, please clarify:

1. **Priority**: Should we implement Threshold (rate limiting) or Sentinel (load testing) first? Threshold provides immediate security benefits, while Sentinel is crucial for pre-launch validation.

2. **Timeline**: Is there a target date for having load testing operational? This affects whether we implement the full Vista integration or start with a simpler CLI-based approach.

3. **Resources**: Should we create a separate repository for Vista (GroveMonitor) or keep it in the monorepo? The spec assumes a separate repo.

4. **Testing Environment**: Do we have a staging environment that can handle load tests, or should we set up isolated test resources?

5. **Alerting**: Where should load test failure alerts be sent? (Email, Slack, etc.)

---

## Next Steps

Once priorities are clarified:

1. Update TODOS.md with implementation tasks
2. Move pattern docs to proper locations
3. Create implementation branches
4. Begin with Phase 1 of chosen pattern
5. Set up monitoring and alerting

The integration of these patterns will significantly enhance Grove's security posture (Threshold) and operational visibility (Sentinel), making the platform more robust and ready for scale.