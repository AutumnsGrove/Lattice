/**
 * Test User Management
 *
 * Utilities for managing test users in E2E tests.
 * Test users should be seeded in the allowlist for test environments.
 */

/**
 * Primary test user for E2E tests
 * This user should be added to the allowed_emails table in test environment
 */
export const TEST_USER = {
  id: "e2e-test-user-001",
  email: "e2e-test@grove.place",
  name: "E2E Test User",
} as const;

/**
 * Secondary test user for multi-user scenarios
 */
export const TEST_USER_2 = {
  id: "e2e-test-user-002",
  email: "e2e-test-2@grove.place",
  name: "E2E Test User 2",
} as const;

/**
 * Test client for device flow testing
 */
export const TEST_CLIENT = {
  id: "grove-cli",
  name: "Grove CLI (Test)",
} as const;

/**
 * Generate a unique test user for isolation
 */
export function generateTestUser(suffix: string = Date.now().toString()) {
  return {
    id: `e2e-test-${suffix}`,
    email: `e2e-test-${suffix}@grove.place`,
    name: `E2E Test User ${suffix}`,
  };
}

/**
 * SQL to add test users to allowlist
 * Run this in the test database before E2E tests:
 *
 * ```sql
 * INSERT OR IGNORE INTO allowed_emails (email, added_by)
 * VALUES
 *   ('e2e-test@grove.place', 'system'),
 *   ('e2e-test-2@grove.place', 'system');
 * ```
 */
export const TEST_USER_SEED_SQL = `
INSERT OR IGNORE INTO allowed_emails (email, added_by)
VALUES
  ('${TEST_USER.email}', 'system'),
  ('${TEST_USER_2.email}', 'system');
`.trim();
