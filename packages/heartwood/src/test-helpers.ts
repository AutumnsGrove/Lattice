/**
 * Shared test infrastructure for Heartwood tests
 */

import { vi } from "vitest";
import type { Env } from "./types.js";

// =============================================================================
// TEST RSA KEYS (pre-generated, deterministic)
// =============================================================================

export const TEST_RSA_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDWdzlj1QjUiRwd
sqeq5KC9zq44OqN8V4qza6uNRIxTwzSFkEP1dasRMpNOWFaFCeykWz2XbkSh85uk
OHblbb/xSSw90TBjVY3YtEcAL1fjlPLAHBMIOQSChTWmRa1JSzwIOKksxf3IJJU0
58Mq0Ea3HdzkOtkooK8HIlyXhinHBrAMa4ykRUh+D76SC82ud6nxe6f3GbsMQ1Hk
ynShWBfp3P51yhflNnwShbBAHnH4KuSTfjGM9ruRhnUKux59kDf0K6tVbUQH6pwP
yPuiKKJsrokihFAKurYnsUO/JqltxhFoxrLGki6yBkd1eeO/VjUk90LlqZq3Wno6
EEUCf1ZFAgMBAAECggEAD7TSYuWN5z91q+ty0eDlsGjjw5ybGabb8qO6wAE1FAhV
Kcfvi4PXJ/lae4/GzFOg/UYXrBCoXZehPnpfzhHGz2qoCbdEJ4OIkcYyzJ3AU8Y2
Lfa7DRcx5Zt7BZw6N9vW6mo4jN3Le3N0au1jPW4x6O9lXIs+bqDamKI+AjR84u/6
ffjs7jqV+NjQ/fkJMQlXkN78+rAchYwgfI24rdEep5qzxQPB4Pi2Avy6aOARG2h/
HRrC+41AeysomXCVzdmLeQz3twnSYdOXoIjyWOXEKqTsyWLKG4LZPeRh9vxoc6+1
lWa1Hj9RP0EYdu+vs6gCKq5vlqAkVap93OHg4jCeWQKBgQD3UKZHcnmsKo0AgJtA
AkQXyWQRLN+c49Mb0N38bxhjrkneQBKqZCMrUJbipTqQzorkOuIJyiGzTQT63ZZt
5NrW+vIKXv5KpZuUkByUPMCMXBmfL1nwGhJbl0syYNsyNjsp5NZD7Yvbx847HN4e
WiCRaE4r6OcPtdJIHYE3YZQoaQKBgQDd/0LGdtO/T4RnjmnYpg1txxOOgRiI6hCi
/kMIlIITZLpnEjJJ3d6tHXBoFGCkdfxxmpmiiGRxZ8kr4T4Q0TXaTaz1O1pir/4M
BW6nWQawCdjrREi4UF22KeKo3TJwrraWSyZccI6NxQB7CdnzioRhXG7v4OIM0ZBU
CEcKrG9jfQKBgQDjsSO1acZtZKt2R/EnKC7qu2ZejbK97d5hoJWPn/STaVXmwZSt
vQ3IBiU0OyzFPvMOlsueebM3MXShRjsFqAp2nIkUVUrHDNtFFrzJGXmof+6y6NRj
wo0eOBdqJVQJUXZ85osB9QSrbrQHJle1GAMd/CrkMEPy6dHUxR0/EJ5n6QKBgQDb
vbr0RlTM7sHp238MMznhqwfBrCmEBOSY4kOqL44d8jvMoKdklJjBFP3aGCmdQSiz
rstapdV+p7PqmldcQColP3PvfmO2gexfK9VfEvFauTSdlIbC4tIP6Z/xdJpkDZyw
YgzDvaptzE3wfEzgFAF7egpZqWk4NQu/Ej534z2S5QKBgQDMIZ8rj9DQz0AxB3KK
r7QwnlXSr+JT+A504xgJaB0Jf64Zsxd/XOBYdrWrf2jxHzAcAXZjf2vZ2Qa3KZwB
ShjD0trWaJoEapv3t5w+SQQmtNekQVT0GRd9wdK5BKotbRi92D/VUA1GcMTFWuqq
HZEv4ACg2xerOsON4/eJ+oTrBg==
-----END PRIVATE KEY-----`;

export const TEST_RSA_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1nc5Y9UI1IkcHbKnquSg
vc6uODqjfFeKs2urjUSMU8M0hZBD9XWrETKTTlhWhQnspFs9l25EofObpDh25W2/
8UksPdEwY1WN2LRHAC9X45TywBwTCDkEgoU1pkWtSUs8CDipLMX9yCSVNOfDKtBG
tx3c5DrZKKCvByJcl4YpxwawDGuMpEVIfg++kgvNrnep8Xun9xm7DENR5Mp0oVgX
6dz+dcoX5TZ8EoWwQB5x+Crkk34xjPa7kYZ1CrsefZA39CurVW1EB+qcD8j7oiii
bK6JIoRQCrq2J7FDvyapbcYRaMayxpIusgZHdXnjv1Y1JPdC5amat1p6OhBFAn9W
RQIDAQAB
-----END PUBLIC KEY-----`;

