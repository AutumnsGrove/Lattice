import { describe, it, expect, beforeEach, vi } from "vitest";
import { buildMachineConfig } from "./machine-config";

vi.mock("@autumnsgrove/lattice/firefly", () => ({
	LOFT_DEFAULTS: {
		defaultSize: "shared-cpu-1x",
		defaultRegion: "iad",
		tags: ["loft"],
		idle: 30 * 60_000,
		maxLifetime: 8 * 60 * 60_000,
		name: "loft",
	},
}));

describe("buildMachineConfig", () => {
	const testInput = {
		sshPublicKey: "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC7...",
		codeServerPassword: "secure-password-123",
		fireflyAgentSecret: "agent-secret-xyz",
	};

	it("returns correct image", () => {
		const config = buildMachineConfig(testInput) as any;
		expect(config.image).toBe("registry.fly.io/grove-loft:v1");
	});

	it("uses LOFT_DEFAULTS.defaultSize for size", () => {
		const config = buildMachineConfig(testInput) as any;
		expect(config.size).toBe("shared-cpu-1x");
	});

	it("uses LOFT_DEFAULTS.defaultRegion for region", () => {
		const config = buildMachineConfig(testInput) as any;
		expect(config.region).toBe("iad");
	});

	it("uses LOFT_DEFAULTS.tags", () => {
		const config = buildMachineConfig(testInput) as any;
		expect(config.tags).toEqual(["loft"]);
	});

	it("includes SSH key in providerOptions.env.SSH_AUTHORIZED_KEY", () => {
		const config = buildMachineConfig(testInput) as any;
		expect(config.providerOptions!.env.SSH_AUTHORIZED_KEY).toBe(testInput.sshPublicKey);
	});

	it("includes code-server password in providerOptions.env.CODE_SERVER_PASSWORD", () => {
		const config = buildMachineConfig(testInput) as any;
		expect(config.providerOptions!.env.CODE_SERVER_PASSWORD).toBe(testInput.codeServerPassword);
	});

	it("includes firefly agent secret in providerOptions.env.FIREFLY_AGENT_SECRET", () => {
		const config = buildMachineConfig(testInput) as any;
		expect(config.providerOptions!.env.FIREFLY_AGENT_SECRET).toBe(testInput.fireflyAgentSecret);
	});

	it("has 3 service port mappings", () => {
		const config = buildMachineConfig(testInput) as any;
		expect(config.providerOptions!.services).toHaveLength(3);
	});

	it("HTTP service maps 443/80 to internal 8080", () => {
		const config = buildMachineConfig(testInput) as any;
		const httpService = config.providerOptions!.services?.[0];

		expect(httpService?.internal_port).toBe(8080);
		expect(httpService?.protocol).toBe("tcp");
		expect(httpService?.ports).toHaveLength(2);

		const ports443 = httpService?.ports?.find((p: any) => p.port === 443);
		const ports80 = httpService?.ports?.find((p: any) => p.port === 80);

		expect(ports443?.port).toBe(443);
		expect(ports80?.port).toBe(80);
	});

	it("SSH service maps port 22 to internal 22", () => {
		const config = buildMachineConfig(testInput) as any;
		const sshService = config.providerOptions!.services?.[1];

		expect(sshService?.internal_port).toBe(22);
		expect(sshService?.protocol).toBe("tcp");
		expect(sshService?.ports).toHaveLength(1);
		expect(sshService?.ports?.[0]?.port).toBe(22);
	});

	it("auto-destroy is true", () => {
		const config = buildMachineConfig(testInput) as any;
		expect(config.providerOptions!.auto_destroy).toBe(true);
	});

	it("restart policy is on-failure with max 3 retries", () => {
		const config = buildMachineConfig(testInput) as any;
		const restart = config.providerOptions!.restart;

		expect(restart?.policy).toBe("on-failure");
		expect(restart?.max_retries).toBe(3);
	});
});
