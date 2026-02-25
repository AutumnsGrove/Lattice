/**
 * Grove Server SDK
 *
 * The roots run deep. The tree stands anywhere.
 *
 * Infrastructure abstraction layer that wraps each primitive
 * (database, storage, key-value, scheduling, service calls)
 * in a clean TypeScript interface.
 *
 * @example
 * ```typescript
 * // Import interfaces (platform-agnostic)
 * import type { GroveDatabase, GroveStorage, GroveKV, GroveContext } from "@autumnsgrove/server-sdk";
 *
 * // Cloudflare adapter (platform-specific, only in entry point)
 * import { createCloudflareContext } from "@autumnsgrove/server-sdk/cloudflare";
 *
 * // Test mocks
 * import { createMockContext } from "@autumnsgrove/server-sdk/testing";
 * ```
 *
 * @module @autumnsgrove/server-sdk
 */

// Context
export type { GroveContext } from "./context.js";

// Interfaces
export type {
	// Database
	GroveDatabase,
	PreparedStatement,
	BoundStatement,
	QueryResult,
	QueryMeta,
	GroveTransaction,
	DatabaseInfo,
	// Storage
	GroveStorage,
	PutOptions,
	StorageObject,
	StorageObjectMeta,
	ListOptions,
	StorageListResult,
	PresignOptions,
	StorageInfo,
	// Key-Value
	GroveKV,
	KVGetOptions,
	KVPutOptions,
	KVListOptions,
	KVListResult,
	KVKey,
	KVValueMeta,
	KVInfo,
	// Service Bus
	GroveServiceBus,
	ServiceRequest,
	ServiceResponse,
	ServiceBusInfo,
	// Scheduler
	GroveScheduler,
	ScheduleHandler,
	ScheduleEvent,
	ScheduleInfo,
	SchedulerInfo,
	// Config
	GroveConfig,
	ConfigInfo,
	// Observability
	GroveObserver,
	GroveEvent,
} from "./types.js";

// Errors
export { SRV_ERRORS, type SrvErrorKey } from "./errors.js";
