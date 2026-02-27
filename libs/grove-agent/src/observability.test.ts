import { describe, it, expect, vi, beforeEach } from "vitest";
import { emitObservabilityEvent } from "./observability.js";
import { AgentLogger } from "./logger.js";

describe("emitObservabilityEvent", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it("logs event with type prefix and message", () => {
		const logger = new AgentLogger("TestAgent", "inst_1");
		const spy = vi.spyOn(console, "log").mockImplementation(() => {});

		emitObservabilityEvent(logger, {
			type: "email.sent",
			message: "Day 7 email sent",
		});

		expect(spy).toHaveBeenCalledOnce();
		const entry = JSON.parse(spy.mock.calls[0][0] as string);
		expect(entry.message).toBe("[observe] email.sent");
		expect(entry.level).toBe("info");
	});

	it("includes event data in log entry", () => {
		const logger = new AgentLogger("TestAgent", "inst_1");
		const spy = vi.spyOn(console, "log").mockImplementation(() => {});

		emitObservabilityEvent(logger, {
			type: "onboarding.started",
			message: "Sequence started",
			data: { userId: "u_123", audience: "wanderer" },
		});

		const entry = JSON.parse(spy.mock.calls[0][0] as string);
		expect(entry.userId).toBe("u_123");
		expect(entry.audience).toBe("wanderer");
	});

	it("works without optional data", () => {
		const logger = new AgentLogger("TestAgent", "inst_1");
		const spy = vi.spyOn(console, "log").mockImplementation(() => {});

		emitObservabilityEvent(logger, {
			type: "simple.event",
			message: "Just a message",
		});

		expect(spy).toHaveBeenCalledOnce();
	});
});
