/**
 * Server-side exports for Grove services
 *
 * Usage in other services:
 * ```typescript
 * import {
 *   validateSession,
 *   requireAuth,
 *   requireAdmin,
 *   type SessionUser
 * } from '@groveauth/server';
 * ```
 */

export {
  validateSession,
  validateSessionFull,
  invalidateSession,
  invalidateAllUserSessions,
  isAdmin,
  requireAuth,
  requireAdmin,
  type SessionUser,
  type SessionData,
  type ValidationResult,
} from "./session.js";
