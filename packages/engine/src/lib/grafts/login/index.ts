/**
 * Login Graft
 *
 * Auth UI and utilities for the Grove login system.
 *
 * AUTH ARCHITECTURE: All auth flows go through login.grove.place.
 * Engine tenant sites redirect to the login hub — they do NOT render
 * LoginGraft or make cross-origin auth API calls. Use buildLoginUrl()
 * to redirect users to the login hub.
 *
 * The LoginGraft component itself is only used ON login.grove.place
 * where auth API calls are same-origin.
 *
 * @example Redirect to login hub (engine tenant sites)
 * ```typescript
 * import { buildLoginUrl } from '@autumnsgrove/groveengine/grafts/login';
 * throw redirect(302, buildLoginUrl(`${url.origin}/auth/callback?returnTo=/arbor`));
 * ```
 */

// Types
export type {
  AuthProvider,
  LoginVariant,
  LoginGraftProps,
  ProviderIconProps,
  ProviderConfig,
  PasskeyAuthResult,
  PasskeyButtonProps,
} from "./types.js";

// Config & utilities
export {
  PROVIDERS,
  getProviderConfig,
  getProviderName,
  isProviderAvailable,
  getAvailableProviders,
  DEFAULT_PROVIDERS,
  DEFAULT_LOGIN_URL,
  DEFAULT_RETURN_TO,
  GROVEAUTH_URLS,
  AUTH_COOKIE_NAMES,
  AUTH_COOKIE_OPTIONS,
  LOGIN_URL,
  buildLoginUrl,
  buildPasskeyUrl,
} from "./config.js";

// Components
export { default as LoginGraft } from "./LoginGraft.svelte";
export { default as ProviderIcon } from "./ProviderIcon.svelte";
export { default as PasskeyButton } from "./PasskeyButton.svelte";
export { default as EmailButton } from "./EmailButton.svelte";

// Passkey utilities
export {
  authenticateWithPasskey,
  isWebAuthnSupported,
  hasPasskeysAvailable,
  isConditionalMediationSupported,
} from "./passkey-authenticate.js";
export type { AuthenticateOptions } from "./passkey-authenticate.js";
