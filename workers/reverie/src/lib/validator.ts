/**
 * Reverie Validator — Tool Call Validation
 *
 * Parses tool call arguments, validates against domain schema constraints,
 * rejects writes to read-only domains, and builds preview entries.
 */

import type { LumenToolCall } from "@autumnsgrove/lattice/lumen";
import { SCHEMA_REGISTRY } from "@autumnsgrove/lattice/reverie";
import type { DomainId, DomainSchema, FieldDefinition } from "@autumnsgrove/lattice/reverie";
import type { ChangePreview } from "../types";
import { safeParseJson } from "@autumnsgrove/lattice/utils";

// =============================================================================
// Types
// =============================================================================

export interface ValidationResult {
	valid: boolean;
	changes: ChangePreview[];
	errors: ValidationError[];
}

export interface ValidationError {
	toolCall: string;
	field?: string;
	message: string;
}

// =============================================================================
// Validator
// =============================================================================

/**
 * Validate tool calls against domain schemas.
 * Returns validated change previews and any errors.
 */
export function validateToolCalls(toolCalls: LumenToolCall[]): ValidationResult {
	const changes: ChangePreview[] = [];
	const errors: ValidationError[] = [];

	for (const tc of toolCalls) {
		const toolName = tc.function.name;

		// Parse the domain ID from the tool name
		// "set_foliage_accent" → "foliage.accent"
		// "query_infra_billing" → "infra.billing"
		const isQuery = toolName.startsWith("query_");
		const stripped = toolName.replace(/^(set|query)_/, "");
		// Domain IDs use dots (e.g., "foliage.accent"), tool names use underscores.
		// Only the first underscore is the namespace separator — the rest are part of the domain name.
		const sepIndex = stripped.indexOf("_");
		const domainStr =
			sepIndex === -1 ? stripped : `${stripped.slice(0, sepIndex)}.${stripped.slice(sepIndex + 1)}`;

		const domainId = domainStr as DomainId;
		const schema = SCHEMA_REGISTRY[domainId];

		if (!schema) {
			errors.push({
				toolCall: toolName,
				message: `Unknown domain: ${domainStr}`,
			});
			continue;
		}

		// Reject writes to read-only domains
		if (!isQuery && schema.writeEndpoint === null) {
			errors.push({
				toolCall: toolName,
				message: `Domain ${schema.name} is read-only`,
			});
			continue;
		}

		// Parse arguments
		const args = safeParseJson<Record<string, unknown> | null>(tc.function.arguments, null);
		if (!args) {
			errors.push({
				toolCall: toolName,
				message: "Invalid JSON in tool call arguments",
			});
			continue;
		}

		// Validate each field
		for (const [fieldName, value] of Object.entries(args)) {
			const fieldDef = schema.fields[fieldName];

			if (!fieldDef) {
				errors.push({
					toolCall: toolName,
					field: fieldName,
					message: `Unknown field: ${fieldName}`,
				});
				continue;
			}

			// Skip read-only fields for set_ calls
			if (!isQuery && fieldDef.readonly) {
				errors.push({
					toolCall: toolName,
					field: fieldName,
					message: `Field ${fieldName} is read-only`,
				});
				continue;
			}

			const fieldError = validateFieldValue(fieldName, value, fieldDef);
			if (fieldError) {
				errors.push({
					toolCall: toolName,
					field: fieldName,
					message: fieldError,
				});
				continue;
			}

			// Build preview entry
			changes.push({
				domain: domainId,
				field: fieldName,
				from: null, // Current value unknown until execution
				to: value,
				description: `${isQuery ? "Query" : "Set"} ${schema.name} → ${fieldDef.description}`,
			});
		}
	}

	return {
		valid: errors.length === 0,
		changes,
		errors,
	};
}

// =============================================================================
// Field Validation
// =============================================================================

/** Precompiled hex color regex — avoids re-compilation per validation call */
const HEX_COLOR_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

function validateFieldValue(
	fieldName: string,
	value: unknown,
	field: FieldDefinition,
): string | null {
	switch (field.type) {
		case "string":
		case "url":
			if (typeof value !== "string") return `${fieldName} must be a string`;
			if (field.constraints?.maxLength && value.length > field.constraints.maxLength) {
				return `${fieldName} exceeds max length of ${field.constraints.maxLength}`;
			}
			if (field.constraints?.pattern) {
				try {
					const regex = new RegExp(field.constraints.pattern);
					if (!regex.test(value)) return `${fieldName} does not match required pattern`;
				} catch {
					// Malformed pattern in schema — skip rather than throw
					return `${fieldName} has an invalid validation pattern`;
				}
			}
			break;

		case "boolean":
			if (typeof value !== "boolean") return `${fieldName} must be a boolean`;
			break;

		case "integer":
			if (typeof value !== "number" || !Number.isInteger(value)) {
				return `${fieldName} must be an integer`;
			}
			if (field.constraints?.min !== undefined && value < field.constraints.min) {
				return `${fieldName} must be at least ${field.constraints.min}`;
			}
			if (field.constraints?.max !== undefined && value > field.constraints.max) {
				return `${fieldName} must be at most ${field.constraints.max}`;
			}
			break;

		case "enum":
		case "font":
			if (typeof value !== "string") return `${fieldName} must be a string`;
			if (field.options && !field.options.includes(value)) {
				return `${fieldName} must be one of: ${field.options.join(", ")}`;
			}
			break;

		case "color":
			if (typeof value !== "string") return `${fieldName} must be a string`;
			if (!HEX_COLOR_RE.test(value)) {
				return `${fieldName} must be a valid hex color (e.g., #ff5500)`;
			}
			break;

		case "json":
			if (typeof value !== "object" || value === null) {
				return `${fieldName} must be an object`;
			}
			break;
	}

	return null;
}
