/**
 * Login Graft Server Utilities
 *
 * Server-side exports for the LoginGraft system.
 * Provides handler factories and utilities for OAuth authentication.
 *
 * NOTE: With Better Auth migration, createLoginHandler is removed.
 * LoginGraft now redirects directly to Better Auth's /api/auth/sign-in/social
 * endpoint, so no custom login handler is needed.
 *
 * @example
 * ```typescript
 * // In routes/auth/callback/+server.ts
 * import { createCallbackHandler } from '@autumnsgrove/groveengine/grafts/login/server';
 *
 * export const GET = createCallbackHandler({
 *   clientId: 'my-app',
 *   authApiUrl: 'https://auth-api.grove.place',
 *   defaultReturnTo: '/dashboard'
 * });
 * ```
 */

// Types
export type {
  CallbackHandlerConfig,
  PKCEValues,
  AuthCookieState,
} from "../types.js";

// Handler factories
export { createCallbackHandler } from "./callback.js";

// PKCE utilities
export {
  generatePKCE,
  generateCodeChallenge,
  generateRandomString,
  generateState,
} from "./pkce.js";

// Origin utilities
export {
  getRealOrigin,
  isProduction,
  isGrovePlatform,
  getCookieDomain,
} from "./origin.js";
