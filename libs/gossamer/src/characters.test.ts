/**
 * Tests for character set utilities
 */
import { describe, it, expect } from "vitest";
import {
	CHARACTER_SETS,
	getCharacterSet,
	getCharacters,
	getCharacterSetNames,
	createCharacterSet,
	validateCharacterSet,
	invertCharacters,
} from "./characters";

describe("CHARACTER_SETS", () => {
	it("should contain standard character set", () => {
		expect(CHARACTER_SETS.standard).toBeDefined();
		expect(CHARACTER_SETS.standard.characters).toBe(" .:-=+*#%@");
	});

	it("should have all expected character sets", () => {
		const expectedSets = [
			"standard",
			"dense",
			"minimal",
			"grove",
			"dots",
			"blocks",
			"lines",
			"stars",
			"nature",
			"weather",
			"binary",
			"math",
		];

		for (const setName of expectedSets) {
			expect(CHARACTER_SETS[setName]).toBeDefined();
		}
	});

	it("should have all character sets start with space", () => {
		for (const [name, set] of Object.entries(CHARACTER_SETS)) {
			expect(set.characters[0]).toBe(" ");
		}
	});
});

describe("getCharacterSet", () => {
	it("should return character set by name", () => {
		const result = getCharacterSet("standard");
		expect(result).toBeDefined();
		expect(result?.name).toBe("Standard");
		expect(result?.characters).toBe(" .:-=+*#%@");
	});

	it("should return undefined for unknown set", () => {
		const result = getCharacterSet("nonexistent");
		expect(result).toBeUndefined();
	});
});

describe("getCharacters", () => {
	it("should return characters string for valid set", () => {
		expect(getCharacters("minimal")).toBe(" .:*#");
		expect(getCharacters("blocks")).toBe(" ░▒▓█");
	});

	it("should return standard characters for unknown set", () => {
		expect(getCharacters("nonexistent")).toBe(" .:-=+*#%@");
	});
});

describe("getCharacterSetNames", () => {
	it("should return array of all set names", () => {
		const names = getCharacterSetNames();
		expect(Array.isArray(names)).toBe(true);
		expect(names).toContain("standard");
		expect(names).toContain("minimal");
		expect(names).toContain("blocks");
	});

	it("should return same count as CHARACTER_SETS keys", () => {
		const names = getCharacterSetNames();
		expect(names.length).toBe(Object.keys(CHARACTER_SETS).length);
	});
});

describe("createCharacterSet", () => {
	it("should create character set with all properties", () => {
		const result = createCharacterSet("custom", " abc", "A custom set", ["testing"]);

		expect(result.name).toBe("custom");
		expect(result.characters).toBe(" abc");
		expect(result.description).toBe("A custom set");
		expect(result.bestFor).toEqual(["testing"]);
	});

	it("should use defaults for optional parameters", () => {
		const result = createCharacterSet("minimal", " xy");

		expect(result.name).toBe("minimal");
		expect(result.characters).toBe(" xy");
		expect(result.description).toBe("");
		expect(result.bestFor).toEqual([]);
	});
});

describe("validateCharacterSet", () => {
	it("should return true for valid character sets", () => {
		expect(validateCharacterSet(" .:-=+*#%@")).toBe(true);
		expect(validateCharacterSet(" ab")).toBe(true);
		expect(validateCharacterSet(" ░▒▓█")).toBe(true);
	});

	it("should return false for too short sets", () => {
		expect(validateCharacterSet("")).toBe(false);
		expect(validateCharacterSet(" ")).toBe(false);
	});

	it("should return false for sets not starting with space", () => {
		expect(validateCharacterSet("abc")).toBe(false);
		expect(validateCharacterSet(".:-=")).toBe(false);
	});
});

describe("invertCharacters", () => {
	it("should reverse character string", () => {
		expect(invertCharacters(" abc")).toBe("cba ");
		expect(invertCharacters(" .:-=")).toBe("=-:. ");
	});

	it("should handle single character", () => {
		expect(invertCharacters(" ")).toBe(" ");
	});

	it("should be reversible", () => {
		const original = " .:-=+*#%@";
		const inverted = invertCharacters(original);
		const restored = invertCharacters(inverted);
		expect(restored).toBe(original);
	});
});
