/**
 * Firefly SDK — Railway Provider (Stub)
 *
 * Interface position for future Railway integration.
 * Railway offers the simplest deploy model with ~10s cold starts.
 *
 * @module @autumnsgrove/lattice/firefly
 */

import type { ServerConfig, ServerInstance, ServerStatus } from "../types.js";
import { FireflyProviderBase } from "./base.js";
import { FireflyError, FLY_ERRORS } from "../errors.js";

export class RailwayProvider extends FireflyProviderBase {
	readonly name = "railway" as const;

	protected async doProvision(_id: string, _config: ServerConfig): Promise<ServerInstance> {
		throw new FireflyError(FLY_ERRORS.PROVIDER_NOT_IMPLEMENTED, "Railway");
	}

	protected async doGetStatus(_providerServerId: string): Promise<ServerStatus> {
		throw new FireflyError(FLY_ERRORS.PROVIDER_NOT_IMPLEMENTED, "Railway");
	}

	protected async doTerminate(_providerServerId: string): Promise<void> {
		throw new FireflyError(FLY_ERRORS.PROVIDER_NOT_IMPLEMENTED, "Railway");
	}

	protected async doListActive(_tags?: string[]): Promise<ServerInstance[]> {
		throw new FireflyError(FLY_ERRORS.PROVIDER_NOT_IMPLEMENTED, "Railway");
	}
}
