/**
 * Grove Pulse Collector
 *
 * Product observability event pipeline. Receives batched events from
 * all Grove apps via service binding, routes them to a PulseBuffer
 * Durable Object for buffered D1 writes.
 *
 * Cron: Daily at 1 AM UTC — aggregate raw events into daily rollups,
 * prune events older than 90 days.
 */

// Pipeline thresholds (see also: emitter.ts FLUSH_THRESHOLD = 50)
// PulseBuffer DO flushes at FLUSH_THRESHOLD = 100 events or ALARM_INTERVAL_MS = 10s

export { PulseBuffer } from "./pulse-buffer.js";

// Batch size cap — reject requests that exceed this
const MAX_BATCH_SIZE = 500;

// Retention + time constants
const RETENTION_DAYS = 90;
const DAY_S = 86_400;
const DAY_MS = 86_400_000;

// Field length caps
const MAX_EVENT_LEN = 100;
const MAX_ROUTE_LEN = 500;
const MAX_APP_LEN = 50;
const MAX_METADATA_JSON_BYTES = 4_096;

// Allowlists — reject events with unknown categories
const VALID_CATEGORIES = new Set([
	"page",
	"signup",
	"publish",
	"social",
	"curio",
	"feature",
	"error",
]);
const VALID_APPS = new Set([
	"amber",
	"aspen",
	"billing",
	"clearing",
	"domains",
	"landing",
	"login",
	"plant",
	"timeline-sync",
]);

interface Env {
	OBS_DB: D1Database;
	PULSE_BUFFER: DurableObjectNamespace;
}

interface RawEvent {
	event: unknown;
	category: unknown;
	route?: unknown;
	method?: unknown;
	status?: unknown;
	duration_ms?: unknown;
	tenant_id?: unknown;
	visitor_hash?: unknown;
	app?: unknown;
	metadata?: unknown;
	timestamp?: unknown;
}

interface ValidatedEvent {
	event: string;
	category: string;
	route?: string;
	method?: string;
	status?: number;
	duration_ms?: number;
	tenant_id?: string;
	visitor_hash?: string;
	app?: string;
	metadata?: Record<string, unknown>;
	timestamp?: number;
}

/** Filter and sanitize a raw unknown event. Returns null if the event is invalid. */
function validateEvent(raw: unknown): ValidatedEvent | null {
	if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
	const e = raw as RawEvent;

	if (typeof e.event !== "string" || typeof e.category !== "string") return null;

	const event = e.event.slice(0, MAX_EVENT_LEN);
	const category = VALID_CATEGORIES.has(e.category) ? e.category : "unknown";

	const route = typeof e.route === "string" ? e.route.slice(0, MAX_ROUTE_LEN) : undefined;
	const method = typeof e.method === "string" ? e.method : undefined;
	const status = typeof e.status === "number" ? e.status : undefined;
	const duration_ms = typeof e.duration_ms === "number" ? e.duration_ms : undefined;
	const tenant_id = typeof e.tenant_id === "string" ? e.tenant_id : undefined;
	const visitor_hash = typeof e.visitor_hash === "string" ? e.visitor_hash : undefined;
	const app =
		typeof e.app === "string"
			? VALID_APPS.has(e.app)
				? e.app.slice(0, MAX_APP_LEN)
				: "unknown"
			: undefined;
	const timestamp = typeof e.timestamp === "number" ? e.timestamp : undefined;

	let metadata: Record<string, unknown> | undefined;
	if (
		e.metadata !== undefined &&
		typeof e.metadata === "object" &&
		e.metadata !== null &&
		!Array.isArray(e.metadata)
	) {
		const json = JSON.stringify(e.metadata);
		// Drop metadata if it exceeds the byte cap
		if (new TextEncoder().encode(json).length <= MAX_METADATA_JSON_BYTES) {
			metadata = e.metadata as Record<string, unknown>;
		}
	}

	return {
		event,
		category,
		route,
		method,
		status,
		duration_ms,
		tenant_id,
		visitor_hash,
		app,
		metadata,
		timestamp,
	};
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		if (request.method === "GET") {
			return Response.json({ status: "ready", service: "pulse-collector" });
		}

		if (request.method !== "POST") {
			return Response.json({ error: "Method not allowed" }, { status: 405 });
		}

		// X-Pulse-Source identifies the sending app by name. It isn't trusted for
		// authorization — the app field inside each event is the authoritative value —
		// but it lets us confirm which service actually sent a batch and aids debugging
		// when the claimed app field is missing or mismatched. Requests without the
		// header are accepted normally; provenance is logged as "unknown".
		const source = request.headers.get("X-Pulse-Source") ?? "unknown";

		try {
			const body = await request.json<{ events?: unknown[] }>();
			if (!body.events || !Array.isArray(body.events) || body.events.length === 0) {
				return Response.json({ error: "No events provided" }, { status: 400 });
			}

			if (body.events.length > MAX_BATCH_SIZE) {
				return Response.json(
					{ error: `Batch too large — max ${MAX_BATCH_SIZE} events per request` },
					{ status: 400 },
				);
			}

			// Validate and sanitize each event; drop invalids rather than rejecting the batch
			const validEvents: ValidatedEvent[] = [];
			for (const raw of body.events) {
				const validated = validateEvent(raw);
				if (validated !== null) {
					validEvents.push(validated);
				}
			}

			if (validEvents.length === 0) {
				return Response.json({ error: "No valid events in batch" }, { status: 400 });
			}

			const droppedCount = body.events.length - validEvents.length;

			const bufferId = env.PULSE_BUFFER.idFromName(todayPartition());
			const buffer = env.PULSE_BUFFER.get(bufferId);

			const resp = await buffer.fetch(
				new Request("https://pulse-buffer.internal/ingest", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ events: validEvents }),
				}),
			);

			return Response.json(
				{
					accepted: validEvents.length,
					dropped: droppedCount,
					buffered: true,
					source,
				},
				{ status: resp.ok ? 202 : 500 },
			);
		} catch (err) {
			console.error(
				JSON.stringify({
					source: "pulse-collector",
					error: "Failed to process events",
					context: { message: err instanceof Error ? err.message : String(err) },
				}),
			);
			return Response.json({ error: "Failed to process events" }, { status: 500 });
		}
	},

	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		console.log(`[Pulse] Scheduled run — cron: ${event.cron}`);
		ctx.waitUntil(runDailyAggregation(env.OBS_DB));
	},
};

