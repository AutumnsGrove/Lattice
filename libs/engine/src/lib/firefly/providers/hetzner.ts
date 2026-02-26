/**
 * Firefly SDK — Hetzner Cloud Provider
 *
 * Ported from GroveMC's Hetzner integration. Provisions VPS instances
 * via the Hetzner Cloud API v1. Best for cost-efficient, full-VM workloads
 * in EU and US-East regions.
 *
 * Cold start: 30-60s | Regions: fsn1, nbg1, hel1, ash, hil
 * Cost: ~$0.008/hr (cx22), ~$0.016/hr (cx32)
 *
 * @module @autumnsgrove/lattice/firefly
 */

import type {
	ServerConfig,
	ServerInstance,
	ServerStatus,
	HetznerProviderConfig,
} from "../types.js";
import { FireflyProviderBase } from "./base.js";

const HETZNER_API = "https://api.hetzner.cloud/v1";

/** Hetzner API response types (subset). */
interface HetznerServerResponse {
	id: number;
	name: string;
	status:
		| "initializing"
		| "starting"
		| "running"
		| "stopping"
		| "off"
		| "deleting"
		| "rebuilding"
		| "migrating"
		| "unknown";
	public_net: {
		ipv4: { ip: string };
		ipv6: { ip: string };
	};
	server_type: { name: string };
	datacenter: {
		name: string;
		location: { name: string; city: string; country: string };
	};
	labels: Record<string, string>;
	created: string;
}

export class HetznerProvider extends FireflyProviderBase {
	readonly name = "hetzner" as const;
	private readonly sshKeyIds: string[];
	private readonly labelPrefix: string;

	constructor(config: HetznerProviderConfig) {
		super(config);
		this.sshKeyIds = config.sshKeyIds ?? [];
		this.labelPrefix = config.labelPrefix ?? "grove-firefly";
	}

	protected async doProvision(id: string, config: ServerConfig): Promise<ServerInstance> {
		const region = config.region || this.defaultRegion || "fsn1";
		const size = config.size || this.defaultSize || "cx22";
		const serverName = `${this.labelPrefix}-${region}-${Date.now()}`;

		const labels: Record<string, string> = {
			project: this.labelPrefix,
			"firefly-id": id,
			managed: "true",
		};
		if (config.tags) {
			for (const tag of config.tags) {
				labels[`tag-${tag}`] = "true";
			}
		}

		const body: Record<string, unknown> = {
			name: serverName,
			server_type: size,
			location: region,
			image: config.image || "ubuntu-24.04",
			labels,
			start_after_create: true,
		};

		if (config.sshKeys?.length || this.sshKeyIds.length) {
			body.ssh_keys = config.sshKeys ?? this.sshKeyIds;
		}

		if (config.userData) {
			body.user_data = config.userData;
		}

		const response = await this.request<{
			server: HetznerServerResponse;
			root_password: string | null;
		}>(HETZNER_API, "POST", "/servers", body);

		return {
			id,
			providerServerId: String(response.server.id),
			provider: "hetzner",
			publicIp: response.server.public_net.ipv4.ip,
			status: this.mapStatus(response.server.status),
			createdAt: Date.now(),
			metadata: {
				name: serverName,
				size,
				region,
				hetznerStatus: response.server.status,
			},
		};
	}

	protected async doGetStatus(providerServerId: string): Promise<ServerStatus> {
		const response = await this.request<{
			server: HetznerServerResponse;
		}>(HETZNER_API, "GET", `/servers/${providerServerId}`);

		return this.mapStatus(response.server.status);
	}

	protected async doTerminate(providerServerId: string): Promise<void> {
		await this.request(HETZNER_API, "DELETE", `/servers/${providerServerId}`);
	}

	protected async doListActive(tags?: string[]): Promise<ServerInstance[]> {
		let endpoint = `/servers?label_selector=project=${this.labelPrefix}`;
		if (tags?.length) {
			for (const tag of tags) {
				endpoint += `,tag-${tag}=true`;
			}
		}

		const response = await this.request<{
			servers: HetznerServerResponse[];
		}>(HETZNER_API, "GET", endpoint);

		return response.servers
			.filter((s) => s.status !== "deleting" && s.status !== "off")
			.map((s) => ({
				id: s.labels["firefly-id"] || crypto.randomUUID(),
				providerServerId: String(s.id),
				provider: "hetzner" as const,
				publicIp: s.public_net.ipv4.ip,
				status: this.mapStatus(s.status),
				createdAt: new Date(s.created).getTime(),
				metadata: {
					name: s.name,
					size: s.server_type.name,
					region: s.datacenter.location.name,
					labels: s.labels,
				},
			}));
	}

	/** Map Hetzner status to SDK status. */
	private mapStatus(hetznerStatus: HetznerServerResponse["status"]): ServerStatus {
		switch (hetznerStatus) {
			case "initializing":
			case "starting":
			case "rebuilding":
				return "provisioning";
			case "running":
				return "running";
			case "stopping":
			case "migrating":
				return "terminating";
			case "off":
			case "deleting":
				return "terminated";
			default:
				return "provisioning";
		}
	}
}
