/**
 * Firefly SDK — Fly.io Machines Provider
 *
 * Provisions Fly Machines via the Machines API. Best for fast cold starts
 * and container-based workloads. ~5s cold start vs Hetzner's 30-60s.
 *
 * API: https://api.machines.dev/v1
 * Auth: Bearer token (fly auth token)
 *
 * @module @autumnsgrove/lattice/firefly
 */

import type { ServerConfig, ServerInstance, ServerStatus, FlyProviderConfig } from "../types.js";
import { FireflyProviderBase } from "./base.js";

const FLY_API = "https://api.machines.dev/v1";

/** Fly Machines API response types (subset). */
interface FlyMachineResponse {
	id: string;
	name: string;
	state: "created" | "starting" | "started" | "stopping" | "stopped" | "destroying" | "destroyed";
	region: string;
	instance_id: string;
	private_ip: string;
	config: {
		image: string;
		size?: string;
		guest?: { cpus: number; memory_mb: number };
		metadata?: Record<string, string>;
	};
	created_at: string;
	updated_at: string;
}

export class FlyProvider extends FireflyProviderBase {
	readonly name = "fly" as const;
	private readonly org: string;
	private readonly app: string;

	constructor(config: FlyProviderConfig) {
		super(config);
		this.org = config.org;
		this.app = config.app ?? `${config.org}-firefly`;
	}

	protected async doProvision(id: string, config: ServerConfig): Promise<ServerInstance> {
		const region = config.region || this.defaultRegion || "iad";
		const size = config.size || this.defaultSize || "shared-cpu-1x";

		const body: Record<string, unknown> = {
			name: `firefly-${id.slice(0, 8)}`,
			region,
			config: {
				image: config.image,
				guest: this.sizeToGuest(size),
				env: config.providerOptions?.env ?? {},
				metadata: {
					"firefly-id": id,
					managed: "true",
					...(config.tags?.reduce(
						(acc, tag) => {
							acc[`tag-${tag}`] = "true";
							return acc;
						},
						{} as Record<string, string>,
					) ?? {}),
				},
			},
		};

		const response = await this.request<FlyMachineResponse>(
			FLY_API,
			"POST",
			`/apps/${this.app}/machines`,
			body,
		);

		return {
			id,
			providerServerId: response.id,
			provider: "fly",
			publicIp: `${this.app}.fly.dev`,
			privateIp: response.private_ip,
			status: this.mapStatus(response.state),
			createdAt: Date.now(),
			metadata: {
				name: response.name,
				size,
				region,
				flyState: response.state,
				instanceId: response.instance_id,
			},
		};
	}

	protected async doGetStatus(providerServerId: string): Promise<ServerStatus> {
		const response = await this.request<FlyMachineResponse>(
			FLY_API,
			"GET",
			`/apps/${this.app}/machines/${providerServerId}`,
		);

		return this.mapStatus(response.state);
	}

	protected async doTerminate(providerServerId: string): Promise<void> {
		// Stop first, then destroy
		try {
			await this.request(FLY_API, "POST", `/apps/${this.app}/machines/${providerServerId}/stop`);
		} catch {
			// May already be stopped
		}

		await this.request(FLY_API, "DELETE", `/apps/${this.app}/machines/${providerServerId}`);
	}

	protected async doListActive(tags?: string[]): Promise<ServerInstance[]> {
		const response = await this.request<FlyMachineResponse[]>(
			FLY_API,
			"GET",
			`/apps/${this.app}/machines`,
		);

		return response
			.filter((m) => {
				if (m.state === "destroyed" || m.state === "stopped") return false;

				// Filter by tags via machine metadata (mirrors Hetzner's label_selector)
				if (tags?.length) {
					const metadata = m.config.metadata;
					if (!metadata) return false;
					return tags.every((tag) => metadata[`tag-${tag}`] === "true");
				}

				return true;
			})
			.map((m) => ({
				id: m.config.metadata?.["firefly-id"] ?? crypto.randomUUID(),
				providerServerId: m.id,
				provider: "fly" as const,
				publicIp: `${this.app}.fly.dev`,
				privateIp: m.private_ip,
				status: this.mapStatus(m.state),
				createdAt: new Date(m.created_at).getTime(),
				metadata: {
					name: m.name,
					region: m.region,
					flyState: m.state,
				},
			}));
	}

	/** Map Fly machine state to SDK status. */
	private mapStatus(flyState: FlyMachineResponse["state"]): ServerStatus {
		switch (flyState) {
			case "created":
			case "starting":
				return "provisioning";
			case "started":
				return "running";
			case "stopping":
			case "destroying":
				return "terminating";
			case "stopped":
			case "destroyed":
				return "terminated";
			default:
				return "provisioning";
		}
	}

	/** Convert a size string to Fly guest config. */
	private sizeToGuest(size: string): { cpus: number; memory_mb: number } {
		switch (size) {
			case "shared-cpu-1x":
				return { cpus: 1, memory_mb: 256 };
			case "shared-cpu-2x":
				return { cpus: 2, memory_mb: 512 };
			case "shared-cpu-4x":
				return { cpus: 4, memory_mb: 1024 };
			case "performance-1x":
				return { cpus: 1, memory_mb: 2048 };
			case "performance-2x":
				return { cpus: 2, memory_mb: 4096 };
			default:
				return { cpus: 1, memory_mb: 256 };
		}
	}
}
