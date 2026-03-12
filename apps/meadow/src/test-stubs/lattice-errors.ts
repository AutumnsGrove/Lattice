/**
 * Test stub for @autumnsgrove/lattice/errors
 *
 * Provides the GroveErrorDef type without the engine dependency chain.
 */

export interface GroveErrorDef {
	code: string;
	category: "user" | "bug" | "infra";
	userMessage: string;
	adminMessage: string;
}
