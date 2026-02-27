import { describe, it, expect, vi, beforeEach } from "vitest";
import { groveInit } from "./init.js";
import { AgentLogger } from "./logger.js";

describe("groveInit", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it("logs agent initialization with config details", () => {
		const logger = new AgentLogger("TestAgent", "inst_1");
		const spy = vi.spyOn(console, "debug").mockImplementation(() => {});

		groveInit({ log: logger }, { name: "TestAgent", description: "A test" });

		expect(spy).toHaveBeenCalledOnce();
		const entry = JSON.parse(spy.mock.calls[0][0] as string);
		expect(entry.message).toBe("Grove agent initializing");
		expect(entry.name).toBe("TestAgent");
		expect(entry.description).toBe("A test");
	});

	it("handles missing description gracefully", () => {
		const logger = new AgentLogger("TestAgent", "inst_1");
		const spy = vi.spyOn(console, "debug").mockImplementation(() => {});

		groveInit({ log: logger }, { name: "TestAgent" });

		expect(spy).toHaveBeenCalledOnce();
		const entry = JSON.parse(spy.mock.calls[0][0] as string);
		expect(entry.name).toBe("TestAgent");
		expect(entry.description).toBeUndefined();
	});
});
