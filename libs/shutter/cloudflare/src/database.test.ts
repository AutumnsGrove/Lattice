import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	getOffender,
	addOffender,
	shouldSkipFetch,
	listOffenders,
	clearOffenders,
} from "./database";
import type { OffenderRow } from "./types";

// Helper to create a mock D1 database
function createMockD1() {
	const stmt = {
		bind: vi.fn().mockReturnThis(),
		first: vi.fn().mockResolvedValue(null),
		run: vi.fn().mockResolvedValue({ success: true }),
		all: vi.fn().mockResolvedValue({ results: [] }),
	};
	return {
		prepare: vi.fn().mockReturnValue(stmt),
		_stmt: stmt,
	} as any;
}

describe("database module", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ============================================================================
	// getOffender Tests (3)
	// ============================================================================

	describe("getOffender", () => {
		it("returns null when domain not found", async () => {
			const db = createMockD1();
			db._stmt.first.mockResolvedValueOnce(null);

			const result = await getOffender(db, "example.com");
			expect(result).toBeNull();
		});

		it("returns Offender with correct fields when found", async () => {
			const db = createMockD1();
			const row: OffenderRow = {
				domain: "malicious.com",
				first_seen: "2024-01-01T00:00:00Z",
				last_seen: "2024-01-02T00:00:00Z",
				detection_count: 2,
				injection_types: '["instruction_override","jailbreak_attempt"]',
				avg_confidence: 0.85,
				max_confidence: 0.95,
			};
			db._stmt.first.mockResolvedValueOnce(row);

			const result = await getOffender(db, "malicious.com");
			expect(result).not.toBeNull();
			expect(result?.domain).toBe("malicious.com");
			expect(result?.detectionCount).toBe(2);
			expect(result?.avgConfidence).toBe(0.85);
		});

		it("parses injection_types from JSON string to array", async () => {
			const db = createMockD1();
			const row: OffenderRow = {
				domain: "malicious.com",
				first_seen: "2024-01-01T00:00:00Z",
				last_seen: "2024-01-02T00:00:00Z",
				detection_count: 1,
				injection_types: '["instruction_override"]',
				avg_confidence: 0.9,
				max_confidence: 0.9,
			};
			db._stmt.first.mockResolvedValueOnce(row);

			const result = await getOffender(db, "malicious.com");
			expect(result?.injectionTypes).toEqual(["instruction_override"]);
		});
	});

	// ============================================================================
	// addOffender Tests (6)
	// ============================================================================

	describe("addOffender", () => {
		it("inserts new offender when domain not found", async () => {
			const db = createMockD1();
			db._stmt.first.mockResolvedValueOnce(null); // Not found

			await addOffender(db, "newbad.com", "jailbreak_attempt", 0.9);

			// Verify INSERT was called
			const insertCall = db.prepare.mock.calls.find((call) => call[0].includes("INSERT"));
			expect(insertCall).toBeDefined();
		});

		it("updates existing offender when domain found", async () => {
			const db = createMockD1();
			const existing: OffenderRow = {
				domain: "bad.com",
				first_seen: "2024-01-01T00:00:00Z",
				last_seen: "2024-01-01T00:00:00Z",
				detection_count: 1,
				injection_types: '["jailbreak_attempt"]',
				avg_confidence: 0.85,
				max_confidence: 0.85,
			};
			db._stmt.first.mockResolvedValueOnce(existing);

			await addOffender(db, "bad.com", "instruction_override", 0.9);

			// Verify UPDATE was called
			const updateCall = db.prepare.mock.calls.find((call) => call[0].includes("UPDATE"));
			expect(updateCall).toBeDefined();
		});

		it("increments detection_count on update", async () => {
			const db = createMockD1();
			const existing: OffenderRow = {
				domain: "bad.com",
				first_seen: "2024-01-01T00:00:00Z",
				last_seen: "2024-01-01T00:00:00Z",
				detection_count: 2,
				injection_types: '["jailbreak_attempt"]',
				avg_confidence: 0.85,
				max_confidence: 0.85,
			};
			db._stmt.first.mockResolvedValueOnce(existing);

			await addOffender(db, "bad.com", "instruction_override", 0.9);

			const bindCalls = db._stmt.bind.mock.calls;
			const lastBindCall = bindCalls[bindCalls.length - 1];
			// New count should be 3
			expect(lastBindCall[0]).toContain(3);
		});

		it("adds new injection type to array", async () => {
			const db = createMockD1();
			const existing: OffenderRow = {
				domain: "bad.com",
				first_seen: "2024-01-01T00:00:00Z",
				last_seen: "2024-01-01T00:00:00Z",
				detection_count: 1,
				injection_types: '["jailbreak_attempt"]',
				avg_confidence: 0.85,
				max_confidence: 0.85,
			};
			db._stmt.first.mockResolvedValueOnce(existing);

			await addOffender(db, "bad.com", "instruction_override", 0.9);

			const bindCalls = db._stmt.bind.mock.calls;
			const lastBindCall = bindCalls[bindCalls.length - 1];
			// injection_types should now have both types
			const typesStr = lastBindCall.find(
				(arg) => typeof arg === "string" && arg.includes("jailbreak"),
			);
			expect(typesStr).toContain("instruction_override");
			expect(typesStr).toContain("jailbreak_attempt");
		});

		it("does not duplicate existing injection type", async () => {
			const db = createMockD1();
			const existing: OffenderRow = {
				domain: "bad.com",
				first_seen: "2024-01-01T00:00:00Z",
				last_seen: "2024-01-01T00:00:00Z",
				detection_count: 1,
				injection_types: '["jailbreak_attempt"]',
				avg_confidence: 0.85,
				max_confidence: 0.85,
			};
			db._stmt.first.mockResolvedValueOnce(existing);

			await addOffender(db, "bad.com", "jailbreak_attempt", 0.9);

			const bindCalls = db._stmt.bind.mock.calls;
			const lastBindCall = bindCalls[bindCalls.length - 1];
			const typesStr = lastBindCall.find(
				(arg) => typeof arg === "string" && arg.includes("jailbreak"),
			);
			// Should only have one instance of jailbreak_attempt
			const parsed = JSON.parse(typesStr);
			const count = parsed.filter((t: string) => t === "jailbreak_attempt").length;
			expect(count).toBe(1);
		});

		it("recalculates running average on update", async () => {
			const db = createMockD1();
			const existing: OffenderRow = {
				domain: "bad.com",
				first_seen: "2024-01-01T00:00:00Z",
				last_seen: "2024-01-01T00:00:00Z",
				detection_count: 2,
				injection_types: '["jailbreak_attempt"]',
				avg_confidence: 0.8,
				max_confidence: 0.85,
			};
			db._stmt.first.mockResolvedValueOnce(existing);

			// New confidence: 0.9
			// New average: (0.8 * 2 + 0.9) / 3 = 2.5 / 3 = 0.833...
			await addOffender(db, "bad.com", "jailbreak_attempt", 0.9);

			const bindCalls = db._stmt.bind.mock.calls;
			const lastBindCall = bindCalls[bindCalls.length - 1];
			// Find the avg_confidence value (should be around 0.833)
			const avgConfidence = lastBindCall[3]; // 4th bind parameter
			expect(avgConfidence).toBeCloseTo(0.833, 2);
		});
	});

	// ============================================================================
	// shouldSkipFetch Tests (6)
	// ============================================================================

	describe("shouldSkipFetch", () => {
		it("returns false when domain not found", async () => {
			const db = createMockD1();
			db._stmt.first.mockResolvedValueOnce(null);

			const result = await shouldSkipFetch(db, "clean.com");
			expect(result).toBe(false);
		});

		it("returns true when detectionCount >= 3", async () => {
			const db = createMockD1();
			const offender: OffenderRow = {
				domain: "bad.com",
				first_seen: "2024-01-01T00:00:00Z",
				last_seen: "2024-01-03T00:00:00Z",
				detection_count: 3,
				injection_types: '["jailbreak_attempt"]',
				avg_confidence: 0.7,
				max_confidence: 0.85,
			};
			db._stmt.first.mockResolvedValueOnce(offender);

			const result = await shouldSkipFetch(db, "bad.com");
			expect(result).toBe(true);
		});

		it("returns true when maxConfidence >= 0.90", async () => {
			const db = createMockD1();
			const offender: OffenderRow = {
				domain: "bad.com",
				first_seen: "2024-01-01T00:00:00Z",
				last_seen: "2024-01-01T00:00:00Z",
				detection_count: 1,
				injection_types: '["instruction_override"]',
				avg_confidence: 0.9,
				max_confidence: 0.95,
			};
			db._stmt.first.mockResolvedValueOnce(offender);

			const result = await shouldSkipFetch(db, "bad.com");
			expect(result).toBe(true);
		});

		it("returns true when avgConfidence >= 0.80 AND count >= 2", async () => {
			const db = createMockD1();
			const offender: OffenderRow = {
				domain: "bad.com",
				first_seen: "2024-01-01T00:00:00Z",
				last_seen: "2024-01-02T00:00:00Z",
				detection_count: 2,
				injection_types: '["jailbreak_attempt","instruction_override"]',
				avg_confidence: 0.85,
				max_confidence: 0.9,
			};
			db._stmt.first.mockResolvedValueOnce(offender);

			const result = await shouldSkipFetch(db, "bad.com");
			expect(result).toBe(true);
		});

		it("returns false when avgConfidence >= 0.80 but count == 1", async () => {
			const db = createMockD1();
			const offender: OffenderRow = {
				domain: "bad.com",
				first_seen: "2024-01-01T00:00:00Z",
				last_seen: "2024-01-01T00:00:00Z",
				detection_count: 1,
				injection_types: '["jailbreak_attempt"]',
				avg_confidence: 0.85,
				max_confidence: 0.85,
			};
			db._stmt.first.mockResolvedValueOnce(offender);

			const result = await shouldSkipFetch(db, "bad.com");
			expect(result).toBe(false);
		});

		it("returns false when count == 2 but avgConfidence < 0.80", async () => {
			const db = createMockD1();
			const offender: OffenderRow = {
				domain: "bad.com",
				first_seen: "2024-01-01T00:00:00Z",
				last_seen: "2024-01-02T00:00:00Z",
				detection_count: 2,
				injection_types: '["jailbreak_attempt"]',
				avg_confidence: 0.75,
				max_confidence: 0.8,
			};
			db._stmt.first.mockResolvedValueOnce(offender);

			const result = await shouldSkipFetch(db, "bad.com");
			expect(result).toBe(false);
		});
	});

	// ============================================================================
	// listOffenders Tests (2)
	// ============================================================================

	describe("listOffenders", () => {
		it("returns empty array when no offenders", async () => {
			const db = createMockD1();
			db._stmt.all.mockResolvedValueOnce({ results: [] });

			const result = await listOffenders(db);
			expect(result).toEqual([]);
		});

		it("returns mapped offenders from rows", async () => {
			const db = createMockD1();
			const rows: OffenderRow[] = [
				{
					domain: "bad1.com",
					first_seen: "2024-01-01T00:00:00Z",
					last_seen: "2024-01-02T00:00:00Z",
					detection_count: 3,
					injection_types: '["jailbreak_attempt"]',
					avg_confidence: 0.9,
					max_confidence: 0.95,
				},
				{
					domain: "bad2.com",
					first_seen: "2024-01-01T00:00:00Z",
					last_seen: "2024-01-01T00:00:00Z",
					detection_count: 1,
					injection_types: '["instruction_override"]',
					avg_confidence: 0.85,
					max_confidence: 0.85,
				},
			];
			db._stmt.all.mockResolvedValueOnce({ results: rows });

			const result = await listOffenders(db);
			expect(result).toHaveLength(2);
			expect(result[0].domain).toBe("bad1.com");
			expect(result[1].domain).toBe("bad2.com");
		});
	});

	// ============================================================================
	// clearOffenders Tests (1)
	// ============================================================================

	describe("clearOffenders", () => {
		it("calls DELETE FROM offenders", async () => {
			const db = createMockD1();

			await clearOffenders(db);

			const deleteCall = db.prepare.mock.calls.find((call) => call[0].includes("DELETE"));
			expect(deleteCall).toBeDefined();
			expect(deleteCall?.[0]).toContain("DELETE FROM offenders");
		});
	});
});
