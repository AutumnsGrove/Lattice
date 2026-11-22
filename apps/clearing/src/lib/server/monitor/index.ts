/**
 * Clearing Monitor — Barrel Export
 *
 * Re-exports monitor modules for clean imports from worker-entry.ts
 * and SvelteKit API routes.
 */

export { COMPONENTS } from "./config";
export type { ComponentConfig } from "./config";

export { checkAllComponents, checkComponent } from "./health-checks";
export type { HealthCheckResult } from "./health-checks";

export {
	processAllResults,
	processHealthCheckResult,
	closeStaleIncidents,
} from "./incident-manager";
export type { IncidentEnv, ComponentState } from "./incident-manager";

export {
	recordDailyHistory,
	cleanupOldHistory,
	recordCheckResult,
	averageStatusFromCounts,
} from "./daily-history";
export type { DailyHistoryEnv } from "./daily-history";

export { ComponentStatus, generateUUID } from "./utils";
