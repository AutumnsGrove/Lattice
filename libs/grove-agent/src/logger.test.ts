import { describe, it, expect, vi, beforeEach } from "vitest";
import { AgentLogger } from "./logger.js";

describe("AgentLogger", () => {
	let logger: AgentLogger;

	beforeEach(() => {
		logger = new AgentLogger("TestAgent", "instance_abc");
		vi.restoreAllMocks();
	});

	it("emits structured JSON to console.log for info level", () => {
		const spy = vi.spyOn(console, "log").mockImplementation(() => {});
		logger.info("Hello world");

		expect(spy).toHaveBeenCalledOnce();
		const entry = JSON.parse(spy.mock.calls[0][0] as string);
		expect(entry.agent).toBe("TestAgent");
		expect(entry.instance).toBe("instance_abc");
		expect(entry.level).toBe("info");
		expect(entry.message).toBe("Hello world");
		expect(entry.timestamp).toBeDefined();
	});

	it("emits to console.debug for debug level", () => {
		const spy = vi.spyOn(console, "debug").mockImplementation(() => {});
		logger.debug("Debug message");

		expect(spy).toHaveBeenCalledOnce();
		const entry = JSON.parse(spy.mock.calls[0][0] as string);
		expect(entry.level).toBe("debug");
	});

	it("emits to console.warn for warn level", () => {
		const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
		logger.warn("Warning");

		expect(spy).toHaveBeenCalledOnce();
		const entry = JSON.parse(spy.mock.calls[0][0] as string);
		expect(entry.level).toBe("warn");
	});

	it("emits to console.error for error level", () => {
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});
		logger.error("Failure");

		expect(spy).toHaveBeenCalledOnce();
		const entry = JSON.parse(spy.mock.calls[0][0] as string);
		expect(entry.level).toBe("error");
	});

	it("includes additional data fields in the log entry", () => {
		const spy = vi.spyOn(console, "log").mockImplementation(() => {});
		logger.info("With data", { userId: "u_123", action: "login" });

		const entry = JSON.parse(spy.mock.calls[0][0] as string);
		expect(entry.userId).toBe("u_123");
		expect(entry.action).toBe("login");
	});

	it("prevents data from overwriting structural fields", () => {
		const spy = vi.spyOn(console, "log").mockImplementation(() => {});
		logger.info("Sneaky data", {
			agent: "HACKED",
			level: "debug",
			message: "OVERWRITTEN",
		});

		const entry = JSON.parse(spy.mock.calls[0][0] as string);
		expect(entry.agent).toBe("TestAgent");
		expect(entry.level).toBe("info");
		expect(entry.message).toBe("Sneaky data");
	});

	describe("errorWithCause", () => {
		it("extracts message from Error objects", () => {
			const spy = vi.spyOn(console, "error").mockImplementation(() => {});
			logger.errorWithCause("Failed", new Error("connection timeout"));

			const entry = JSON.parse(spy.mock.calls[0][0] as string);
			expect(entry.level).toBe("error");
			expect(entry.message).toBe("Failed");
			expect(entry.cause).toBe("connection timeout");
		});

		it("converts non-Error causes to strings", () => {
			const spy = vi.spyOn(console, "error").mockImplementation(() => {});
			logger.errorWithCause("Failed", 42);

			const entry = JSON.parse(spy.mock.calls[0][0] as string);
			expect(entry.cause).toBe("42");
		});

		it("converts string causes directly", () => {
			const spy = vi.spyOn(console, "error").mockImplementation(() => {});
			logger.errorWithCause("Failed", "raw string error");

			const entry = JSON.parse(spy.mock.calls[0][0] as string);
			expect(entry.cause).toBe("raw string error");
		});

		it("merges additional data alongside cause", () => {
			const spy = vi.spyOn(console, "error").mockImplementation(() => {});
			logger.errorWithCause("Failed", new Error("oops"), {
				connectionId: "conn_1",
			});

			const entry = JSON.parse(spy.mock.calls[0][0] as string);
			expect(entry.cause).toBe("oops");
			expect(entry.connectionId).toBe("conn_1");
		});
	});
});
