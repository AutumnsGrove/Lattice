/**
 * Cloudflare Service Bindings adapter for GroveServiceBus.
 *
 * Wraps Cloudflare's zero-latency service bindings as generic
 * RPC calls. Falls back gracefully if a binding is missing.
 */

import { logGroveError } from "@autumnsgrove/lattice/errors";
import { SRV_ERRORS } from "../errors.js";
import type { GroveServiceBus, ServiceRequest, ServiceResponse, ServiceBusInfo } from "../types.js";

const VALID_HTTP_METHODS = new Set(["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]);

export class CloudflareServiceBus implements GroveServiceBus {
	constructor(private readonly bindings: Record<string, Fetcher>) {}

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
				detail: service,
			});
			throw new Error(`${SRV_ERRORS.SERVICE_NOT_FOUND.adminMessage} Service: ${service}`);
		}

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

			const data = (await response.json()) as T;

			return {
				status: response.status,
				headers: Object.fromEntries(response.headers),
				data,
			};
		} catch (error) {
			logGroveError("ServerSDK", SRV_ERRORS.SERVICE_CALL_FAILED, {
				detail: `${request.method} ${service}${request.path}`,
				cause: error,
			});
			throw error;
		}
	}

	async ping(service: string): Promise<boolean> {
		return service in this.bindings;
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
