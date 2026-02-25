/**
 * Grove Server SDK — Test Utilities
 *
 * In-memory mock implementations for all SDK interfaces.
 * Use these in unit tests to avoid real infrastructure dependencies.
 *
 * @example
 * ```typescript
 * import { createMockContext } from "@autumnsgrove/server-sdk/testing";
 *
 * const ctx = createMockContext();
 * ctx.db.whenQuery("SELECT", [{ id: 1, title: "Test Post" }]);
 *
 * const result = await ctx.db.execute("SELECT * FROM posts");
 * expect(result.results).toHaveLength(1);
 * ```
 *
 * @module @autumnsgrove/server-sdk/testing
 */

import type { GroveScheduler, ScheduleHandler, ScheduleInfo, SchedulerInfo } from "../types.js";
import type { GroveConfig, ConfigInfo, GroveObserver } from "../types.js";
import { MockDatabase } from "./mock-database.js";
import { MockStorage } from "./mock-storage.js";
import { MockKV } from "./mock-kv.js";

// Re-export mock classes
export { MockDatabase } from "./mock-database.js";
export { MockStorage } from "./mock-storage.js";
export { MockKV } from "./mock-kv.js";

/** In-memory mock for GroveServiceBus */
class MockServiceBus {
	private readonly responses = new Map<string, unknown>();

	/** Pre-configure a response for a service call */
	whenCall(service: string, response: unknown): this {
		this.responses.set(service, response);
		return this;
	}

	async call<T = unknown>(
		service: string,
		_request: { method: string; path: string; headers?: Record<string, string>; body?: unknown },
	): Promise<{ status: number; headers: Record<string, string>; data: T }> {
		const response = this.responses.get(service);
		return {
			status: 200,
			headers: { "content-type": "application/json" },
			data: (response ?? {}) as T,
		};
	}

	async ping(service: string): Promise<boolean> {
		return this.responses.has(service);
	}

	services(): string[] {
		return Array.from(this.responses.keys());
	}

	info() {
		return { provider: "mock", services: this.services() };
	}

	reset(): void {
		this.responses.clear();
	}
}

/** In-memory mock for GroveScheduler */
class MockScheduler implements GroveScheduler {
	private readonly handlers = new Map<string, ScheduleHandler>();

	on(name: string, handler: ScheduleHandler): void {
		this.handlers.set(name, handler);
	}

	schedules(): ScheduleInfo[] {
		return Array.from(this.handlers.keys()).map((name) => ({
			name,
			cron: "* * * * *",
		}));
	}

	info(): SchedulerInfo {
		return { provider: "mock" };
	}

	reset(): void {
		this.handlers.clear();
	}
}

/** In-memory mock for GroveConfig */
class MockConfig implements GroveConfig {
	private readonly values = new Map<string, string>();

	/** Set a config value */
	set(key: string, value: string): this {
		this.values.set(key, value);
		return this;
	}

	require(key: string): string {
		const value = this.values.get(key);
		if (value === undefined) {
			throw new Error(`Mock config key not found: ${key}`);
		}
		return value;
	}

	get(key: string): string | undefined {
		return this.values.get(key);
	}

	getOrDefault(key: string, defaultValue: string): string {
		return this.values.get(key) ?? defaultValue;
	}

	has(key: string): boolean {
		return this.values.has(key);
	}

	info(): ConfigInfo {
		return { provider: "mock" };
	}

	reset(): void {
		this.values.clear();
	}
}

/** A fully mocked GroveContext with typed mock instances */
export interface MockGroveContext {
	db: MockDatabase;
	storage: MockStorage;
	kv: MockKV;
	services: MockServiceBus;
	scheduler: MockScheduler;
	config: MockConfig;
	observer?: GroveObserver;
}

/**
 * Create a fully mocked GroveContext for testing.
 *
 * All services are backed by in-memory implementations.
 * Each service has a `.reset()` method to clear state between tests.
 * Pass an observer to capture SDK events during tests.
 */
export function createMockContext(observer?: GroveObserver): MockGroveContext {
	return {
		db: new MockDatabase(),
		storage: new MockStorage(),
		kv: new MockKV(),
		services: new MockServiceBus(),
		scheduler: new MockScheduler(),
		config: new MockConfig(),
		observer,
	};
}
