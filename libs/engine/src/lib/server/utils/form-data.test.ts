import { describe, it, expect } from "vitest";
import { z } from "zod";
import { parseFormData } from "./form-data";

function makeFormData(entries: Record<string, string>): FormData {
	const fd = new FormData();
	for (const [key, value] of Object.entries(entries)) {
		fd.set(key, value);
	}
	return fd;
}

describe("parseFormData", () => {
	const TestSchema = z.object({
		name: z.string().min(1, "Name is required"),
		age: z.coerce.number().int().positive(),
		email: z.string().email("Invalid email"),
	});

	it("returns typed data when form data is valid", () => {
		const fd = makeFormData({
			name: "Autumn",
			age: "28",
			email: "hello@grove.place",
		});

		const result = parseFormData(fd, TestSchema);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.name).toBe("Autumn");
			expect(result.data.age).toBe(28);
			expect(result.data.email).toBe("hello@grove.place");
		}
	});

	it("returns field errors when validation fails", () => {
		const fd = makeFormData({
			name: "",
			age: "not-a-number",
			email: "invalid",
		});

		const result = parseFormData(fd, TestSchema);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.errors.name).toBeDefined();
			expect(result.errors.email).toBeDefined();
		}
	});

	it("handles missing fields", () => {
		const fd = makeFormData({ name: "Autumn" });

		const result = parseFormData(fd, TestSchema);
		expect(result.success).toBe(false);
	});

	it("works with optional fields and defaults", () => {
		const OptionalSchema = z.object({
			title: z.string().min(1),
			color: z.string().optional().default("green"),
		});

		const fd = makeFormData({ title: "Hello" });
		const result = parseFormData(fd, OptionalSchema);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.title).toBe("Hello");
			expect(result.data.color).toBe("green");
		}
	});

	it("works with boolean coercion", () => {
		const BoolSchema = z.object({
			enabled: z.string().transform((v) => v === "true"),
		});

		const fd = makeFormData({ enabled: "true" });
		const result = parseFormData(fd, BoolSchema);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.enabled).toBe(true);
		}
	});
});
