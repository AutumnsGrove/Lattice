/**
 * Client IP Resolution and Forwarding
 *
 * Where the client's IP address actually comes from, and how it survives a
 * trip between two of our own Workers. (#1679)
 *
 * Three facts this module encodes, none of which are obvious:
 *
 * 1. **`cf-connecting-ip` is only the client on the *first* hop.** Cloudflare
 *    sets it at the edge. A Worker→Worker subrequest that crosses zones gets
 *    `2a06:98c0:3600::103` instead — Cloudflare's own egress address — and
 *    every request then shares one "client". Same-zone subrequests are
 *    supposed to reflect the caller's `x-real-ip` header, so a caller that
 *    wants its callee to see the real client sets `x-real-ip` (and
 *    `cf-connecting-ip` alongside it, for the day that behaviour changes).
 *
 * 2. **The sentinel is never a client.** `2a06:98c0:3600::103` means "a
 *    Worker made this request", not "the client's address is
 *    2a06:98c0:3600::103". Anything that keys on it — a rate limit bucket, a
 *    session's `ip_address` — is keying on a constant.
 *
 * 3. **A forwarded header is only meaningful when a Worker made the
 *    request.** On a direct edge request `cf-connecting-ip` is trustworthy
 *    and `x-forwarded-for` is client-controlled. When `cf-connecting-ip` is
 *    the sentinel (or absent), the request necessarily came from a Worker
 *    subrequest, so the forwarded headers are ours to believe.
 *
 * @module server/utils/client-ip
 */

/**
 * Cloudflare's client IP for Worker subrequests.
 * @see https://developers.cloudflare.com/fundamentals/reference/http-headers/#cf-connecting-ip
 */
export const CLOUDFLARE_WORKER_CLIENT_IP = "2a06:98c0:3600::103";

/** Where a resolved address came from. */
export type ClientIpSource = "direct" | "forwarded" | "none";

export interface ResolvedClientIp {
	/** The client's address, or null when it cannot be determined. */
	ip: string | null;
	/**
	 * `direct` — `cf-connecting-ip` from the edge, trustworthy.
	 * `forwarded` — a Worker forwarded it via `x-real-ip`/`x-forwarded-for`.
	 * `none` — no usable address; do not invent one.
	 */
	source: ClientIpSource;
}

/**
 * Shape checks, not full range validation. Their only job is to reject the
 * values that actually show up in these headers when something is wrong —
 * `""`, `unknown`, a comma-joined list — rather than to police what a valid
 * IPv6 address looks like.
 */
const IPV4 = /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
const IPV6 = /^(?=[0-9a-f:]*:)[0-9a-f:]{2,45}$/i;

/** Is this a plausible single IP address? */
export function isValidIpAddress(value: string | null | undefined): value is string {
	if (!value) return false;
	const trimmed = value.trim();
	if (!trimmed) return false;
	return IPV4.test(trimmed) || IPV6.test(trimmed);
}

/** Is this Cloudflare's Worker-subrequest address rather than a client? */
export function isCloudflareWorkerIp(value: string | null | undefined): boolean {
	return value?.trim() === CLOUDFLARE_WORKER_CLIENT_IP;
}

/** First usable hop of an `x-forwarded-for` chain, or null. */
function firstForwardedHop(value: string | null): string | null {
	if (!value) return null;
	const first = value.split(",")[0]?.trim();
	return isValidIpAddress(first) && !isCloudflareWorkerIp(first) ? first : null;
}

/**
 * Resolve the client's IP from a request, never returning Cloudflare's own
 * Worker address as if it were a client.
 *
 * Precedence: `cf-connecting-ip` when it is a real client address, then the
 * Worker-forwarded headers, then nothing.
 */
export function resolveClientIP(request: Request): ResolvedClientIp {
	const direct = request.headers.get("cf-connecting-ip");
	if (isValidIpAddress(direct) && !isCloudflareWorkerIp(direct)) {
		return { ip: direct.trim(), source: "direct" };
	}

	// `cf-connecting-ip` is Cloudflare's Worker address or absent, so a Worker
	// made this request and the forwarded headers are our own values.
	const realIp = request.headers.get("x-real-ip");
	if (isValidIpAddress(realIp) && !isCloudflareWorkerIp(realIp)) {
		return { ip: realIp.trim(), source: "forwarded" };
	}

	const forwarded = firstForwardedHop(request.headers.get("x-forwarded-for"));
	if (forwarded) return { ip: forwarded, source: "forwarded" };

	return { ip: null, source: "none" };
}

/**
 * Headers that carry a known client IP through a Worker→Worker subrequest.
 *
 * Both `cf-connecting-ip` and `x-real-ip` are set on purpose: Cloudflare
 * regenerates `cf-connecting-ip` from `x-real-ip` on same-zone subrequests,
 * so setting the first alone is a no-op and setting the second alone leaves
 * a consumer reading only `cf-connecting-ip` with the sentinel.
 */
export function clientIpHeaders(ip: string | null | undefined): Record<string, string> {
	if (!isValidIpAddress(ip)) return {};
	const value = ip.trim();
	return { "cf-connecting-ip": value, "x-real-ip": value, "x-forwarded-for": value };
}

/**
 * Rewrite a request's IP headers so downstream code sees the resolved client
 * address, and never sees Cloudflare's Worker address at all.
 *
 * Returns the original request when nothing needs changing. When it has to
 * rebuild: the body is inherited, but **`request.cf` is not** — read
 * geolocation off the original before calling this.
 */
export function requestWithClientIp(request: Request): Request {
	const { ip } = resolveClientIP(request);
	const current = request.headers.get("cf-connecting-ip");

	if (ip === null) {
		// Only the sentinel to remove — leave a request that simply has no IP
		// headers alone rather than rebuilding it.
		if (!isCloudflareWorkerIp(current)) return request;
	} else if (current === ip) {
		return request;
	}

	const headers = new Headers(request.headers);
	if (ip === null) {
		headers.delete("cf-connecting-ip");
		headers.delete("x-real-ip");
		headers.delete("x-forwarded-for");
	} else {
		for (const [key, value] of Object.entries(clientIpHeaders(ip))) {
			headers.set(key, value);
		}
	}

	return new Request(request, { headers });
}

/**
 * Resolve a client IP and log when there is not one, once, with enough
 * context to find the caller. Silent fallthrough to a shared bucket is the
 * bug this exists to prevent.
 */
export function resolveClientIPorLog(request: Request, scope: string): ResolvedClientIp {
	const resolved = resolveClientIP(request);
	if (!resolved.ip) {
		const path = (() => {
			try {
				return new URL(request.url).pathname;
			} catch {
				return "?";
			}
		})();
		console.warn(
			`[${scope}] No client IP on ${request.method} ${path} — ` +
				`cf-connecting-ip=${
					request.headers.get("cf-connecting-ip") ?? "(absent)"
				}. Per-IP limits and session audit will share one bucket.`,
		);
	}
	return resolved;
}
