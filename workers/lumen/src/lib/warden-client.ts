/**
 * Warden Client — Credential Resolution via Service Binding
 *
 * Typed client for calling Warden's `/resolve` endpoint over the internal
 * service binding. Credentials travel over Cloudflare's in-colo function call,
 * never over the public internet.
 *
 * Fail-closed: returns null on any error (network, auth, parse).
 */

import { z } from "zod";

/** Zod schema for validating Warden's /resolve response at the trust boundary */
const WardenResolveResponseSchema = z.object({
	success: z.literal(true),
	data: z.object({
		credential: z.string(),
		source: z.enum(["tenant", "global"]),
	}),
});

export interface ResolvedWardenCredential {
	credential: string;
	source: "tenant" | "global";
}

/**
 * Resolve a credential from Warden via service binding.
 *
 * @param warden - The WARDEN service binding (fetch interface)
 * @param apiKey - Lumen's registered API key for Warden auth
 * @param service - Which service's credential to resolve (e.g., "openrouter")
 * @param tenantId - Optional tenant ID for per-tenant credential resolution
 * @returns Resolved credential or null on any failure
 */
export async function resolveWardenCredential(
	warden: { fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> },
	apiKey: string,
	service: string,
	tenantId?: string,
): Promise<ResolvedWardenCredential | null> {
	try {
		const body: Record<string, string> = { service };
		if (tenantId) body.tenant_id = tenantId;

		const response = await warden.fetch("https://warden/resolve", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-API-Key": apiKey,
			},
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			console.error(`[Lumen/Warden] Resolve failed: ${response.status} ${response.statusText}`);
			return null;
		}

		const json = await response.json();
		const parsed = WardenResolveResponseSchema.safeParse(json);

		if (!parsed.success) {
			console.error("[Lumen/Warden] Invalid response shape:", parsed.error.issues);
			return null;
		}

		return parsed.data.data;
	} catch (err) {
		console.error("[Lumen/Warden] Resolve error:", err);
		return null;
	}
}
