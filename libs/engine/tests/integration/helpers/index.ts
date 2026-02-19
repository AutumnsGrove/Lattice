/**
 * Integration Test Helpers
 *
 * Re-exports all helper utilities for clean imports in test files.
 *
 * @example
 * ```ts
 * import {
 *   createTestUser,
 *   createMockRequestEvent,
 *   createAuthenticatedTenantEvent,
 *   resetFactoryCounters,
 * } from '../helpers';
 * ```
 */

export {
  // Factories
  createTestUser,
  createTestSession,
  createTestSubscription,
  createTestImage,
  createTestWebhookEvent,
  resetFactoryCounters,
  // Types
  type TestUser,
  type TestSession,
  type TestSubscription,
  type TestImage,
  type TestWebhookEvent,
} from "./factories.js";

export {
  // Request event
  createMockRequestEvent,
  createAuthenticatedTenantEvent,
  createMockServiceBinding,
  createMockDONamespace,
  // Types
  type MockRequestEvent,
  type MockRequestEventConfig,
  type MockCookies,
  type MockPlatformEnv,
  type MockServiceBinding,
  type MockDONamespace,
} from "./request-event.js";

// Re-export Cloudflare mocks for convenience
export {
  createMockD1,
  createMockR2,
  createMockKV,
  seedMockD1,
  clearMockD1,
  advanceKVTime,
} from "../../../src/lib/server/services/__mocks__/cloudflare.js";
