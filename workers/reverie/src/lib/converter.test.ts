/**
 * Converter Tests — Schema to Tool Definition
 *
 * Tests the mapping from DomainSchema field definitions to
 * LumenToolDefinition JSON Schema parameters.
 */

import { describe, it, expect } from "vitest";
import { schemaToTool, schemasToTools } from "./converter";
import { SCHEMA_REGISTRY, getSchemas } from "@autumnsgrove/lattice/reverie";
import type { DomainSchema, FieldDefinition } from "@autumnsgrove/lattice/reverie";

/** Build a minimal test schema */
function testSchema(
	overrides: Partial<DomainSchema> & { fields: Record<string, FieldDefinition> },
): DomainSchema {
	return {
		id: "test.domain" as DomainSchema["id"],
		name: "Test Domain",
		description: "A test domain for unit tests",
		group: "appearance",
		database: "engine",
		readEndpoint: "GET /api/test",
		writeEndpoint: "PUT /api/test",
		writeMethod: "PUT",
		examples: [],
		keywords: ["test"],
		...overrides,
	};
}

describe("schemaToTool", () => {
	// ─── Naming ──────────────────────────────────────────────────

	describe("tool naming", () => {
		it("should use set_ prefix for writable domains", () => {
			const tool = schemaToTool(
				testSchema({
					fields: { name: { type: "string", description: "A name" } },
				}),
			);
			expect(tool.function.name).toBe("set_test_domain");
		});

		it("should use query_ prefix for read-only domains", () => {
			const tool = schemaToTool(
				testSchema({
					writeEndpoint: null,
					fields: { name: { type: "string", description: "A name" } },
				}),
			);
			expect(tool.function.name).toBe("query_test_domain");
		});

		it("should replace dots with underscores in domain ID", () => {
			const tool = schemaToTool(
				testSchema({
					fields: { name: { type: "string", description: "A name" } },
				}),
			);
			expect(tool.function.name).not.toContain(".");
		});
	});

	// ─── Field Type Mapping ──────────────────────────────────────

	describe("field type mapping", () => {
		it("should map string fields", () => {
			const tool = schemaToTool(
				testSchema({
					fields: {
						title: { type: "string", description: "A title", constraints: { maxLength: 200 } },
					},
				}),
			);
			const props = tool.function.parameters as {
				properties: Record<string, Record<string, unknown>>;
			};
			expect(props.properties.title.type).toBe("string");
			expect(props.properties.title.maxLength).toBe(200);
		});

		it("should map boolean fields", () => {
			const tool = schemaToTool(
				testSchema({
					fields: { enabled: { type: "boolean", description: "Is enabled" } },
				}),
			);
			const props = tool.function.parameters as {
				properties: Record<string, Record<string, unknown>>;
			};
			expect(props.properties.enabled.type).toBe("boolean");
		});

		it("should map integer fields with constraints", () => {
			const tool = schemaToTool(
				testSchema({
					fields: {
						count: { type: "integer", description: "A count", constraints: { min: 1, max: 100 } },
					},
				}),
			);
			const props = tool.function.parameters as {
				properties: Record<string, Record<string, unknown>>;
			};
			expect(props.properties.count.type).toBe("integer");
			expect(props.properties.count.minimum).toBe(1);
			expect(props.properties.count.maximum).toBe(100);
		});

		it("should map enum fields with options", () => {
			const tool = schemaToTool(
				testSchema({
					fields: {
						style: {
							type: "enum",
							description: "A style",
							options: ["minimal", "bold", "classic"],
						},
					},
				}),
			);
			const props = tool.function.parameters as {
				properties: Record<string, Record<string, unknown>>;
			};
			expect(props.properties.style.type).toBe("string");
			expect(props.properties.style.enum).toEqual(["minimal", "bold", "classic"]);
		});

		it("should map color fields with hex pattern", () => {
			const tool = schemaToTool(
				testSchema({
					fields: { accent: { type: "color", description: "Accent color" } },
				}),
			);
			const props = tool.function.parameters as {
				properties: Record<string, Record<string, unknown>>;
			};
			expect(props.properties.accent.type).toBe("string");
			expect(props.properties.accent.pattern).toMatch(/hex/i.test("") ? "" : "^#");
		});

		it("should map url fields with format", () => {
			const tool = schemaToTool(
				testSchema({
					fields: { link: { type: "url", description: "A URL" } },
				}),
			);
			const props = tool.function.parameters as {
				properties: Record<string, Record<string, unknown>>;
			};
			expect(props.properties.link.type).toBe("string");
			expect(props.properties.link.format).toBe("uri");
		});

		it("should map font fields with enum", () => {
			const tool = schemaToTool(
				testSchema({
					fields: {
						heading: {
							type: "font",
							description: "Heading font",
							options: ["Inter", "Georgia", "Merriweather"],
						},
					},
				}),
			);
			const props = tool.function.parameters as {
				properties: Record<string, Record<string, unknown>>;
			};
			expect(props.properties.heading.type).toBe("string");
			expect(props.properties.heading.enum).toEqual(["Inter", "Georgia", "Merriweather"]);
		});

		it("should map json fields to object", () => {
			const tool = schemaToTool(
				testSchema({
					fields: { data: { type: "json", description: "Arbitrary data" } },
				}),
			);
			const props = tool.function.parameters as {
				properties: Record<string, Record<string, unknown>>;
			};
			expect(props.properties.data.type).toBe("object");
		});
	});

	// ─── Read-Only Field Filtering ───────────────────────────────

	describe("read-only field filtering", () => {
		it("should skip read-only fields in writable domains", () => {
			const tool = schemaToTool(
				testSchema({
					fields: {
						writable: { type: "string", description: "Writable field" },
						locked: { type: "string", description: "Locked field", readonly: true },
					},
				}),
			);
			const props = tool.function.parameters as { properties: Record<string, unknown> };
			expect(props.properties.writable).toBeDefined();
			expect(props.properties.locked).toBeUndefined();
		});

		it("should include read-only fields in read-only domains (for querying)", () => {
			const tool = schemaToTool(
				testSchema({
					writeEndpoint: null,
					fields: {
						info: { type: "string", description: "Info field", readonly: true },
					},
				}),
			);
			const props = tool.function.parameters as { properties: Record<string, unknown> };
			expect(props.properties.info).toBeDefined();
		});
	});

	// ─── Structure ───────────────────────────────────────────────

	describe("tool structure", () => {
		it("should set additionalProperties to false", () => {
			const tool = schemaToTool(
				testSchema({
					fields: { name: { type: "string", description: "Name" } },
				}),
			);
			const params = tool.function.parameters as { additionalProperties: boolean };
			expect(params.additionalProperties).toBe(false);
		});

		it("should include domain description in tool description", () => {
			const tool = schemaToTool(
				testSchema({
					name: "My Domain",
					description: "Does cool things",
					fields: { name: { type: "string", description: "Name" } },
				}),
			);
			expect(tool.function.description).toContain("My Domain");
			expect(tool.function.description).toContain("Does cool things");
		});

		it("should always have type: function", () => {
			const tool = schemaToTool(
				testSchema({
					fields: { name: { type: "string", description: "Name" } },
				}),
			);
			expect(tool.type).toBe("function");
		});
	});
});

describe("schemasToTools", () => {
	it("should convert multiple schemas", () => {
		const schemas = getSchemas(["foliage.theme", "identity.profile"]);
		const tools = schemasToTools(schemas);
		expect(tools).toHaveLength(2);
		expect(tools.map((t) => t.function.name)).toContain("set_foliage_theme");
		expect(tools.map((t) => t.function.name)).toContain("set_identity_profile");
	});

	it("should return empty array for empty input", () => {
		expect(schemasToTools([])).toHaveLength(0);
	});
});
