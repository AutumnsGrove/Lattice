import { describe, it, expect, vi, beforeEach } from "vitest";
import { groveInit } from "./init.js";
import { AgentLogger } from "./logger.js";

describe("groveInit", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it("does not log during construction (workerd lazy .name constraint)", () => {
		const logger = new AgentLogger("TestAgent", "inst_1");
		const spy = vi.spyOn(console, "debug").mockImplementation(() => {});

		groveInit({ log: logger }, { name: "TestAgent", description: "A test" });

		expect(spy).not.toHaveBeenCalled();
	});

	it("accepts config without description", () => {
		const logger = new AgentLogger("TestAgent", "inst_1");

		expect(() => groveInit({ log: logger }, { name: "TestAgent" })).not.toThrow();
	});
});
