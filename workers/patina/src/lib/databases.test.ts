import { describe, it, expect } from "vitest";
import { DATABASES, DAILY_DATABASES, CRON_DAILY, CRON_WEEKLY, BACKUP_CONFIG } from "./databases";

describe("DATABASES", () => {
	it("contains 14 databases", () => {
		expect(DATABASES).toHaveLength(14);
	});

	it("each database has required fields", () => {
		DATABASES.forEach((db) => {
			expect(db).toHaveProperty("name");
			expect(db).toHaveProperty("id");
			expect(db).toHaveProperty("binding");
			expect(db).toHaveProperty("description");
			expect(db).toHaveProperty("priority");
			expect(db).toHaveProperty("estimatedSize");
		});
	});

	it("all database names are strings", () => {
		DATABASES.forEach((db) => {
			expect(typeof db.name).toBe("string");
			expect(db.name.length).toBeGreaterThan(0);
		});
	});

	it("all database IDs are UUIDs", () => {
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		DATABASES.forEach((db) => {
			expect(db.id).toMatch(uuidRegex);
		});
	});

	it("all bindings are uppercase with underscores", () => {
		DATABASES.forEach((db) => {
			expect(db.binding).toMatch(/^[A-Z_]+$/);
		});
	});

	it("all descriptions are non-empty strings", () => {
		DATABASES.forEach((db) => {
			expect(typeof db.description).toBe("string");
			expect(db.description.length).toBeGreaterThan(0);
		});
	});

	it("no duplicate database names", () => {
		const names = DATABASES.map((db) => db.name);
		const uniqueNames = new Set(names);
		expect(uniqueNames.size).toBe(DATABASES.length);
	});

	it("no duplicate database IDs", () => {
		const ids = DATABASES.map((db) => db.id);
		const uniqueIds = new Set(ids);
		expect(uniqueIds.size).toBe(DATABASES.length);
	});

	it("no duplicate bindings", () => {
		const bindings = DATABASES.map((db) => db.binding);
		const uniqueBindings = new Set(bindings);
		expect(uniqueBindings.size).toBe(DATABASES.length);
	});

	it("all priority values are valid", () => {
		const validPriorities = ["critical", "high", "normal"];
		DATABASES.forEach((db) => {
			expect(validPriorities).toContain(db.priority);
		});
	});

	it("has expected critical priority databases", () => {
		const criticalDbs = DATABASES.filter((db) => db.priority === "critical");
		expect(criticalDbs.length).toBeGreaterThan(0);
		const criticalNames = criticalDbs.map((db) => db.name);
		expect(criticalNames).toContain("groveauth");
		expect(criticalNames).toContain("scout-db");
	});

	it("has expected high priority databases", () => {
		const highDbs = DATABASES.filter((db) => db.priority === "high");
		expect(highDbs.length).toBeGreaterThan(0);
		const highNames = highDbs.map((db) => db.name);
		expect(highNames).toContain("grove-engine-db");
		expect(highNames).toContain("grove-curios-db");
	});

	it("contains groveauth database", () => {
		const groveauth = DATABASES.find((db) => db.name === "groveauth");
		expect(groveauth).toBeDefined();
		expect(groveauth?.binding).toBe("GROVEAUTH_DB");
		expect(groveauth?.priority).toBe("critical");
	});

	it("contains scout-db database", () => {
		const scout = DATABASES.find((db) => db.name === "scout-db");
		expect(scout).toBeDefined();
		expect(scout?.binding).toBe("SCOUT_DB");
		expect(scout?.priority).toBe("critical");
	});

	it("contains grove-engine-db database", () => {
		const engine = DATABASES.find((db) => db.name === "grove-engine-db");
		expect(engine).toBeDefined();
		expect(engine?.binding).toBe("GROVE_ENGINE_DB");
		expect(engine?.priority).toBe("high");
	});

	it("contains grove-curios-db database", () => {
		const curios = DATABASES.find((db) => db.name === "grove-curios-db");
		expect(curios).toBeDefined();
		expect(curios?.binding).toBe("GROVE_CURIOS_DB");
		expect(curios?.priority).toBe("high");
	});
});

