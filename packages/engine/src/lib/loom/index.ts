/**
 * Loom — Durable Object Framework for Grove
 *
 * Core barrel export. Adapters have separate export paths for tree-shaking:
 * - @autumnsgrove/lattice/loom           (this file)
 * - @autumnsgrove/lattice/loom/sveltekit
 * - @autumnsgrove/lattice/loom/worker
 * - @autumnsgrove/lattice/loom/testing
 */

// Core types
export type {
  LoomMethod,
  LoomRequestContext,
  LoomRoute,
  JsonStoreRow,
  LoomLogLevel,
  LoomLogEntry,
  LoomWebSocketMessage,
  LoomConfig,
} from "./types.js";

// Base class
export { LoomDO } from "./base.js";

// Router
export { matchRoute, buildRequestContext } from "./router.js";
export type { RouteMatch } from "./router.js";

// Alarm scheduler
export { AlarmScheduler } from "./alarm.js";

// Storage utilities
export { SqlHelper, JsonStore, safeJsonParse } from "./storage.js";

// WebSocket manager
export { WebSocketManager } from "./websocket.js";

// Logger
export { LoomLogger } from "./logger.js";

// Promise lock
export { PromiseLockMap } from "./lock.js";

// Factory helpers
export {
  getLoomStub,
  getLoomStubById,
  loomFetch,
  loomFetchJson,
} from "./factory.js";

// Errors
export { LOOM_ERRORS, LoomResponse, logLoomError } from "./errors.js";
export type { LoomErrorKey } from "./errors.js";
