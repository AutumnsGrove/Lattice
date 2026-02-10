/**
 * Test Factories for Integration Tests
 *
 * Provides factory functions for creating test data objects.
 * Follows the existing pattern: counter-based IDs, spread overrides, sensible defaults.
 */

// ============================================================================
// Counters for unique IDs
// ============================================================================

let userCounter = 0;
let sessionCounter = 0;
let subscriptionCounter = 0;
let imageCounter = 0;
let webhookCounter = 0;

/**
 * Reset all factory counters (call in beforeEach)
 */
export function resetFactoryCounters(): void {
  userCounter = 0;
  sessionCounter = 0;
  subscriptionCounter = 0;
  imageCounter = 0;
  webhookCounter = 0;
}

// ============================================================================
// Types
// ============================================================================

export interface TestUser {
  id: string;
  email: string;
  name: string;
  avatar: string;
  createdAt: string;
  isAdmin?: boolean;
  provider?: string;
}

export interface TestSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
}

export interface TestSubscription {
  id: string;
  tenantId: string;
  status: "active" | "past_due" | "canceled" | "paused";
  tier: "seedling" | "sapling" | "oak" | "evergreen";
  lsId: string;
}

export interface TestImage {
  key: string;
  tenantId: string;
  contentType: string;
  size: number;
}

export interface TestWebhookEvent {
  event: string;
  data: Record<string, unknown>;
  signature: string;
  timestamp: number;
}

// ============================================================================
// Factories
// ============================================================================

/**
 * Create a test user object
 */
export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
  userCounter++;
  return {
    id: `user-${userCounter}-${Date.now()}`,
    email: `user${userCounter}@example.com`,
    name: `Test User ${userCounter}`,
    avatar: `https://cdn.grove.place/avatars/user-${userCounter}.jpg`,
    createdAt: new Date().toISOString(),
    isAdmin: false,
    provider: "google",
    ...overrides,
  };
}

/**
 * Create a test session object
 */
export function createTestSession(
  overrides: Partial<TestSession> = {},
): TestSession {
  sessionCounter++;
  return {
    id: `session-${sessionCounter}-${Date.now()}`,
    userId: `user-${sessionCounter}`,
    token: `token-${sessionCounter}-${Math.random().toString(36).slice(2)}`,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

/**
 * Create a test subscription object
 */
export function createTestSubscription(
  overrides: Partial<TestSubscription> = {},
): TestSubscription {
  subscriptionCounter++;
  return {
    id: `sub-${subscriptionCounter}-${Date.now()}`,
    tenantId: `tenant-${subscriptionCounter}`,
    status: "active",
    tier: "seedling",
    lsId: `ls-${subscriptionCounter}`,
    ...overrides,
  };
}

/**
 * Create a test image metadata object
 */
export function createTestImage(overrides: Partial<TestImage> = {}): TestImage {
  imageCounter++;
  return {
    key: `tenant-1/images/2024/01/image-${imageCounter}.jpg`,
    tenantId: "tenant-1",
    contentType: "image/jpeg",
    size: 1024 * 100, // 100KB
    ...overrides,
  };
}

/**
 * Create a test webhook event object
 */
export function createTestWebhookEvent(
  overrides: Partial<TestWebhookEvent> = {},
): TestWebhookEvent {
  webhookCounter++;
  return {
    event: "subscription_payment_success",
    data: {
      id: `event-${webhookCounter}`,
      attributes: {
        subscription_id: webhookCounter,
        status: "active",
      },
    },
    signature: `sig-${webhookCounter}-${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
    ...overrides,
  };
}