describe("DAILY_DATABASES", () => {
	it("only includes databases with dailyBackup: true", () => {
		DAILY_DATABASES.forEach((db) => {
			expect(db.dailyBackup).toBe(true);
		});
	});

	it("contains exactly 3 databases", () => {
		expect(DAILY_DATABASES).toHaveLength(3);
	});

	it("includes groveauth", () => {
		const names = DAILY_DATABASES.map((db) => db.name);
		expect(names).toContain("groveauth");
	});

	it("includes grove-engine-db", () => {
		const names = DAILY_DATABASES.map((db) => db.name);
		expect(names).toContain("grove-engine-db");
	});

	it("includes grove-curios-db", () => {
		const names = DAILY_DATABASES.map((db) => db.name);
		expect(names).toContain("grove-curios-db");
	});

	it("excludes databases without dailyBackup flag", () => {
		const names = DAILY_DATABASES.map((db) => db.name);
		expect(names).not.toContain("scout-db");
		expect(names).not.toContain("grovemusic-db");
		expect(names).not.toContain("library-enhancer-db");
	});

	it("is a filtered subset of DATABASES", () => {
		DAILY_DATABASES.forEach((dailyDb) => {
			const found = DATABASES.find((db) => db.id === dailyDb.id);
			expect(found).toBeDefined();
		});
	});
});

describe("CRON_DAILY", () => {
	it("is a valid cron string", () => {
		expect(typeof CRON_DAILY).toBe("string");
		expect(CRON_DAILY).toBe("0 3 * * *");
	});

	it("represents 3 AM daily schedule", () => {
		// Format: minute hour day month day-of-week
		// 0 3 * * * = At 3:00 AM every day
		expect(CRON_DAILY).toMatch(/^0 3 \* \* \*$/);
	});
});

describe("CRON_WEEKLY", () => {
	it("is a valid cron string", () => {
		expect(typeof CRON_WEEKLY).toBe("string");
		expect(CRON_WEEKLY).toBe("0 4 * * SUN");
	});

	it("represents Sunday at 4 AM schedule", () => {
		// 0 4 * * SUN = At 4:00 AM on Sunday
		expect(CRON_WEEKLY).toMatch(/^0 4 \* \* SUN$/);
	});
});

describe("BACKUP_CONFIG", () => {
	it("has cronSchedule property", () => {
		expect(BACKUP_CONFIG).toHaveProperty("cronSchedule");
		expect(typeof BACKUP_CONFIG.cronSchedule).toBe("string");
	});

	it("has valid cronSchedule", () => {
		// Every Sunday at 3:00 AM UTC
		expect(BACKUP_CONFIG.cronSchedule).toBe("0 3 * * 0");
	});

	it("has retentionWeeks property set to 12", () => {
		expect(BACKUP_CONFIG).toHaveProperty("retentionWeeks");
		expect(BACKUP_CONFIG.retentionWeeks).toBe(12);
	});

	it("has bucketName property set to grove-backups", () => {
		expect(BACKUP_CONFIG).toHaveProperty("bucketName");
		expect(BACKUP_CONFIG.bucketName).toBe("grove-backups");
	});

	it("has concurrency property set to 3", () => {
		expect(BACKUP_CONFIG).toHaveProperty("concurrency");
		expect(BACKUP_CONFIG.concurrency).toBe(3);
	});

	it("has exportTimeout property set to 30000", () => {
		expect(BACKUP_CONFIG).toHaveProperty("exportTimeout");
		expect(BACKUP_CONFIG.exportTimeout).toBe(30000);
	});

	it("exportTimeout is in milliseconds", () => {
		// 30000 ms = 30 seconds
		expect(BACKUP_CONFIG.exportTimeout).toBe(30000);
	});

	it("has numeric concurrency value", () => {
		expect(typeof BACKUP_CONFIG.concurrency).toBe("number");
		expect(BACKUP_CONFIG.concurrency).toBeGreaterThan(0);
	});

	it("has numeric retentionWeeks value", () => {
		expect(typeof BACKUP_CONFIG.retentionWeeks).toBe("number");
		expect(BACKUP_CONFIG.retentionWeeks).toBeGreaterThan(0);
	});

	it("has numeric exportTimeout value", () => {
		expect(typeof BACKUP_CONFIG.exportTimeout).toBe("number");
		expect(BACKUP_CONFIG.exportTimeout).toBeGreaterThan(0);
	});

	it("concurrency is reasonable", () => {
		// Concurrency should be between 1 and available CPU cores
		expect(BACKUP_CONFIG.concurrency).toBeGreaterThanOrEqual(1);
		expect(BACKUP_CONFIG.concurrency).toBeLessThanOrEqual(10);
	});

	it("retentionWeeks is reasonable", () => {
		// Should be between 1 week and 2 years
		expect(BACKUP_CONFIG.retentionWeeks).toBeGreaterThanOrEqual(1);
		expect(BACKUP_CONFIG.retentionWeeks).toBeLessThanOrEqual(104);
	});

	it("exportTimeout is reasonable", () => {
		// Should be between 10 seconds and 5 minutes
		expect(BACKUP_CONFIG.exportTimeout).toBeGreaterThanOrEqual(10000);
		expect(BACKUP_CONFIG.exportTimeout).toBeLessThanOrEqual(300000);
	});
});
