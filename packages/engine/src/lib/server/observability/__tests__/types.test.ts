/**
 * Vista Observability — Types and Service Registry Tests
 *
 * Validates the SERVICE_REGISTRY data integrity and structural invariants.
 * No D1, no network — purely structural.
 */

import { describe, it, expect } from "vitest";
import { SERVICE_REGISTRY } from "../types.js";

// =============================================================================
// SERVICE_REGISTRY structural tests
// =============================================================================

describe("SERVICE_REGISTRY.workers", () => {
	it("contains at least one worker", () => {
		expect(SERVICE_REGISTRY.workers.length).toBeGreaterThan(0);
	});

	it("each worker has a unique name", () => {
		const names = SERVICE_REGISTRY.workers.map((w) => w.name);
		const uniqueNames = new Set(names);
		expect(uniqueNames.size).toBe(names.length);
	});

	it("each worker has a unique scriptName", () => {
		const scripts = SERVICE_REGISTRY.workers.map((w) => w.scriptName);
		const uniqueScripts = new Set(scripts);
		expect(uniqueScripts.size).toBe(scripts.length);
	});

	it("workers with hasHttp=true have a healthCheckUrl and healthPath", () => {
		for (const worker of SERVICE_REGISTRY.workers) {
			if (worker.hasHttp) {
				expect(worker.healthCheckUrl).toBeTruthy();
				expect(worker.healthPath).toBeTruthy();
			}
		}
	});

	it("workers with hasHttp=false have null healthCheckUrl and healthPath", () => {
		for (const worker of SERVICE_REGISTRY.workers) {
			if (!worker.hasHttp) {
				expect(worker.healthCheckUrl).toBeNull();
				expect(worker.healthPath).toBeNull();
			}
		}
	});

	it("healthCheckUrl starts with https:// when set", () => {
		for (const worker of SERVICE_REGISTRY.workers) {
			if (worker.healthCheckUrl) {
				expect(worker.healthCheckUrl).toMatch(/^https:\/\//);
			}
		}
	});

	it("healthPath starts with / when set", () => {
		for (const worker of SERVICE_REGISTRY.workers) {
			if (worker.healthPath) {
				expect(worker.healthPath).toMatch(/^\//);
			}
		}
	});

	it("each worker has a non-empty description", () => {
		for (const worker of SERVICE_REGISTRY.workers) {
			expect(worker.description).toBeTruthy();
			expect(worker.description.length).toBeGreaterThan(0);
		}
	});

	it("grove-vista-collector is listed", () => {
		const names = SERVICE_REGISTRY.workers.map((w) => w.name);
		expect(names).toContain("grove-vista-collector");
	});

	it("grove-engine is listed", () => {
		const names = SERVICE_REGISTRY.workers.map((w) => w.name);
		expect(names).toContain("grove-engine");
	});
});

describe("SERVICE_REGISTRY.databases", () => {
	it("contains at least one database", () => {
		expect(SERVICE_REGISTRY.databases.length).toBeGreaterThan(0);
	});

	it("each database has a unique name", () => {
		const names = SERVICE_REGISTRY.databases.map((d) => d.name);
		const uniqueNames = new Set(names);
		expect(uniqueNames.size).toBe(names.length);
	});

	it("each database has a non-empty databaseId", () => {
		for (const db of SERVICE_REGISTRY.databases) {
			expect(db.databaseId).toBeTruthy();
		}
	});

	it("grove-engine-db is listed", () => {
		const names = SERVICE_REGISTRY.databases.map((d) => d.name);
		expect(names).toContain("grove-engine-db");
	});

	it("each database has a non-empty description", () => {
		for (const db of SERVICE_REGISTRY.databases) {
			expect(db.description).toBeTruthy();
		}
	});
});

describe("SERVICE_REGISTRY.buckets", () => {
	it("contains at least one bucket", () => {
		expect(SERVICE_REGISTRY.buckets.length).toBeGreaterThan(0);
	});

	it("each bucket has a unique name", () => {
		const names = SERVICE_REGISTRY.buckets.map((b) => b.name);
		const uniqueNames = new Set(names);
		expect(uniqueNames.size).toBe(names.length);
	});

	it("grove-assets is listed", () => {
		const names = SERVICE_REGISTRY.buckets.map((b) => b.name);
		expect(names).toContain("grove-assets");
	});

	it("each bucket has a non-empty description", () => {
		for (const bucket of SERVICE_REGISTRY.buckets) {
			expect(bucket.description).toBeTruthy();
		}
	});
});

describe("SERVICE_REGISTRY.kvNamespaces", () => {
	it("contains at least one KV namespace", () => {
		expect(SERVICE_REGISTRY.kvNamespaces.length).toBeGreaterThan(0);
	});

	it("each namespace has a unique name", () => {
		const names = SERVICE_REGISTRY.kvNamespaces.map((k) => k.name);
		const uniqueNames = new Set(names);
		expect(uniqueNames.size).toBe(names.length);
	});

	it("each namespace has a non-empty namespaceId", () => {
		for (const kv of SERVICE_REGISTRY.kvNamespaces) {
			expect(kv.namespaceId).toBeTruthy();
		}
	});

	it("RATE_LIMITER is listed", () => {
		const names = SERVICE_REGISTRY.kvNamespaces.map((k) => k.name);
		expect(names).toContain("RATE_LIMITER");
	});
});

describe("SERVICE_REGISTRY.durableObjects", () => {
	it("contains at least one Durable Object class", () => {
		expect(SERVICE_REGISTRY.durableObjects.length).toBeGreaterThan(0);
	});

	it("each DO class has a unique className", () => {
		const classNames = SERVICE_REGISTRY.durableObjects.map((d) => d.className);
		const uniqueNames = new Set(classNames);
		expect(uniqueNames.size).toBe(classNames.length);
	});

	it("each DO has a non-empty workerScriptName", () => {
		for (const doClass of SERVICE_REGISTRY.durableObjects) {
			expect(doClass.workerScriptName).toBeTruthy();
		}
	});

	it("each DO workerScriptName references a known worker", () => {
		const workerScripts = new Set(SERVICE_REGISTRY.workers.map((w) => w.scriptName));
		for (const doClass of SERVICE_REGISTRY.durableObjects) {
			expect(workerScripts.has(doClass.workerScriptName)).toBe(true);
		}
	});

	it("TenantDO is listed", () => {
		const classNames = SERVICE_REGISTRY.durableObjects.map((d) => d.className);
		expect(classNames).toContain("TenantDO");
	});

	it("each DO has a boolean instrumented field", () => {
		for (const doClass of SERVICE_REGISTRY.durableObjects) {
			expect(typeof doClass.instrumented).toBe("boolean");
		}
	});
});
