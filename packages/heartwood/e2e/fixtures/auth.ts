/**
 * Auth State Fixtures for E2E Tests
 *
 * Provides helpers for managing authentication state in tests,
 * including session storage, login helpers, and state persistence.
 */

import { test as base } from "@playwright/test";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Default storage state path for authenticated sessions */
export const AUTH_STATE_PATH = path.join(
  __dirname,
  "../state/google-auth.json",
);

/** API base URL for direct API calls */
export const API_BASE_URL = process.env.E2E_API_URL || "http://localhost:8787";

/** Frontend base URL */
export const FRONTEND_BASE_URL =
  process.env.E2E_BASE_URL || "http://localhost:5173";

/**
 * Test user for E2E testing
 * This user should be in the allowlist for test environments
 */
export const TEST_USER = {
  id: "e2e-test-user-001",
  email: "e2e-test@grove.place",
  name: "E2E Test User",
};

/**
 * Auth helpers interface
 */
export interface AuthHelpers {
  /** Get the current session info from the API */
  getSession(): Promise<SessionInfo | null>;

  /** Check if the user is currently authenticated */
  isAuthenticated(): Promise<boolean>;

  /** Clear all cookies and storage (logout) */
  clearSession(): Promise<void>;

  /** Wait for authentication to complete after a login flow */
  waitForAuth(options?: { timeout?: number }): Promise<void>;
}

interface SessionInfo {
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  session: {
    id: string;
    expiresAt: string;
  };
}

/**
 * Extended Playwright test with auth helpers
 */
export const test = base.extend<{ auth: AuthHelpers }>({
  auth: async ({ page, context }, use) => {
    const helpers: AuthHelpers = {
      async getSession(): Promise<SessionInfo | null> {
        try {
          const response = await page.request.get(
            `${API_BASE_URL}/api/auth/session`,
          );
          if (!response.ok()) return null;
          const data = await response.json();
          return data.session ? data : null;
        } catch {
          return null;
        }
      },

      async isAuthenticated(): Promise<boolean> {
        const session = await this.getSession();
        return session !== null;
      },

      async clearSession(): Promise<void> {
        await context.clearCookies();
        await page.evaluate(() => {
          localStorage.clear();
          sessionStorage.clear();
        });
      },

      async waitForAuth(options?: { timeout?: number }): Promise<void> {
        const timeout = options?.timeout ?? 10000;
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
          if (await this.isAuthenticated()) {
            return;
          }
          await page.waitForTimeout(500);
        }

        throw new Error(`Authentication did not complete within ${timeout}ms`);
      },
    };

    await use(helpers);
  },
});

/**
 * Load saved OAuth session state for testing
 *
 * Usage:
 * ```typescript
 * test.use({ storageState: AUTH_STATE_PATH });
 * ```
 *
 * To create the session state:
 * ```bash
 * pnpm exec playwright codegen --save-storage=e2e/state/google-auth.json http://localhost:5173/login
 * ```
 */
export function useAuthState() {
  return { storageState: AUTH_STATE_PATH };
}

// Re-export expect
export { expect } from "@playwright/test";
