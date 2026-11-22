import type { GroveErrorDef } from "@autumnsgrove/grove-errors";

export const CURIO_ERRORS = {
	SECRETS_MANAGER_FAILED: {
		code: "CURIO-TL-001",
		category: "admin",
		userMessage: "Unable to load your API keys. Please try again.",
		adminMessage: "SecretsManager.get failed — check GROVE_KEK and the tenant DEK",
	},
} as const satisfies Record<string, GroveErrorDef>;
