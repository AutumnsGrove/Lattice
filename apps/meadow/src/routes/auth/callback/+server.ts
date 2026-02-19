/**
 * OAuth Callback — Meadow
 *
 * Uses the engine's createCallbackHandler factory.
 * After Better Auth sets the session cookie, this verifies it exists
 * and redirects to /feed.
 */

import { createCallbackHandler } from "@autumnsgrove/lattice/grafts/login/server";

export const GET = createCallbackHandler({
  defaultReturnTo: "/feed",
});
