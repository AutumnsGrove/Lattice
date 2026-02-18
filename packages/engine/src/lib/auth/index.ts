/**
 * Auth barrel export
 *
 * Note: Legacy JWT utilities have been removed.
 * Session management is now handled by Heartwood SessionDO.
 * Only tenant verification functions remain.
 */

export { verifyTenantOwnership, getVerifiedTenantId } from "./session.js";
export type { User, SessionError } from "./session.js";
