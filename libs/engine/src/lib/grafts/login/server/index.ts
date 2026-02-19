/**
 * Login Graft Server Utilities
 *
 * Server-side exports for the LoginGraft system.
 * Provides handler factories and utilities for OAuth authentication.
 *
 * AUTH ARCHITECTURE: All auth flows go through login.grove.place.
 * Engine tenant sites redirect to the login hub via buildLoginUrl().
 * After authentication, the login hub redirects back to the engine's
 * /auth/callback route, which verifies the session cookie and sends
 * the user to their destination.
 *
 * @example Redirect to login hub
 * ```typescript
 * import { buildLoginUrl } from '$lib/grafts/login/config.js';
 * throw redirect(302, buildLoginUrl(`${url.origin}/auth/callback?returnTo=/arbor`));
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
