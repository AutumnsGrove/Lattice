/**
 * Firefly SDK — Warden Credential Bridge
 *
 * Factory functions that create Firefly providers backed by Warden
 * credential resolution. Isolates the firefly→warden import so
 * non-Warden consumers never pull in the dependency.
 *
 * @example
 * ```typescript
 * import { createWardenClient } from '@autumnsgrove/lattice/warden';
 * import { createWardenProvider } from '@autumnsgrove/lattice/firefly';
 *
 * const warden = createWardenClient(env);
 * const provider = createWardenProvider('hetzner', warden, { labelPrefix: 'queen' });
 * ```
 *
 * @module @autumnsgrove/lattice/firefly
 */

import type { WardenClient } from "../../warden/client.js";
import type { WardenService } from "../../warden/types.js";
import type {
	FireflyProviderName,
	TokenResolver,
	HetznerProviderConfig,
	FlyProviderConfig,
	ProviderConfig,
} from "../types.js";
import type { FireflyProvider } from "../types.js";
import { FireflyError, FLY_ERRORS } from "../errors.js";
import { HetznerProvider } from "./hetzner.js";
import { FlyProvider } from "./fly.js";

/** Options for configuring the Warden token resolver. */
export interface WardenResolverOptions {
	/** Tenant ID for per-tenant credential resolution. */
	tenantId?: string;
}

/** Mapping from Firefly provider names to Warden service identifiers. */
const PROVIDER_TO_SERVICE: Record<string, WardenService> = {
	hetzner: "hetzner",
	fly: "fly",
};

/**
 * Create a `TokenResolver` that resolves credentials through Warden.
 *
 * The resolver calls `warden.resolve()` for the given service and
 * extracts the credential string. Throws `FLY-007` on failure so
 * the base class cache layer can surface it properly.
 */
export function createWardenTokenResolver(
	warden: WardenClient,
	providerName: FireflyProviderName,
	options?: WardenResolverOptions,
): TokenResolver {
	const service = PROVIDER_TO_SERVICE[providerName];
	if (!service) {
		throw new FireflyError(
			FLY_ERRORS.CREDENTIAL_RESOLVE_FAILED,
			`No Warden service mapping for provider: ${providerName}`,
		);
	}

	return async () => {
		const result = await warden.resolve(service, options?.tenantId);
		if (!result) {
			throw new FireflyError(
				FLY_ERRORS.CREDENTIAL_RESOLVE_FAILED,
				`Warden returned no credential for service: ${service}`,
			);
		}
		return result.credential;
	};
}

/**
 * Create a Firefly provider with Warden-backed credential resolution.
 *
 * Overloaded for each provider to preserve type-safe config:
 *
 * ```typescript
 * createWardenProvider('hetzner', warden, { labelPrefix: 'queen' });
 * createWardenProvider('fly', warden, { org: 'grove' });
 * ```
 */
export function createWardenProvider(
	providerName: "hetzner",
	warden: WardenClient,
	config?: Omit<HetznerProviderConfig, "token" | "tokenResolver"> & WardenResolverOptions,
): FireflyProvider;
export function createWardenProvider(
	providerName: "fly",
	warden: WardenClient,
	config: Omit<FlyProviderConfig, "token" | "tokenResolver"> & WardenResolverOptions,
): FireflyProvider;
export function createWardenProvider(
	providerName: FireflyProviderName,
	warden: WardenClient,
	config?: Omit<ProviderConfig, "token" | "tokenResolver"> &
		WardenResolverOptions &
		Record<string, unknown>,
): FireflyProvider;
export function createWardenProvider(
	providerName: FireflyProviderName,
	warden: WardenClient,
	config?: Partial<Omit<HetznerProviderConfig & FlyProviderConfig, "token" | "tokenResolver">> &
		WardenResolverOptions,
): FireflyProvider {
	const { tenantId, ...providerConfig } = config ?? ({} as WardenResolverOptions);
	const tokenResolver = createWardenTokenResolver(warden, providerName, { tenantId });

	switch (providerName) {
		case "hetzner":
			return new HetznerProvider({
				...providerConfig,
				tokenResolver,
			} as HetznerProviderConfig);
		case "fly":
			return new FlyProvider({
				...providerConfig,
				tokenResolver,
			} as FlyProviderConfig);
		default:
			throw new FireflyError(
				FLY_ERRORS.PROVIDER_NOT_IMPLEMENTED,
				`Warden provider factory does not support: ${providerName}`,
			);
	}
}
