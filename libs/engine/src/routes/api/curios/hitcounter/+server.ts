/**
 * Hit Counter Curio API — Public Endpoint
 *
 * GET — Fetch counter value and optionally increment it.
 *       Uses atomic SQL increment to prevent race conditions.
 *
 * Dedup algorithm (when count_mode === "unique"):
 *   1. Compute SHA-256 of (IP + UserAgent + date + pagePath)
 *   2. INSERT into hit_counter_visitors with ON CONFLICT DO NOTHING
 *   3. If changes() === 0, this visitor already counted today → skip increment
 *   Hash rotates daily (date is part of input), so no cross-day tracking.
 *   Cleanup: DELETE WHERE visited_date < date('now', '-2 days')
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";
import { generateHitCounterId, formatCount, toDigits } from "$lib/curios/hitcounter";

interface CounterRow {
	id: string;
	count: number;
	style: string;
	label: string;
	show_since_date: number;
	started_at: string;
	count_mode: string;
	since_date_style: string;
}

/**
 * Compute a privacy-preserving visitor hash.
 * SHA-256(ip + ua + date + path) — one-way, rotates daily.
 * Uses crypto.subtle.digest which is hardware-accelerated on Workers (~0.01ms).
 */
async function computeVisitorHash(
	ip: string,
	ua: string,
	date: string,
	path: string,
): Promise<string> {
	const input = `${ip}|${ua}|${date}|${path}`;
	const encoded = new TextEncoder().encode(input);
	const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const GET: RequestHandler = async ({ url, platform, locals, request }) => {
	const db = platform?.env?.CURIO_DB;
	const tenantId = locals.tenantId;

	if (!db) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	}

	if (!tenantId) {
		throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
	}

	const pagePath = url.searchParams.get("page") || "/";
	const increment = url.searchParams.get("increment") !== "false";

	// Fetch current state first to check count_mode before incrementing
	let counter = await db
		.prepare(
			`SELECT id, count, style, label, show_since_date, started_at, count_mode, since_date_style
       FROM hit_counters
       WHERE tenant_id = ? AND page_path = ?`,
		)
		.bind(tenantId, pagePath)
		.first<CounterRow>();

	const countMode = counter?.count_mode ?? "every";

	// Atomic increment + fetch in one query
	// If no row exists, create one with count=1 (first visitor)
	if (increment) {
		let shouldIncrement = true;

		// Unique daily dedup: check if this visitor already counted today
		if (countMode === "unique") {
			try {
				const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
				const ua = request.headers.get("user-agent") ?? "unknown";
				const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
				const hash = await computeVisitorHash(ip, ua, today, pagePath);

				const result = await db
					.prepare(
						`INSERT INTO hit_counter_visitors (tenant_id, page_path, visitor_hash, visited_date)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(tenant_id, page_path, visitor_hash, visited_date) DO NOTHING`,
					)
					.bind(tenantId, pagePath, hash, today)
					.run();

				// If 0 rows changed, this visitor already counted today
				if ((result.meta as D1Meta).changes === 0) {
					shouldIncrement = false;
				}
			} catch (err) {
				// Non-fatal — fall through to increment anyway
				logGroveError("API", API_ERRORS.OPERATION_FAILED, {
					detail: "Visitor dedup check failed",
					cause: err,
				});
			}
		}

		if (shouldIncrement) {
			try {
				await db
					.prepare(
						`INSERT INTO hit_counters (id, tenant_id, page_path, count, updated_at)
             VALUES (?, ?, ?, 1, datetime('now'))
             ON CONFLICT(tenant_id, page_path) DO UPDATE SET
               count = count + 1,
               updated_at = datetime('now')`,
					)
					.bind(generateHitCounterId(), tenantId, pagePath)
					.run();
			} catch (err) {
				// Non-fatal — we can still return the current count
				logGroveError("API", API_ERRORS.OPERATION_FAILED, {
					detail: "Hit counter increment failed",
					cause: err,
				});
			}
		}

		// Re-fetch after increment
		counter = await db
			.prepare(
				`SELECT id, count, style, label, show_since_date, started_at, count_mode, since_date_style
         FROM hit_counters
         WHERE tenant_id = ? AND page_path = ?`,
			)
			.bind(tenantId, pagePath)
			.first<CounterRow>();
	}

	if (!counter) {
		// No counter exists yet — return zeros
		return json(
			{
				count: 0,
				formattedCount: "0",
				digits: ["0", "0", "0", "0", "0", "0"],
				style: "classic",
				label: "You are visitor",
				showSinceDate: true,
				startedAt: new Date().toISOString(),
				sinceDateStyle: "footnote",
			},
			{
				headers: {
					"Cache-Control": "no-store",
				},
			},
		);
	}

	return json(
		{
			count: counter.count,
			formattedCount: formatCount(counter.count),
			digits: toDigits(counter.count),
			style: counter.style,
			label: counter.label || "You are visitor",
			showSinceDate: Boolean(counter.show_since_date),
			startedAt: counter.started_at,
			sinceDateStyle: counter.since_date_style || "footnote",
		},
		{
			headers: {
				// No caching — each request should reflect the latest count
				"Cache-Control": "no-store",
			},
		},
	);
};
