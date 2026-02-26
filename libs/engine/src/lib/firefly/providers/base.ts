/**
 * Firefly SDK — Provider Base Class
 *
 * Abstract base for all cloud providers. Handles UUID generation,
 * status polling loop, and status normalization. Concrete providers
 * implement the `do*` methods for their specific API.
 *
 * @module @autumnsgrove/lattice/firefly
 */

import type {
	FireflyProvider,
	FireflyProviderName,
	ServerConfig,
	ServerInstance,
	ServerStatus,
	ProviderConfig,
} from "../types.js";
import { FireflyError, FLY_ERRORS } from "../errors.js";

export abstract class FireflyProviderBase implements FireflyProvider {
	abstract readonly name: FireflyProviderName;
	protected readonly token: string;
	protected readonly defaultRegion?: string;
	protected readonly defaultSize?: string;

	constructor(config: ProviderConfig) {
		this.token = config.token;
		this.defaultRegion = config.defaultRegion;
		this.defaultSize = config.defaultSize;
	}

	async provision(config: ServerConfig): Promise<ServerInstance> {
		const id = crypto.randomUUID();
		try {
			return await this.doProvision(id, config);
		} catch (err) {
			if (err instanceof FireflyError) throw err;
			throw new FireflyError(
				FLY_ERRORS.IGNITE_FAILED,
				err instanceof Error ? err.message : String(err),
				err,
			);
		}
	}

	async waitForReady(instance: ServerInstance, timeoutMs: number): Promise<boolean> {
		const startTime = Date.now();
		const pollInterval = 5_000;

		while (Date.now() - startTime < timeoutMs) {
			try {
				const status = await this.doGetStatus(instance.providerServerId);
				if (status === "running" || status === "ready") {
					return true;
				}
			} catch {
				// Ignore transient errors during polling
			}
			await new Promise((resolve) => setTimeout(resolve, pollInterval));
		}

		return false;
	}

	async terminate(instance: ServerInstance): Promise<void> {
		try {
			await this.doTerminate(instance.providerServerId);
		} catch (err) {
			if (err instanceof FireflyError) throw err;
			throw new FireflyError(
				FLY_ERRORS.FADE_FAILED,
				err instanceof Error ? err.message : String(err),
				err,
			);
		}
	}

	async listActive(tags?: string[]): Promise<ServerInstance[]> {
		try {
			return await this.doListActive(tags);
		} catch (err) {
			if (err instanceof FireflyError) throw err;
			throw new FireflyError(
				FLY_ERRORS.PROVIDER_API_ERROR,
				err instanceof Error ? err.message : String(err),
				err,
			);
		}
	}

	// ─── Abstract methods for concrete providers ─────────────────

	/** Create a server via the provider API. Return a ServerInstance with the SDK-assigned id. */
	protected abstract doProvision(id: string, config: ServerConfig): Promise<ServerInstance>;

	/** Get the current status of a server by its provider-native ID. */
	protected abstract doGetStatus(providerServerId: string): Promise<ServerStatus>;

	/** Terminate a server by its provider-native ID. */
	protected abstract doTerminate(providerServerId: string): Promise<void>;

	/** List all active servers, optionally filtered by tags. */
	protected abstract doListActive(tags?: string[]): Promise<ServerInstance[]>;

	// ─── Utility ─────────────────────────────────────────────────

	/** Make an authenticated HTTP request to a provider API. */
	protected async request<T>(
		baseUrl: string,
		method: string,
		endpoint: string,
		body?: unknown,
	): Promise<T> {
		const url = `${baseUrl}${endpoint}`;

		const response = await fetch(url, {
			method,
			headers: {
				Authorization: `Bearer ${this.token}`,
				"Content-Type": "application/json",
			},
			body: body ? JSON.stringify(body) : undefined,
		});

		if (!response.ok) {
			const error = (await response.json().catch(() => ({}))) as Record<string, unknown>;
			const message = (error.error as Record<string, unknown>)?.message || response.statusText;
			throw new FireflyError(
				response.status === 401 || response.status === 403
					? FLY_ERRORS.PROVIDER_AUTH_FAILED
					: FLY_ERRORS.PROVIDER_API_ERROR,
				`${response.status} ${message}`,
			);
		}

		// Handle 204 No Content
		if (response.status === 204) {
			return {} as T;
		}

		return response.json() as Promise<T>;
	}
}
