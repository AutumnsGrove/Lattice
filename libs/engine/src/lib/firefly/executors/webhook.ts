/**
 * Firefly SDK — Webhook Executor
 *
 * HTTP callback pattern for executing commands on provisioned servers.
 * The server runs an agent that accepts HTTP commands (the Outpost pattern).
 * Worker-native alternative to SSH — no net/tls modules required.
 *
 * **Security note:** By default, commands are sent over plain HTTP with
 * `X-Firefly-Secret` in the header. This is acceptable on private networks
 * (e.g., Hetzner private networking, Fly internal IPs) but should use HTTPS
 * when the agent is reachable over the public internet. Configure the agent
 * with TLS or use a VPN/tunnel for production workloads.
 *
 * @module @autumnsgrove/lattice/firefly
 */

import type { RemoteExecutor, ServerInstance, ExecutionResult } from "../types.js";
import { FireflyError, FLY_ERRORS } from "../errors.js";

export interface WebhookExecutorConfig {
	/** Protocol to use. Default: "https". Use "http" only for private-network agents. */
	protocol?: "http" | "https";
	/** Port the agent listens on. Default: 8080 */
	port?: number;
	/** Path prefix for the agent endpoint. Default: /firefly */
	pathPrefix?: string;
	/** Shared secret for authenticating requests. */
	secret?: string;
	/** Request timeout in ms. Default: 30_000 */
	timeoutMs?: number;
}

export class WebhookExecutor implements RemoteExecutor {
	private readonly protocol: "http" | "https";
	private readonly port: number;
	private readonly pathPrefix: string;
	private readonly secret?: string;
	private readonly timeoutMs: number;

	constructor(config: WebhookExecutorConfig = {}) {
		this.protocol = config.protocol ?? "https";
		this.port = config.port ?? 8080;
		this.pathPrefix = config.pathPrefix ?? "/firefly";
		this.secret = config.secret;
		this.timeoutMs = config.timeoutMs ?? 30_000;
	}

	async execute(instance: ServerInstance, command: string): Promise<ExecutionResult> {
		const url = `${this.protocol}://${instance.publicIp}:${this.port}${this.pathPrefix}/exec`;

		const headers: Record<string, string> = {
			"Content-Type": "application/json",
		};
		if (this.secret) {
			headers["X-Firefly-Secret"] = this.secret;
		}

		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

		try {
			const response = await fetch(url, {
				method: "POST",
				headers,
				body: JSON.stringify({ command }),
				signal: controller.signal,
			});

			if (!response.ok) {
				throw new FireflyError(
					FLY_ERRORS.EXECUTOR_COMMAND_FAILED,
					`Agent returned ${response.status}`,
				);
			}

			const result = (await response.json()) as {
				exitCode?: number;
				stdout?: string;
				stderr?: string;
			};

			return {
				exitCode: result.exitCode ?? -1,
				stdout: result.stdout ?? "",
				stderr: result.stderr ?? "",
			};
		} catch (err) {
			if (err instanceof FireflyError) throw err;
			throw new FireflyError(
				FLY_ERRORS.EXECUTOR_NOT_AVAILABLE,
				err instanceof Error ? err.message : String(err),
				err,
			);
		} finally {
			clearTimeout(timeout);
		}
	}

	async isReachable(instance: ServerInstance): Promise<boolean> {
		const url = `${this.protocol}://${instance.publicIp}:${this.port}${this.pathPrefix}/health`;
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 5_000);

		try {
			const response = await fetch(url, { signal: controller.signal });
			return response.ok;
		} catch {
			return false;
		} finally {
			clearTimeout(timeout);
		}
	}
}
