/**
 * Firefly SDK — SSH Executor (Stub)
 *
 * Workers runtime limitation: The `net`, `tls`, and `stream` modules
 * required by SSH clients (like `ssh2`) are not available in Cloudflare
 * Workers. The `cloudflare:sockets` API provides raw TCP but no SSH
 * client implementation exists for it.
 *
 * This stub holds the interface position for consumers that may run
 * outside Workers (e.g., in a Node.js environment) or when a
 * Workers-compatible SSH client becomes available.
 *
 * **Recommended alternative:** Use WebhookExecutor with an HTTP agent
 * running on the VPS. This is the pattern Outpost uses — the server
 * runs a lightweight HTTP server that accepts command execution
 * requests over authenticated HTTP.
 *
 * @module @autumnsgrove/lattice/firefly
 */

import type { RemoteExecutor, ServerInstance, ExecutionResult } from "../types.js";
import { FireflyError, FLY_ERRORS } from "../errors.js";

export class SSHExecutor implements RemoteExecutor {
	constructor() {
		// Stub — no initialization needed
	}

	async execute(_instance: ServerInstance, _command: string): Promise<ExecutionResult> {
		throw new FireflyError(
			FLY_ERRORS.EXECUTOR_NOT_AVAILABLE,
			"SSH is not available in the Workers runtime. Use WebhookExecutor instead.",
		);
	}

	async isReachable(_instance: ServerInstance): Promise<boolean> {
		return false;
	}
}
