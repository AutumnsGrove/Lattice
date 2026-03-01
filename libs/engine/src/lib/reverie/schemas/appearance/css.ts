import type { DomainSchema } from "../../types";

/**
 * Custom CSS — the escape hatch for pixel-perfect control.
 * Reverie can generate safe CSS snippets from natural language.
 */
export const cssSchema: DomainSchema = {
	id: "foliage.css",
	name: "Custom CSS",
	description:
		"Raw CSS injection for advanced customization. Sanitized against XSS. Reverie generates snippets from natural language descriptions.",
	group: "appearance",
	database: "engine",
	readEndpoint: "GET /api/admin/theme",
	writeEndpoint: "PUT /api/admin/theme",
	writeMethod: "PUT",
	fields: {
		customCss: {
			type: "string",
			description:
				"CSS string applied site-wide. Blocked: url(), @import, expression(), javascript:, -moz-binding, behavior().",
			constraints: {
				maxLength: 10000,
			},
		},
	},
	examples: [
		"Add a subtle glow to my post titles",
		"Make the sidebar slightly transparent",
		"Round all my image corners",
		"Add a border around code blocks",
		"Remove the underline from links",
	],
	keywords: ["css", "custom css", "style", "styling", "glow", "border", "shadow", "opacity"],
};

/**
 * CSS patterns that are BLOCKED for security.
 * The executor must validate CSS against these before applying.
 */
export const CSS_BLOCKED_PATTERNS = [
	"url(",
	"@import",
	"expression(",
	"javascript:",
	"-moz-binding",
	"behavior(",
] as const;
