/**
 * Firefly SDK — DigitalOcean Provider (Stub)
 *
 * Interface position for future DigitalOcean integration.
 * DO offers good US/EU coverage with a familiar API.
 *
 * @module @autumnsgrove/lattice/firefly
 */

import type { ServerConfig, ServerInstance, ServerStatus } from "../types.js";
import { FireflyProviderBase } from "./base.js";
import { FireflyError, FLY_ERRORS } from "../errors.js";

export class DigitalOceanProvider extends FireflyProviderBase {
	readonly name = "digitalocean" as const;

	protected async doProvision(_id: string, _config: ServerConfig): Promise<ServerInstance> {
		throw new FireflyError(FLY_ERRORS.PROVIDER_NOT_IMPLEMENTED, "DigitalOcean");
	}

	protected async doGetStatus(_providerServerId: string): Promise<ServerStatus> {
		throw new FireflyError(FLY_ERRORS.PROVIDER_NOT_IMPLEMENTED, "DigitalOcean");
	}

	protected async doTerminate(_providerServerId: string): Promise<void> {
		throw new FireflyError(FLY_ERRORS.PROVIDER_NOT_IMPLEMENTED, "DigitalOcean");
	}

	protected async doListActive(_tags?: string[]): Promise<ServerInstance[]> {
		throw new FireflyError(FLY_ERRORS.PROVIDER_NOT_IMPLEMENTED, "DigitalOcean");
	}
}
