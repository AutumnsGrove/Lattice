/**
 * getTermEntry() — manifest lookup by slug, shared by the Lantern term help (#1348).
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach } from "vitest";
import { getTermEntry, resolveTerm } from "./grove-term-resolve";
import { groveModeStore } from "../stores/grove-mode.svelte";

beforeEach(() => {
	groveModeStore.disable();
});

describe("getTermEntry", () => {
	it("returns the manifest entry for a known slug", () => {
		const entry = getTermEntry("canopy");
		expect(entry?.term).toBe("Canopy");
		expect(entry?.standardTerm).toBe("Directory");
	});

	it("normalises the slug the same way resolveTerm does", () => {
		expect(getTermEntry("  Canopy ")?.term).toBe("Canopy");
		expect(getTermEntry("CANOPY")?.term).toBe("Canopy");
	});

	it("tries the same slug variations as GroveTerm", () => {
		// "bloom" is stored as "blooms"; "garden" as "your-garden".
		expect(getTermEntry("bloom")?.term).toBe("Blooms");
		expect(getTermEntry("garden")).not.toBeNull();
	});

	it("returns null for a slug that is not a term", () => {
		expect(getTermEntry("not-a-real-term")).toBeNull();
		expect(getTermEntry("")).toBeNull();
	});

	it("agrees with resolveTerm about which slugs exist", () => {
		// resolveTerm falls back to the slug itself only when there is no entry.
		groveModeStore.enable();
		expect(resolveTerm("canopy")).toBe(getTermEntry("canopy")!.term);
		expect(resolveTerm("not-a-real-term")).toBe("not-a-real-term");
	});
});
