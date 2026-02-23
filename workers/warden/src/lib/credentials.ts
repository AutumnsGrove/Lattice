/**
 * Credential Resolution
 *
 * Resolves API credentials for upstream services.
 * Priority: per-tenant (SecretsManager) → global (env secrets)
 *
 * Per-tenant credentials use envelope encryption via SecretsManager,
 * allowing tenants to bring their own API keys.
 */

import type { Env, WardenService } from "../types";

/** Mapping of services to their environment variable names */
const GLOBAL_CREDENTIAL_MAP: Record<WardenService, keyof Env> = {
	github: "GITHUB_TOKEN",
	tavily: "TAVILY_API_KEY",
	cloudflare: "CLOUDFLARE_API_TOKEN",
	exa: "EXA_API_KEY",
	resend: "RESEND_API_KEY",
	stripe: "STRIPE_SECRET_KEY",
	openrouter: "OPENROUTER_API_KEY",
};

/**
 * Mapping of services to their SecretsManager key names.
 * Each service maps to an array of aliases checked in order (canonical first).
 *
 * This bridges naming conventions: Timeline stores keys as `timeline_openrouter_key`
 * while Warden's canonical name is `openrouter_api_key`. The alias chain lets
 * Warden find keys saved under either name without requiring a migration.
 */
const TENANT_CREDENTIAL_ALIASES: Record<WardenService, string[]> = {
	github: ["github_token", "timeline_github_token"],
	tavily: ["tavily_api_key"],
	cloudflare: ["cloudflare_api_token"],
	exa: ["exa_api_key"],
	resend: ["resend_api_key"],
	stripe: ["stripe_secret_key"],
	openrouter: ["openrouter_api_key", "timeline_openrouter_key"],
};

export interface ResolvedCredential {
	value: string;
	source: "tenant" | "global";
}

/**
 * Resolve a credential for a service, checking tenant-specific first.
 *
 * Falls through: tenant → global
 */
export async function resolveCredential(
	env: Env,
	service: WardenService,
	tenantId?: string | null,
): Promise<ResolvedCredential | null> {
	// Try tenant-specific credential first
	if (tenantId) {
		const tenantCred = await resolveTenantCredential(env, service, tenantId);
		if (tenantCred) return tenantCred;
	}

	// Fall back to global credential
	const globalKey = GLOBAL_CREDENTIAL_MAP[service];
	const globalValue = env[globalKey] as string | undefined;
	if (globalValue) {
		return { value: globalValue, source: "global" };
	}

	return null;
}

/** Resolve a per-tenant credential via SecretsManager, trying aliases in order */
async function resolveTenantCredential(
	env: Env,
	service: WardenService,
	tenantId: string,
): Promise<ResolvedCredential | null> {
	const aliases = TENANT_CREDENTIAL_ALIASES[service];
	if (!aliases?.length || !env.GROVE_KEK || !env.TENANT_DB) return null;

	try {
		// Lazy import SecretsManager to avoid pulling engine deps into cold start
		// when tenant credentials aren't needed
		const { SecretsManager } = await import(
			"@autumnsgrove/lattice/server/secrets-manager" as string
		);
		const sm = new SecretsManager(env.TENANT_DB, env.GROVE_KEK);

		// Try each alias in order (canonical first, then legacy names)
		for (const keyName of aliases) {
			const value = await sm.safeGetSecret(tenantId, keyName);
			if (value) {
				return { value, source: "tenant" };
			}
		}
	} catch (err) {
		console.error(`[Warden] Tenant credential resolution failed for ${service}:`, err);
	}

	return null;
}
