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

/** Mapping of services to their SecretsManager key names */
const TENANT_CREDENTIAL_MAP: Record<WardenService, string> = {
	github: "github_token",
	tavily: "tavily_api_key",
	cloudflare: "cloudflare_api_token",
	exa: "exa_api_key",
	resend: "resend_api_key",
	stripe: "stripe_secret_key",
	openrouter: "openrouter_api_key",
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

/** Resolve a per-tenant credential via SecretsManager */
async function resolveTenantCredential(
	env: Env,
	service: WardenService,
	tenantId: string,
): Promise<ResolvedCredential | null> {
	try {
		const keyName = TENANT_CREDENTIAL_MAP[service];
		if (!keyName || !env.GROVE_KEK || !env.TENANT_DB) return null;

		// Lazy import SecretsManager to avoid pulling engine deps into cold start
		// when tenant credentials aren't needed
		const { SecretsManager } = await import(
			"@autumnsgrove/lattice/server/secrets-manager" as string
		);
		const sm = new SecretsManager(env.TENANT_DB, env.GROVE_KEK);
		const value = await sm.safeGetSecret(tenantId, keyName);

		if (value) {
			return { value, source: "tenant" };
		}
	} catch (err) {
		console.error(`[Warden] Tenant credential resolution failed for ${service}:`, err);
	}

	return null;
}
