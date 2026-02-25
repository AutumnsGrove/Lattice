/**
 * Cloudflare Workers env adapter for GroveConfig.
 *
 * Normalizes access to environment variables and secrets
 * from the Workers `env` binding object.
 */

import { logGroveError } from "@autumnsgrove/lattice/errors";
import { SRV_ERRORS } from "../errors.js";
import type { GroveConfig, ConfigInfo } from "../types.js";

export class CloudflareConfig implements GroveConfig {
	constructor(private readonly env: Record<string, unknown>) {}

	require(key: string): string {
		if (!key || typeof key !== "string" || key.trim().length === 0) {
			logGroveError("InfraSDK", SRV_ERRORS.CONFIG_MISSING, {
				detail: "require: key is empty or invalid",
			});
			throw new Error("Config key cannot be empty");
		}
		const value = this.env[key];
		if (value === undefined || value === null) {
			logGroveError("InfraSDK", SRV_ERRORS.CONFIG_MISSING, {
				detail: `Key: ${key}`,
			});
			throw new Error(SRV_ERRORS.CONFIG_MISSING.adminMessage);
		}
		return String(value);
	}

	get(key: string): string | undefined {
		const value = this.env[key];
		if (value === undefined || value === null) return undefined;
		return String(value);
	}

	getOrDefault(key: string, defaultValue: string): string {
		return this.get(key) ?? defaultValue;
	}

	has(key: string): boolean {
		return this.env[key] !== undefined && this.env[key] !== null;
	}

	info(): ConfigInfo {
		return { provider: "cloudflare-env" };
	}
}
