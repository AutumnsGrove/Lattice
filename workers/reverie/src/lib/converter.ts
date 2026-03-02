/**
 * Reverie Converter — Schema to Tool Definition
 *
 * Converts Reverie DomainSchema field definitions into LumenToolDefinition
 * objects that the model can call. Each writable domain becomes a "set_" tool;
 * read-only domains become "query_" tools.
 *
 * Field type mapping:
 *   string  → { type: "string" }
 *   boolean → { type: "boolean" }
 *   integer → { type: "integer" }
 *   enum    → { type: "string", enum: [...] }
 *   color   → { type: "string", pattern: hex regex }
 *   url     → { type: "string", format: "uri" }
 *   font    → { type: "string", enum: [...] }
 *   json    → { type: "object" }
 */

import type { DomainSchema, FieldDefinition } from "@autumnsgrove/lattice/reverie";
import type { LumenToolDefinition } from "@autumnsgrove/lattice/lumen";

// =============================================================================
// Converter
// =============================================================================

/**
 * Convert a domain schema into a LumenToolDefinition.
 * Writable domains get a "set_" prefix; read-only get "query_".
 */
export function schemaToTool(schema: DomainSchema): LumenToolDefinition {
	const isReadOnly = schema.writeEndpoint === null;
	const prefix = isReadOnly ? "query" : "set";

	// Build tool name: "foliage.accent" → "set_foliage_accent"
	const toolName = `${prefix}_${schema.id.replace(/\./g, "_")}`;

	// Build JSON Schema properties from field definitions
	const properties: Record<string, Record<string, unknown>> = {};
	const required: string[] = [];

	for (const [fieldName, field] of Object.entries(schema.fields)) {
		// Skip read-only fields for set_ tools
		if (!isReadOnly && field.readonly) continue;

		properties[fieldName] = fieldToJsonSchema(field);

		// For set_ tools, no fields are strictly required (partial updates)
		// For query_ tools, no fields are required either (query all or specific)
	}

	return {
		type: "function",
		function: {
			name: toolName,
			description: `${isReadOnly ? "Query" : "Configure"} ${schema.name}: ${schema.description}`,
			parameters: {
				type: "object",
				properties,
				...(required.length > 0 && { required }),
				additionalProperties: false,
			},
		},
	};
}

/**
 * Convert multiple schemas into tool definitions.
 */
export function schemasToTools(schemas: DomainSchema[]): LumenToolDefinition[] {
	return schemas.map(schemaToTool);
}

// =============================================================================
// Field Type Mapping
// =============================================================================

function fieldToJsonSchema(field: FieldDefinition): Record<string, unknown> {
	const schema: Record<string, unknown> = {
		description: field.description,
	};

	switch (field.type) {
		case "string":
			schema.type = "string";
			if (field.constraints?.maxLength) {
				schema.maxLength = field.constraints.maxLength;
			}
			if (field.constraints?.pattern) {
				schema.pattern = field.constraints.pattern;
			}
			break;

		case "boolean":
			schema.type = "boolean";
			break;

		case "integer":
			schema.type = "integer";
			if (field.constraints?.min !== undefined) {
				schema.minimum = field.constraints.min;
			}
			if (field.constraints?.max !== undefined) {
				schema.maximum = field.constraints.max;
			}
			break;

		case "enum":
			schema.type = "string";
			if (field.options) {
				schema.enum = [...field.options];
			}
			break;

		case "color":
			schema.type = "string";
			schema.pattern = "^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$";
			break;

		case "url":
			schema.type = "string";
			schema.format = "uri";
			break;

		case "font":
			schema.type = "string";
			if (field.options) {
				schema.enum = [...field.options];
			}
			break;

		case "json":
			schema.type = "object";
			break;

		default:
			schema.type = "string";
	}

	return schema;
}
