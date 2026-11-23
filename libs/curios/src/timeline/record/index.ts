/**
 * A day's run record (#1798, slice 3).
 *
 * `d1DayRun` is everything `generateDay` needs from the database: where the run's
 * row goes, where its entries go, and where earlier days come from. The three live
 * together so a caller cannot pick two and forget the third — `search_past_days`
 * without the record would be a tool that always says nothing.
 *
 * Every query here is scoped by `tenant_id`. The record belongs to the tenant
 * (Lyra decision 51), and a day's page is private to it, so a search that forgot the
 * scope would be a cross-tenant leak rather than a slow query.
 */

import type { StorageSlot } from "@autumnsgrove/lyra";
import type { PastDays } from "../recipe/tools";
import { createPastDays } from "./past-days";
import { d1RunStorage } from "./storage";
import { d1RunStore } from "./store";
import type { DayRunStore } from "./types";

export interface DayRunDeps {
	store: DayRunStore;
	storage: (runId: string) => StorageSlot;
	pastDays: PastDays;
}

/** The record, its entries and the past-days search, all over one tenant's D1. */
export function d1DayRun(db: D1Database, tenantId: string): DayRunDeps {
	return {
		store: d1RunStore(db),
		storage: (runId) => d1RunStorage(db, runId),
		pastDays: createPastDays(db, tenantId),
	};
}

export { createPastDays } from "./past-days";
export { d1RunStorage } from "./storage";
export { d1RunStore, listRunsForDay, readRun } from "./store";
export type { DayRunFinish, DayRunRow, DayRunStart, DayRunStore } from "./types";
