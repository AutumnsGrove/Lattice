/**
 * Notes Service Tests
 *
 * Tests createNote and deleteNote — native short-form posts in the meadow.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createNote, deleteNote } from "./notes";
import { createMockD1, type MockD1 } from "./test-helpers";

vi.stubGlobal("crypto", { randomUUID: () => "mock-uuid-note" });

// Freeze time for deterministic timestamps
const NOW_SECONDS = 1700000000;
vi.spyOn(Date, "now").mockReturnValue(NOW_SECONDS * 1000);

describe("createNote", () => {
	let db: MockD1;

	beforeEach(() => {
		db = createMockD1();
	});

	it("should insert note and return MeadowPost shape", async () => {
		db._pushResult({ meta: { changes: 1 } });

		const result = await createNote(
			db as unknown as D1Database,
			"user-1",
			"Autumn",
			"Hello meadow!",
			["greeting"],
			null,
			"tenant-1",
			"autumn",
		);

		expect(result.id).toBe("mock-uuid-note");
		expect(result.postType).toBe("note");
		expect(result.body).toBe("Hello meadow!");
		expect(result.authorName).toBe("Autumn");
		expect(result.authorSubdomain).toBe("autumn");
		expect(result.tags).toEqual(["greeting"]);
		expect(result.publishedAt).toBe(NOW_SECONDS);
		expect(result.score).toBe(0);
		expect(result.reactionCounts).toEqual({});
		expect(result.userVoted).toBe(false);
		expect(result.userBookmarked).toBe(false);
		expect(result.userId).toBe("user-1");
	});

	it("should trim body whitespace", async () => {
		db._pushResult({ meta: { changes: 1 } });

		const result = await createNote(db as unknown as D1Database, "user-1", null, "  padded text  ");

		expect(result.body).toBe("padded text");
	});

	it("should default tags to empty array when not provided", async () => {
		db._pushResult({ meta: { changes: 1 } });

		const result = await createNote(db as unknown as D1Database, "user-1", null, "body");

		expect(result.tags).toEqual([]);
	});

	it("should default authorSubdomain to empty string", async () => {
		db._pushResult({ meta: { changes: 1 } });

		const result = await createNote(db as unknown as D1Database, "user-1", null, "body");

		expect(result.authorSubdomain).toBe("");
	});

	it("should store contentHtml when provided", async () => {
		db._pushResult({ meta: { changes: 1 } });

		const result = await createNote(
			db as unknown as D1Database,
			"user-1",
			"Author",
			"body",
			[],
			"<p>rich text</p>",
		);

		expect(result.contentHtml).toBe("<p>rich text</p>");
	});

	it("should default contentHtml to null", async () => {
		db._pushResult({ meta: { changes: 1 } });

		const result = await createNote(db as unknown as D1Database, "user-1", null, "body");

		expect(result.contentHtml).toBeNull();
	});

	it("should include blaze when provided", async () => {
		db._pushResult({ meta: { changes: 1 } });

		const result = await createNote(
			db as unknown as D1Database,
			"user-1",
			null,
			"body",
			[],
			null,
			"tenant-1",
			"blog",
			"announcement",
		);

		expect(result.blaze).toBe("announcement");
	});

	it("should pass correct bindings to INSERT", async () => {
		db._pushResult({ meta: { changes: 1 } });

		await createNote(
			db as unknown as D1Database,
			"user-1",
			"Author",
			"hello",
			["tag1"],
			"<p>hi</p>",
			"t-1",
			"sub",
			"featured",
		);

		expect(db._calls[0].sql).toContain("INSERT INTO meadow_posts");
		const bindings = db._calls[0].bindings;
		expect(bindings[0]).toBe("mock-uuid-note"); // id
		expect(bindings[1]).toBe("t-1"); // tenant_id
		expect(bindings[2]).toBe("note:mock-uuid-note"); // guid
		expect(bindings[3]).toBe("<p>hi</p>"); // content_html
		expect(bindings[4]).toBe("Author"); // author_name
		expect(bindings[5]).toBe("sub"); // author_subdomain
		expect(bindings[6]).toBe('["tag1"]'); // tags JSON
	});
});

describe("deleteNote", () => {
	let db: MockD1;

	beforeEach(() => {
		db = createMockD1();
	});

	it("should delete note when author matches", async () => {
		db._pushResult({ meta: { changes: 1 } });

		const result = await deleteNote(db as unknown as D1Database, "user-1", "note-1");

		expect(result).toBe(true);
		expect(db._calls[0].sql).toContain("DELETE FROM meadow_posts");
		expect(db._calls[0].sql).toContain("user_id = ?");
		expect(db._calls[0].sql).toContain("post_type = 'note'");
		expect(db._calls[0].bindings).toEqual(["note-1", "user-1"]);
	});

	it("should return false when note not found or not author", async () => {
		db._pushResult({ meta: { changes: 0 } });

		const result = await deleteNote(db as unknown as D1Database, "user-1", "note-1");

		expect(result).toBe(false);
	});

	it("should only delete notes, not blooms", async () => {
		db._pushResult({ meta: { changes: 0 } });

		await deleteNote(db as unknown as D1Database, "user-1", "bloom-id");

		expect(db._calls[0].sql).toContain("post_type = 'note'");
	});
});
