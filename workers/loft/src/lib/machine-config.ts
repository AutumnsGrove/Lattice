/**
 * Fly Machine Configuration Builder
 *
 * Builds the IgniteOptions for a Loft dev environment,
 * including Fly-specific services (port mappings), env vars,
 * and restart/auto-destroy policies.
 */

import { LOFT_DEFAULTS } from "@autumnsgrove/lattice/firefly";
import type { IgniteOptions } from "@autumnsgrove/lattice/firefly";

interface MachineConfigInput {
	sshPublicKey: string;
	codeServerPassword: string;
	fireflyAgentSecret: string;
}

export function buildMachineConfig(input: MachineConfigInput): IgniteOptions {
	return {
		size: LOFT_DEFAULTS.defaultSize,
		region: LOFT_DEFAULTS.defaultRegion,
		image: `registry.fly.io/grove-loft:v1`,
		tags: LOFT_DEFAULTS.tags,
		providerOptions: {
			// Environment variables injected into the container
			env: {
				SSH_AUTHORIZED_KEY: input.sshPublicKey,
				CODE_SERVER_PASSWORD: input.codeServerPassword,
				FIREFLY_AGENT_SECRET: input.fireflyAgentSecret,
			},
			// Fly Machine services — port mappings for external access
			services: [
				{
					ports: [
						{ port: 443, handlers: ["tls", "http"], force_https: true },
						{ port: 80, handlers: ["http"], force_https: true },
					],
					protocol: "tcp",
					internal_port: 8080,
				},
				{
					ports: [{ port: 22 }],
					protocol: "tcp",
					internal_port: 22,
				},
				{
					ports: [{ port: 9090 }],
					protocol: "tcp",
					internal_port: 9090,
				},
			],
			// Auto-destroy after stop to prevent orphaned machines
			auto_destroy: true,
			// Restart on failure but not on exit
			restart: { policy: "on-failure", max_retries: 3 },
		},
	};
}
