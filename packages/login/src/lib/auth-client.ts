/**
 * Better Auth Client — Same-Origin Configuration
 *
 * Because this client runs on login.grove.place and the auth proxy
 * is at /api/auth/* on the same origin, we use baseURL: "" (empty string).
 *
 * This means:
 * - authClient.signIn.social() → POST /api/auth/sign-in/social → proxied to Heartwood
 * - authClient.signIn.passkey() → POST /api/auth/passkey/... → proxied to Heartwood
 * - All cookies (challenge, session) are same-origin → no CORS, no SameSite issues
 */

import { createAuthClient } from "better-auth/client";
import { magicLinkClient } from "better-auth/client/plugins";
import { passkeyClient } from "@better-auth/passkey/client";

export const authClient = createAuthClient({
  baseURL: "", // same-origin — all requests go to /api/auth/* proxy
  plugins: [magicLinkClient(), passkeyClient()],
});