// =============================================================================
// MOCK DATABASE FACTORY
// =============================================================================

/**
 * Create a mock D1Database that returns configurable results.
 * Supports chaining: db.prepare().bind().first()/all()/run()
 */
export function createMockDb(
  overrides: {
    first?: unknown;
    all?: { results: unknown[] };
    run?: { success: boolean };
  } = {},
) {
  const defaults = {
    first: null,
    all: { results: [] },
    run: { success: true },
    ...overrides,
  };

  return {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(defaults.first),
        all: vi.fn().mockResolvedValue(defaults.all),
        run: vi.fn().mockResolvedValue(defaults.run),
      }),
      first: vi.fn().mockResolvedValue(defaults.first),
      all: vi.fn().mockResolvedValue(defaults.all),
      run: vi.fn().mockResolvedValue(defaults.run),
    }),
    withSession: vi.fn().mockReturnThis(),
  };
}

/**
 * Create a mock D1Database with per-query responses.
 * Pass an array of responses; each prepare() call consumes the next one.
 */
export function createSequentialMockDb(
  responses: Array<{
    first?: unknown;
    all?: { results: unknown[] };
    run?: { success: boolean };
  }>,
) {
  let callIndex = 0;

  return {
    prepare: vi.fn().mockImplementation(() => {
      const response = responses[callIndex] ?? {
        first: null,
        all: { results: [] },
        run: { success: true },
      };
      callIndex++;
      return {
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(response.first ?? null),
          all: vi.fn().mockResolvedValue(response.all ?? { results: [] }),
          run: vi.fn().mockResolvedValue(response.run ?? { success: true }),
        }),
        first: vi.fn().mockResolvedValue(response.first ?? null),
        all: vi.fn().mockResolvedValue(response.all ?? { results: [] }),
        run: vi.fn().mockResolvedValue(response.run ?? { success: true }),
      };
    }),
    withSession: vi.fn().mockReturnThis(),
  };
}

// =============================================================================
// MOCK ENV FACTORY
// =============================================================================

/**
 * Create a full mock Env object with test values.
 * Uses the static RSA test keys and sensible defaults.
 */
export function createMockEnv(overrides: Partial<Env> = {}): Env {
  const mockDb = createMockDb();

  return {
    DB: mockDb as unknown as D1Database,
    ENGINE_DB: createMockDb() as unknown as D1Database,
    SESSION_KV: {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockResolvedValue({ keys: [] }),
      getWithMetadata: vi
        .fn()
        .mockResolvedValue({ value: null, metadata: null }),
    } as unknown as KVNamespace,
    SESSIONS: {} as unknown as DurableObjectNamespace,
    CDN_BUCKET: {} as unknown as R2Bucket,
    AUTH_BASE_URL: "https://auth.grove.place",
    ENVIRONMENT: "test",
    CDN_URL: "https://cdn.grove.place",
    JWT_PRIVATE_KEY: TEST_RSA_PRIVATE_KEY,
    JWT_PUBLIC_KEY: TEST_RSA_PUBLIC_KEY,
    GOOGLE_CLIENT_ID: "test-google-client-id",
    GOOGLE_CLIENT_SECRET: "test-google-client-secret",
    RESEND_API_KEY: "test-resend-api-key",
    SESSION_SECRET: "test-session-secret-at-least-32-chars",
    ...overrides,
  };
}

// =============================================================================
// TEST FIXTURES
// =============================================================================

export const TEST_USER = {
  id: "user-test-123",
  email: "test@grove.place",
  name: "Test User",
  avatar_url: null,
  provider: "magic_code" as const,
  provider_id: null,
  is_admin: 0,
  created_at: "2025-01-01T00:00:00.000Z",
  last_login: "2025-01-15T00:00:00.000Z",
};

export const TEST_CLIENT = {
  id: "client-test-456",
  name: "Test App",
  client_id: "test-app",
  client_secret_hash: "", // Will be set dynamically per test
  redirect_uris: JSON.stringify(["https://app.example.com/callback"]),
  allowed_origins: JSON.stringify(["https://app.example.com"]),
  domain: "example.com",
  is_internal_service: 0,
  created_at: "2025-01-01T00:00:00.000Z",
  updated_at: "2025-01-01T00:00:00.000Z",
};

// =============================================================================
// REQUEST HELPERS
// =============================================================================

/**
 * Create a form-encoded body string from params
 */
export function formBody(params: Record<string, string>): string {
  return new URLSearchParams(params).toString();
}

/**
 * Create a Request with form-encoded body
 */
export function createFormRequest(
  url: string,
  params: Record<string, string>,
  headers: Record<string, string> = {},
): Request {
  return new Request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...headers,
    },
    body: formBody(params),
  });
}

/**
 * Create a Request with JSON body
 */
export function createJsonRequest(
  url: string,
  body: unknown,
  headers: Record<string, string> = {},
): Request {
  return new Request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}
