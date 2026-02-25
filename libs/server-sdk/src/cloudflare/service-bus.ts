/**
 * Cloudflare Service Bindings adapter for GroveServiceBus.
 *
 * Wraps Cloudflare's zero-latency service bindings as generic
 * RPC calls. Falls back gracefully if a binding is missing.
 */

import { logGroveError } from "@autumnsgrove/lattice/errors";
import { SRV_ERRORS } from "../errors.js";
import type {
	GroveServiceBus,
	ServiceRequest,
	ServiceResponse,
	ServiceBusInfo,
	GroveObserver,
} from "../types.js";

const VALID_HTTP_METHODS = new Set(["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]);

export class CloudflareServiceBus implements GroveServiceBus {
	constructor(
		private readonly bindings: Record<string, Fetcher>,
		private readonly observer?: GroveObserver,
	) {}

	async call<T = unknown>(service: string, request: ServiceRequest): Promise<ServiceResponse<T>> {
		// Input validation: service name and request.path must be non-empty strings
		if (!service || typeof service !== "string" || service.trim().length === 0) {
			logGroveError("ServerSDK", SRV_ERRORS.SERVICE_NOT_FOUND, {
				detail: "call: service name is empty or invalid",
			});
			throw new Error("Service name cannot be empty");
		}
		if (!request.path || typeof request.path !== "string" || request.path.trim().length === 0) {
			logGroveError("ServerSDK", SRV_ERRORS.SERVICE_CALL_FAILED, {
				detail: "call: request path is empty or invalid",
			});
			throw new Error("Request path cannot be empty");
		}
		// Validate request.method is a valid HTTP method
		if (
			!request.method ||
			typeof request.method !== "string" ||
			!VALID_HTTP_METHODS.has(request.method.toUpperCase())
		) {
			logGroveError("ServerSDK", SRV_ERRORS.SERVICE_CALL_FAILED, {
				detail: `call: invalid HTTP method: ${request.method}`,
			});
			throw new Error("Invalid HTTP method");
		}

		const binding = this.bindings[service];
		if (!binding) {
			logGroveError("ServerSDK", SRV_ERRORS.SERVICE_NOT_FOUND, {
				detail: `Service: ${service}`,
			});
			throw new Error(SRV_ERRORS.SERVICE_NOT_FOUND.adminMessage);
		}

		const start = performance.now();
		try {
			const url = `https://${service}${request.path}`;
			const init: RequestInit = {
				method: request.method,
				headers: request.headers,
			};

			if (request.body !== undefined) {
				init.body = JSON.stringify(request.body);
				init.headers = {
					"Content-Type": "application/json",
					...init.headers,
				};
			}

			const response = await binding.fetch(url, init);

			let data: T;
			const contentType = response.headers.get("content-type") ?? "";
			if (contentType.includes("application/json")) {
				data = (await response.json()) as T;
			} else {
				const text = await response.text();
				if (!response.ok) {
					logGroveError("ServerSDK", SRV_ERRORS.SERVICE_CALL_FAILED, {
						detail: `${request.method} ${service}${request.path} returned ${response.status}: ${text.slice(0, 200)}`,
					});
					throw new Error(SRV_ERRORS.SERVICE_CALL_FAILED.adminMessage);
				}
				// Try parsing as JSON even without Content-Type header
				try {
					data = JSON.parse(text) as T;
				} catch {
					logGroveError("ServerSDK", SRV_ERRORS.SERVICE_CALL_FAILED, {
						detail: `${request.method} ${service}${request.path} returned non-JSON body (${response.status})`,
					});
					throw new Error(SRV_ERRORS.SERVICE_CALL_FAILED.adminMessage);
				}
			}

			const durationMs = performance.now() - start;
			this.observer?.({
				service: "services",
				operation: "call",
				durationMs,
				ok: true,
				detail: `${request.method} ${service}${request.path}`,
			});

			return {
				status: response.status,
				headers: Object.fromEntries(response.headers),
				data,
			};
		} catch (error) {
			const durationMs = performance.now() - start;
			this.observer?.({
				service: "services",
				operation: "call",
				durationMs,
				ok: false,
				detail: `${request.method} ${service}${request.path}`,
				error: error instanceof Error ? error.message : String(error),
			});
			logGroveError("ServerSDK", SRV_ERRORS.SERVICE_CALL_FAILED, {
				detail: `${request.method} ${service}${request.path}`,
				cause: error,
			});
			throw error;
		}
	}

	async ping(service: string): Promise<boolean> {
		const binding = this.bindings[service];
		if (!binding) return false;

		const start = performance.now();
		try {
			// Attempt a real HEAD request to verify the service is reachable.
			// Cloudflare service bindings are zero-latency so this is cheap.
			const response = await binding.fetch(`https://${service}/`, { method: "HEAD" });
			const durationMs = performance.now() - start;
			const ok = response.status < 500;
			this.observer?.({
				service: "services",
				operation: "ping",
				durationMs,
				ok,
				detail: service,
			});
			// Any response (even 404) means the binding is alive.
			return ok;
		} catch {
			const durationMs = performance.now() - start;
			this.observer?.({
				service: "services",
				operation: "ping",
				durationMs,
				ok: false,
				detail: service,
			});
			return false;
		}
	}

	services(): string[] {
		return Object.keys(this.bindings);
	}

	info(): ServiceBusInfo {
		return {
			provider: "cloudflare-bindings",
			services: this.services(),
		};
	}
}
