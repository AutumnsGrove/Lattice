/**
 * Test Utilities for Durable Objects Testing
 *
 * Provides helper functions for creating test fixtures, mocking responses,
 * and asserting on DO behavior.
 */

import { expect } from "vitest";
import { mockEnv } from "./setup.js";

// Get the mock environment from setup.ts
function getEnv() {
  return mockEnv;
}

// ============================================================================
// Type Helpers
// ============================================================================

export type TierKey = "free" | "seedling" | "sapling" | "oak" | "evergreen";

export interface TestTenant {
  id: string;
  subdomain: string;
  displayName: string;
  email: string;
  plan: TierKey;
  active: boolean;
}

export interface TestPost {
  id: number;
  tenant_id: string;
  slug: string;
  title: string;
  markdown_content: string;
  html_content: string;
  gutter_content: string;
  storage_location: "hot" | "warm" | "cold";
  r2_key: string | null;
  published_at: string | null;
}

// ============================================================================
// Fixture Factories
// ============================================================================

let tenantCounter = 0;
let postCounter = 0;

/**
 * Create a test tenant fixture
 */
export function createTestTenant(
  overrides: Partial<TestTenant> = {},
): TestTenant {
  tenantCounter++;
  return {
    id: `tenant-${tenantCounter}-${Date.now()}`,
    subdomain: `test-${tenantCounter}`,
    displayName: `Test Tenant ${tenantCounter}`,
    email: `test${tenantCounter}@example.com`,
    plan: "seedling",
    active: true,
    ...overrides,
  };
}

/**
 * Create a test post fixture
 */
export function createTestPost(
  tenantId: string,
  overrides: Partial<TestPost> = {},
): TestPost {
  postCounter++;
  return {
    id: postCounter,
    tenant_id: tenantId,
    slug: `test-post-${postCounter}`,
    title: `Test Post ${postCounter}`,
    markdown_content: `# Test Post ${postCounter}\n\nThis is test content.`,
    html_content: `<h1>Test Post ${postCounter}</h1><p>This is test content.</p>`,
    gutter_content: "[]",
    storage_location: "hot",
    r2_key: null,
    published_at: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================================================
// Database Helpers
// ============================================================================

/**
 * Insert a test tenant into D1
 */
export async function insertTestTenant(
  db: D1Database,
  tenant: TestTenant,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO tenants (id, subdomain, display_name, email, plan, active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      tenant.id,
      tenant.subdomain,
      tenant.displayName,
      tenant.email,
      tenant.plan,
      tenant.active ? 1 : 0,
      Date.now(),
    )
    .run();
}

/**
 * Insert a test post into D1
 */
export async function insertTestPost(
  db: D1Database,
  post: TestPost,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO posts (id, tenant_id, slug, title, markdown_content, html_content, gutter_content, storage_location, r2_key, published_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      post.id,
      post.tenant_id,
      post.slug,
      post.title,
      post.markdown_content,
      post.html_content,
      post.gutter_content,
      post.storage_location,
      post.r2_key,
      post.published_at,
      Date.now(),
      Date.now(),
    )
    .run();
}

/**
 * Insert view records for a post
 */
export async function insertTestViews(
  db: D1Database,
  postId: number,
  tenantId: string,
  count: number,
  daysAgo: number = 0,
): Promise<void> {
  const baseTime = Date.now() - daysAgo * 24 * 60 * 60 * 1000;

  for (let i = 0; i < count; i++) {
    await db
      .prepare(
        `INSERT INTO post_views (post_id, tenant_id, session_id, viewed_at)
         VALUES (?, ?, ?, ?)`,
      )
      .bind(postId, tenantId, `session-${i}`, baseTime + i * 1000)
      .run();
  }
}

// ============================================================================
// DO Helpers
// ============================================================================

/**
 * Get a TenantDO stub for testing
 */
export function getTenantDOStub(subdomain: string): DurableObjectStub {
  const e = getEnv();
  const id = e.TENANTS.idFromName(`tenant:${subdomain}`);
  return e.TENANTS.get(id);
}

/**
 * Get a PostMetaDO stub for testing
 */
export function getPostMetaDOStub(
  tenantId: string,
  slug: string,
): DurableObjectStub {
  const e = getEnv();
  const id = e.POST_META.idFromName(`post:${tenantId}:${slug}`);
  return e.POST_META.get(id);
}

/**
 * Get a PostContentDO stub for testing
 */
export function getPostContentDOStub(
  tenantId: string,
  slug: string,
): DurableObjectStub {
  const e = getEnv();
  const id = e.POST_CONTENT.idFromName(`content:${tenantId}:${slug}`);
  return e.POST_CONTENT.get(id);
}

// ============================================================================
// Request Helpers
// ============================================================================

/**
 * Create a JSON request for DO testing
 */
export function createJsonRequest(
  url: string,
  method: string = "GET",
  body?: unknown,
): Request {
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };

  if (body) {
    init.body = JSON.stringify(body);
  }

  return new Request(url, init);
}

/**
 * Parse JSON response from DO
 */
export async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Request failed (${response.status}): ${text}`);
  }
  return response.json() as Promise<T>;
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Assert that a response is successful JSON
 */
export async function assertJsonResponse<T>(
  response: Response,
  expected?: Partial<T>,
): Promise<T> {
  expect(response.ok).toBe(true);
  expect(response.headers.get("content-type")).toContain("application/json");

  const data = (await response.json()) as T;

  if (expected) {
    for (const [key, value] of Object.entries(expected)) {
      expect(data).toHaveProperty(key, value);
    }
  }

  return data;
}

/**
 * Assert that a response is an error
 */
export async function assertErrorResponse(
  response: Response,
  expectedStatus: number,
  expectedMessage?: string,
): Promise<void> {
  expect(response.status).toBe(expectedStatus);

  if (expectedMessage) {
    const text = await response.text();
    expect(text).toContain(expectedMessage);
  }
}

// ============================================================================
// Cleanup Helpers
// ============================================================================

/**
 * Reset test counters (call in beforeEach)
 */
export function resetTestCounters(): void {
  tenantCounter = 0;
  postCounter = 0;
}

/**
 * Clean up test data from D1 (call in afterEach)
 */
export async function cleanupTestData(db: D1Database): Promise<void> {
  await db
    .prepare("DELETE FROM post_views WHERE tenant_id LIKE 'tenant-%'")
    .run();
  await db.prepare("DELETE FROM posts WHERE tenant_id LIKE 'tenant-%'").run();
  await db.prepare("DELETE FROM tenants WHERE id LIKE 'tenant-%'").run();
}
