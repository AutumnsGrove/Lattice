/**
 * Clearing Monitor Configuration
 *
 * Defines monitored components and their health check endpoints.
 * Component IDs must match the status_components table in D1.
 */

export interface ComponentConfig {
  /** Component ID (matches status_components.id in D1) */
  id: string;
  /** Display name */
  name: string;
  /** Health check URL */
  url: string;
  /** Check type: 'deep' expects JSON health response, 'shallow' checks HTTP 200 */
  checkType: "deep" | "shallow";
  /** HTTP method to use */
  method: "GET" | "HEAD";
}

/**
 * Grove components to monitor
 *
 * These IDs match the seeded components in 0001_status_tables.sql:
 * - comp_blog, comp_cdn, comp_auth, comp_payments, comp_api
 */
export const COMPONENTS: ComponentConfig[] = [
  {
    id: "comp_blog",
    name: "Blog Engine",
    url: "https://autumn.grove.place/api/health",
    checkType: "deep",
    method: "GET",
  },
  {
    id: "comp_cdn",
    name: "CDN",
    url: "https://cdn.grove.place/health-check.txt",
    checkType: "shallow",
    method: "HEAD",
  },
  {
    id: "comp_auth",
    name: "Authentication",
    // Health check via login.grove.place (checks UI + Heartwood connectivity)
    url: "https://login.grove.place/health",
    checkType: "deep",
    method: "GET",
  },
  {
    id: "comp_payments",
    name: "Payments",
    // Plant handles all payment processing, so health check lives there
    url: "https://plant.grove.place/api/health/payments",
    checkType: "deep",
    method: "GET",
  },
  {
    id: "comp_api",
    name: "API",
    url: "https://autumn.grove.place/api/health/api",
    checkType: "deep",
    method: "GET",
  },
];

/**
 * Latency thresholds for determining component status
 * Based on response time in milliseconds
 *
 * Note: CF worker-to-CF worker calls naturally take 400-800ms cross-region,
 * so thresholds are set generously to avoid false degradation alerts.
 */
export const LATENCY_THRESHOLDS = {
  /** < 2000ms = operational */
  OPERATIONAL: 2000,
  /** >= 2000ms = degraded, >= 5000ms = partial_outage */
  SLOW: 5000,
} as const;

/**
 * Consecutive failure/success thresholds for incident management
 */
export const INCIDENT_THRESHOLDS = {
  /** Number of consecutive non-operational checks before updating status to degraded */
  CHECKS_TO_DEGRADE: 2,
  /** Number of consecutive failures before creating an incident */
  FAILURES_TO_CREATE: 3,
  /** Number of consecutive successes before resolving an incident */
  SUCCESSES_TO_RESOLVE: 2,
} as const;

/**
 * Request timeout for health checks (ms)
 */
export const REQUEST_TIMEOUT = 10000;

/**
 * Email sender address for alert notifications
 */
export const EMAIL_FROM = "Grove Status <status@grove.place>";

/**
 * Status priority for determining "worst status of the day"
 * Higher number = worse status
 */
export const STATUS_PRIORITY: Record<string, number> = {
  operational: 0,
  maintenance: 1,
  degraded: 2,
  partial_outage: 3,
  major_outage: 4,
};
