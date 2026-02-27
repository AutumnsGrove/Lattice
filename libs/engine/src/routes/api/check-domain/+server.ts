/**
 * Domain Availability Check API
 *
 * Lightweight endpoint that checks whether a domain is available for
 * registration using RDAP (the modern, free replacement for WHOIS).
 *
 * GET /api/check-domain?domain=example.com
 *
 * Returns: { domain, status, registrar?, error? }
 *
 * Rate limited via KV to prevent abuse of upstream RDAP servers.
 * Requires authentication (any signed-in user).
 */

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { normalizeDomain, checkDomain } from "$lib/server/rdap";

/** Rate limit: 15 checks per minute per IP */
const RATE_LIMIT = {
	maxRequests: 15,
	windowSeconds: 60,
	kvBufferSeconds: 60,
};

/**
 * KV-based rate limiter (same pattern as check-username)
 */
async function checkRateLimit(
	kv: KVNamespace | undefined,
	clientIp: string,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
	if (!kv) {
		return { allowed: true, remaining: RATE_LIMIT.maxRequests, resetAt: 0 };
	}

	const key = `rate:domain-check:${clientIp}`;
	const now = Math.floor(Date.now() / 1000);

	try {
		const data = (await kv.get(key, "json")) as {
			count: number;
			resetAt: number;
		} | null;

		if (!data || now >= data.resetAt) {
			const newData = { count: 1, resetAt: now + RATE_LIMIT.windowSeconds };
			await kv.put(key, JSON.stringify(newData), {
				expirationTtl: RATE_LIMIT.windowSeconds + RATE_LIMIT.kvBufferSeconds,
			});
			return {
				allowed: true,
				remaining: RATE_LIMIT.maxRequests - 1,
				resetAt: newData.resetAt,
			};
		}

		if (data.count >= RATE_LIMIT.maxRequests) {
			return { allowed: false, remaining: 0, resetAt: data.resetAt };
		}

		const newData = { count: data.count + 1, resetAt: data.resetAt };
		await kv.put(key, JSON.stringify(newData), {
			expirationTtl: data.resetAt - now + RATE_LIMIT.kvBufferSeconds,
		});
		return {
			allowed: true,
			remaining: RATE_LIMIT.maxRequests - newData.count,
			resetAt: data.resetAt,
		};
	} catch (err) {
		console.error("[Rate Limit] KV error:", err);
		return { allowed: true, remaining: RATE_LIMIT.maxRequests, resetAt: 0 };
	}
}

export const GET: RequestHandler = async ({
	url,
	locals,
	platform,
	getClientAddress,
}) => {
	// Auth check — must be signed in
	if (!locals.user) {
		throw error(401, "Sign in to check domain availability");
	}

	// Rate limit
	const clientIp = getClientAddress();
	const kv = platform?.env?.CACHE_KV;
	const rateLimit = await checkRateLimit(kv, clientIp);

	const headers: Record<string, string> = {
		"X-RateLimit-Limit": String(RATE_LIMIT.maxRequests),
		"X-RateLimit-Remaining": String(rateLimit.remaining),
		"X-RateLimit-Reset": String(rateLimit.resetAt),
	};

	if (!rateLimit.allowed) {
		const retryAfter = rateLimit.resetAt - Math.floor(Date.now() / 1000);
		return json(
			{
				domain: "",
				status: "unknown" as const,
				error: "Too many requests. Please try again shortly.",
			},
			{ status: 429, headers: { ...headers, "Retry-After": String(retryAfter) } },
		);
	}

	// Parse and validate input
	const raw = url.searchParams.get("domain") ?? "";
	const domain = normalizeDomain(raw);

	if (!domain) {
		return json(
			{
				domain: raw,
				status: "unknown" as const,
				error: "Enter a valid domain (e.g. example.com)",
			},
			{ status: 400, headers },
		);
	}

	// Check availability via RDAP
	const result = await checkDomain(domain);

	return json(result, { headers });
};