function todayPartition(): string {
	return new Date().toISOString().split("T")[0];
}

async function runDailyAggregation(db: D1Database): Promise<void> {
	const yesterday = new Date(Date.now() - DAY_MS).toISOString().split("T")[0];
	const cutoff = Math.floor(Date.now() / 1000) - RETENTION_DAYS * DAY_S;

	try {
		await db
			.prepare(
				`INSERT OR REPLACE INTO pulse_daily (date, event, category, route, app, tenant_id, count, unique_visitors, avg_duration_ms, error_count)
			 SELECT
			   ? as date,
			   event,
			   category,
			   COALESCE(route, '') as route,
			   COALESCE(app, '') as app,
			   COALESCE(tenant_id, '') as tenant_id,
			   COUNT(*) as count,
			   COUNT(DISTINCT visitor_hash) as unique_visitors,
			   AVG(duration_ms) as avg_duration_ms,
			   SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) as error_count
			 FROM pulse_events
			 WHERE recorded_at >= ? AND recorded_at < ?
			 GROUP BY event, category, COALESCE(route, ''), COALESCE(app, ''), COALESCE(tenant_id, '')`,
			)
			.bind(yesterday, dateToEpoch(yesterday), dateToEpoch(yesterday) + DAY_S)
			.run();

		console.log(`[Pulse] Aggregated events for ${yesterday}`);
	} catch (err) {
		console.error(
			JSON.stringify({
				source: "pulse-collector",
				error: "Aggregation failed",
				context: { date: yesterday, message: err instanceof Error ? err.message : String(err) },
			}),
		);
	}

	try {
		const result = await db
			.prepare("DELETE FROM pulse_events WHERE recorded_at < ?")
			.bind(cutoff)
			.run();
		console.log(`[Pulse] Pruned ${result.meta.changes} events older than ${RETENTION_DAYS} days`);
	} catch (err) {
		console.error(
			JSON.stringify({
				source: "pulse-collector",
				error: "Retention cleanup failed",
				context: { cutoff, message: err instanceof Error ? err.message : String(err) },
			}),
		);
	}
}

function dateToEpoch(dateStr: string): number {
	return Math.floor(new Date(dateStr + "T00:00:00Z").getTime() / 1000);
}
