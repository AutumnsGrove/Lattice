import type { DomainSchema } from "../../types";

/**
 * Billing — read-only view of your subscription and usage.
 * Reverie can tell you what tier you're on, but can't change it.
 */
export const billingSchema: DomainSchema = {
	id: "infra.billing",
	name: "Billing & Subscription",
	description:
		"Read-only view of your subscription tier, usage, and billing status. Cannot modify billing through Reverie.",
	group: "infra",
	database: "engine",
	readEndpoint: "GET /api/admin/billing",
	writeEndpoint: null,
	writeMethod: "PUT",
	fields: {
		tier: {
			type: "enum",
			description: "Your current subscription tier",
			options: ["wanderer", "seedling", "sapling", "oak", "evergreen"],
			readonly: true,
		},
		billingCycle: {
			type: "enum",
			description: "Monthly or annual billing",
			options: ["monthly", "annual"],
			readonly: true,
		},
		storageUsedMb: {
			type: "integer",
			description: "Storage used in megabytes",
			readonly: true,
		},
		storageLimitMb: {
			type: "integer",
			description: "Storage limit for your tier in megabytes",
			readonly: true,
		},
		renewalDate: {
			type: "string",
			description: "Next billing renewal date (ISO 8601)",
			readonly: true,
		},
	},
	examples: [
		"What tier am I on?",
		"How much storage am I using?",
		"When does my subscription renew?",
		"Am I on annual billing?",
	],
	keywords: ["billing", "subscription", "tier", "plan", "storage", "usage", "payment"],
};
