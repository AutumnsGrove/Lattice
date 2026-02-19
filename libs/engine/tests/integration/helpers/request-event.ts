/**
 * Mock SvelteKit RequestEvent Factory
 *
 * Creates a mock RequestEvent compatible with SvelteKit's server hooks and endpoints.
 * Composes existing Cloudflare mocks (D1, R2, KV) into a platform environment.
 */

import { vi } from "vitest";
import {
  createMockD1,
  createMockR2,
  createMockKV,
} from "../../../src/lib/server/services/__mocks__/cloudflare.js";

// ============================================================================
// Types
// ============================================================================

export interface MockCookies {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  getAll: ReturnType<typeof vi.fn>;
  serialize: ReturnType<typeof vi.fn>;
}

export interface MockPlatformEnv {
  DB: ReturnType<typeof createMockD1>;
  CDN: ReturnType<typeof createMockR2>;
  IMAGES: ReturnType<typeof createMockR2>;
  CACHE_KV: ReturnType<typeof createMockKV>;
  AUTH?: MockServiceBinding;
  TENANTS?: MockDONamespace;
  TURNSTILE_SECRET_KEY?: string;
  GROVEAUTH_URL?: string;
  LEMONSQUEEZY_WEBHOOK_SECRET?: string;
  SHOP_ECOMMERCE_DISABLED?: string;
  [key: string]: unknown;
}

export interface MockServiceBinding {
  fetch: ReturnType<typeof vi.fn>;
}

export interface MockDONamespace {
  idFromName: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
}

export interface MockRequestEventConfig {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  params?: Record<string, string>;
  body?: unknown;
  locals?: Record<string, unknown>;
  platform?: {
    env?: Partial<MockPlatformEnv>;
  };
}

export interface MockRequestEvent {
  url: URL;
  request: Request;
  params: Record<string, string>;
  cookies: MockCookies;
  locals: Record<string, unknown>;
  platform: {
    env: MockPlatformEnv;
  };
  getClientAddress: ReturnType<typeof vi.fn>;
  isDataRequest: boolean;
  isSubRequest: boolean;
  route: { id: string | null };
  setHeaders: ReturnType<typeof vi.fn>;
  fetch: ReturnType<typeof vi.fn>;
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a mock SvelteKit RequestEvent for integration testing.
 *
 * @example
 * ```ts
 * const event = createMockRequestEvent({
 *   url: 'https://autumn.grove.place/api/images/upload',
 *   method: 'POST',
 *   headers: { 'x-forwarded-host': 'autumn.grove.place' },
 *   cookies: { grove_session: 'test-session-token' },
 *   locals: { user: { id: 'user-1', email: 'test@example.com' } },
 * });
 * ```
 */
export function createMockRequestEvent(
  config: MockRequestEventConfig = {},
): MockRequestEvent {
  const {
    url: urlString = "https://grove.place/",
    method = "GET",
    headers: headerEntries = {},
    cookies: cookieEntries = {},
    params = {},
    body,
    locals: localsInit = {},
    platform,
  } = config;

  // Build URL
  const url = new URL(urlString);

  // Build request
  const requestHeaders = new Headers(headerEntries);
  if (Object.keys(cookieEntries).length > 0) {
    const cookieString = Object.entries(cookieEntries)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
    requestHeaders.set("cookie", cookieString);
  }

  const requestInit: RequestInit = {
    method,
    headers: requestHeaders,
  };

  if (body && method !== "GET" && method !== "HEAD") {
    if (
      body instanceof FormData ||
      body instanceof ReadableStream ||
      body instanceof ArrayBuffer
    ) {
      requestInit.body = body as BodyInit;
    } else {
      requestInit.body = JSON.stringify(body);
      if (!requestHeaders.has("content-type")) {
        requestHeaders.set("content-type", "application/json");
      }
    }
  }

  const request = new Request(url.toString(), requestInit);

  // Build cookies mock
  const cookieStore = new Map<string, string>(Object.entries(cookieEntries));
  const cookies: MockCookies = {
    get: vi.fn((name: string) => cookieStore.get(name) ?? null),
    set: vi.fn((name: string, value: string) => {
      cookieStore.set(name, value);
    }),
    delete: vi.fn((name: string) => {
      cookieStore.delete(name);
    }),
    getAll: vi.fn(() =>
      Array.from(cookieStore.entries()).map(([name, value]) => ({
        name,
        value,
      })),
    ),
    serialize: vi.fn(() =>
      Array.from(cookieStore.entries())
        .map(([k, v]) => `${k}=${v}`)
        .join("; "),
    ),
  };

  // Build platform environment
  const env: MockPlatformEnv = {
    DB: createMockD1(),
    CDN: createMockR2(),
    IMAGES: createMockR2(),
    CACHE_KV: createMockKV(),
    AUTH: createMockServiceBinding(),
    ...platform?.env,
  };

  // Build locals
  const locals: Record<string, unknown> = {
    user: null,
    context: { type: "landing" },
    csrfToken: "test-csrf-token",
    tenantId: null,
    ...localsInit,
  };

  // Build the event
  const responseHeaders = new Headers();
  const event: MockRequestEvent = {
    url,
    request,
    params,
    cookies,
    locals,
    platform: { env },
    getClientAddress: vi.fn(() => "127.0.0.1"),
    isDataRequest: false,
    isSubRequest: false,
    route: { id: url.pathname },
    setHeaders: vi.fn((headers: Record<string, string>) => {
      for (const [key, value] of Object.entries(headers)) {
        responseHeaders.set(key, value);
      }
    }),
    fetch: vi.fn(),
  };

  return event;
}

// ============================================================================
// Helper Factories
// ============================================================================

/**
 * Create a mock service binding (e.g., AUTH Worker)
 */
export function createMockServiceBinding(): MockServiceBinding {
  return {
    fetch: vi.fn(
      async () =>
        new Response(JSON.stringify({ valid: false }), {
          headers: { "content-type": "application/json" },
        }),
    ),
  };
}

/**
 * Create a mock Durable Object namespace
 */
export function createMockDONamespace(): MockDONamespace {
  const stubs = new Map<string, { fetch: ReturnType<typeof vi.fn> }>();

  return {
    idFromName: vi.fn((name: string) => ({ name })),
    get: vi.fn((id: { name: string }) => {
      if (!stubs.has(id.name)) {
        stubs.set(id.name, {
          fetch: vi.fn(
            async () =>
              new Response(JSON.stringify({}), {
                headers: { "content-type": "application/json" },
              }),
          ),
        });
      }
      return stubs.get(id.name)!;
    }),
  };
}

/**
 * Create a mock RequestEvent pre-configured for an authenticated tenant context
 */
export function createAuthenticatedTenantEvent(
  tenantId: string,
  userId: string,
  config: Partial<MockRequestEventConfig> = {},
): MockRequestEvent {
  return createMockRequestEvent({
    ...config,
    headers: {
      "x-forwarded-host": `test-tenant.grove.place`,
      ...config.headers,
    },
    locals: {
      user: {
        id: userId,
        email: `${userId}@example.com`,
        name: "Test User",
        picture: "https://cdn.grove.place/avatars/default.jpg",
        isAdmin: false,
      },
      context: {
        type: "tenant",
        tenant: {
          id: tenantId,
          subdomain: "test-tenant",
          name: "Test Tenant",
          theme: null,
          ownerId: userId,
          plan: "seedling",
        },
      },
      tenantId,
      csrfToken: "test-csrf-token",
      ...config.locals,
    },
  });
}
