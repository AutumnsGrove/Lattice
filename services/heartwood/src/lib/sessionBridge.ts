/**
 * Session Bridge - Creates SessionDO sessions after Better Auth authenticates
 *
 * This module bridges Better Auth's ba_session to our SessionDO system:
 * 1. Before calling BA handler, register the request with registerRequestForBridge()
 * 2. After BA creates a session, the hook calls bridgeSessionToSessionDO()
 * 3. The response wrapper retrieves the sessionId and sets the grove_session cookie
 *
 * We use two Maps for per-request tracking:
 * - pendingRequests: Request → { env, timestamp } (registered before BA handles)
 * - pendingBridges: Request → SessionBridgeResult (set by hook)
 *
 * Both use WeakMap for automatic cleanup when Request objects are GC'd.
 */

import type { Env } from "../types.js";
import type { SessionDO, CreateSessionParams } from "../durables/SessionDO.js";
import {
  getDeviceId,
  parseDeviceName,
  getClientIP,
  getUserAgent,
} from "./session.js";

/**
 * Per-request storage for session bridge data
 */
export interface SessionBridgeResult {
  sessionId: string;
  userId: string;
  error?: string;
}

interface PendingRequestContext {
  env: Env;
  timestamp: number;
}

const pendingRequests = new WeakMap<Request, PendingRequestContext>();
const pendingBridges = new WeakMap<Request, SessionBridgeResult>();

// Timeout for stale request cleanup (5 minutes)
const REQUEST_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Redact sensitive ID for logging
 * Shows first 4 and last 2 characters: "user_abc...xy"
 * This allows debugging while preventing full ID exposure in logs
 */
function redactId(id: string): string {
  if (id.length <= 8) return "***";
  return `${id.slice(0, 6)}...${id.slice(-2)}`;
}

/**
 * Register a request before calling Better Auth handler
 * This stores the env context so the hook can access it later
 */
export function registerRequestForBridge(request: Request, env: Env): void {
  pendingRequests.set(request, {
    env,
    timestamp: Date.now(),
  });
}

/**
 * Get the registered request context
 * Returns undefined if not registered or expired
 */
export function getRequestContext(
  request: Request,
): PendingRequestContext | undefined {
  const ctx = pendingRequests.get(request);
  if (!ctx) return undefined;

  // Check for timeout (stale request)
  if (Date.now() - ctx.timestamp > REQUEST_TIMEOUT_MS) {
    pendingRequests.delete(request);
    return undefined;
  }

  return ctx;
}

/**
 * Clean up registered request context
 * Called after response is sent
 */
export function cleanupRequestContext(request: Request): void {
  pendingRequests.delete(request);
  pendingBridges.delete(request);
}

/**
 * Store session bridge result for a request
 * Called by the database hook after creating SessionDO session
 */
export function setSessionBridgeResult(
  request: Request,
  result: SessionBridgeResult,
): void {
  pendingBridges.set(request, result);
}

/**
 * Retrieve session bridge result for a request (without consuming)
 * Called by the response wrapper to get the sessionId for cookie
 */
export function getSessionBridgeResult(
  request: Request,
): SessionBridgeResult | undefined {
  return pendingBridges.get(request);
}

/**
 * Bridge a Better Auth session to SessionDO
 *
 * Called from databaseHooks.session.create.after to create a parallel
 * SessionDO session after BA successfully authenticates a user.
 *
 * @param request - The original Request object (for device fingerprinting)
 * @param baSession - The Better Auth session data
 * @param env - Cloudflare Worker environment
 */
export async function bridgeSessionToSessionDO(
  request: Request,
  baSession: {
    id: string;
    userId: string;
    expiresAt: Date;
    ipAddress?: string | null;
    userAgent?: string | null;
  },
  env: Env,
): Promise<SessionBridgeResult> {
  try {
    // Generate device fingerprint for SessionDO
    const deviceId = await getDeviceId(request, env.SESSION_SECRET);
    const userAgent = baSession.userAgent || getUserAgent(request);
    const deviceName = parseDeviceName(userAgent);
    const ipAddress = baSession.ipAddress || getClientIP(request);

    // Calculate session duration (time until expiration)
    const now = Date.now();
    const expiresAt =
      baSession.expiresAt instanceof Date
        ? baSession.expiresAt.getTime()
        : new Date(baSession.expiresAt).getTime();
    const expiresInSeconds = Math.max(
      Math.floor((expiresAt - now) / 1000),
      60 * 60, // Minimum 1 hour
    );

    // Get SessionDO for this user
    const sessionDO = env.SESSIONS.get(
      env.SESSIONS.idFromName(`session:${baSession.userId}`),
    ) as DurableObjectStub<SessionDO>;

    // Create SessionDO session
    const createParams: CreateSessionParams = {
      deviceId,
      deviceName,
      ipAddress,
      userAgent,
      expiresInSeconds,
    };

    const { sessionId } = await sessionDO.createSession(createParams);

    // Log with redacted IDs to prevent exposure in log aggregation services
    console.log(
      `[SessionBridge] Created session ${redactId(sessionId)} for user ${redactId(baSession.userId)}`,
    );

    const result: SessionBridgeResult = {
      sessionId,
      userId: baSession.userId,
    };

    // Store for response wrapper
    setSessionBridgeResult(request, result);

    return result;
  } catch (error) {
    // Log full error server-side for debugging
    console.error("[SessionBridge] Failed to create SessionDO session:", error);

    // Store GENERIC error message to prevent information disclosure
    // Full error is logged above for debugging but not stored in result
    const errorResult: SessionBridgeResult = {
      sessionId: "",
      userId: baSession.userId,
      error: "Session creation failed", // Generic message, not original error
    };

    setSessionBridgeResult(request, errorResult);

    return errorResult;
  }
}
