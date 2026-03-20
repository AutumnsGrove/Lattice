/**
 * Stripe Service Definition
 *
 * Actions: list_customers, get_customer, list_subscriptions, list_invoices, get_invoice
 * Auth: HTTP Basic (API key as username, empty password)
 *
 * Read-only — no write actions through Warden.
 * Stripe uses application/x-www-form-urlencoded for query params.
 */

import { z } from "zod";
import { registerService } from "./registry";
import type { ServiceAction } from "./registry";

const BASE_URL = "https://api.stripe.com/v1";

/** Stripe uses HTTP Basic auth: base64(secret_key:) — colon is intentional (empty password) */
const basicAuthHeaders = (secretKey: string) => ({
	Authorization: `Basic ${btoa(secretKey + ":")}`,
	"Content-Type": "application/x-www-form-urlencoded",
});

const actions: Record<string, ServiceAction> = {
	list_customers: {
		schema: z.object({
			limit: z.number().int().min(1).max(100).default(10),
			starting_after: z.string().optional(),
			ending_before: z.string().optional(),
			email: z.email().optional(),
		}),
		buildRequest: (params, key) => {
			const qs = new URLSearchParams();
			qs.set("limit", String(params.limit ?? 10));
			if (params.starting_after) qs.set("starting_after", String(params.starting_after));
			if (params.ending_before) qs.set("ending_before", String(params.ending_before));
			if (params.email) qs.set("email", String(params.email));
			return {
				url: `${BASE_URL}/customers?${qs}`,
				method: "GET",
				headers: basicAuthHeaders(key),
			};
		},
	},

	get_customer: {
		schema: z.object({
			customer_id: z.string(),
		}),
		buildRequest: (params, key) => ({
			url: `${BASE_URL}/customers/${params.customer_id}`,
			method: "GET",
			headers: basicAuthHeaders(key),
		}),
	},

	list_subscriptions: {
		schema: z.object({
			limit: z.number().int().min(1).max(100).default(10),
			customer: z.string().optional(),
			status: z
				.enum([
					"active",
					"past_due",
					"unpaid",
					"canceled",
					"incomplete",
					"incomplete_expired",
					"trialing",
					"all",
				])
				.default("all"),
			starting_after: z.string().optional(),
			ending_before: z.string().optional(),
		}),
		buildRequest: (params, key) => {
			const qs = new URLSearchParams();
			qs.set("limit", String(params.limit ?? 10));
			qs.set("status", String(params.status ?? "all"));
			if (params.customer) qs.set("customer", String(params.customer));
			if (params.starting_after) qs.set("starting_after", String(params.starting_after));
			if (params.ending_before) qs.set("ending_before", String(params.ending_before));
			return {
				url: `${BASE_URL}/subscriptions?${qs}`,
				method: "GET",
				headers: basicAuthHeaders(key),
			};
		},
	},

	list_invoices: {
		schema: z.object({
			limit: z.number().int().min(1).max(100).default(10),
			customer: z.string().optional(),
			subscription: z.string().optional(),
			status: z.enum(["draft", "open", "paid", "uncollectible", "void"]).optional(),
			starting_after: z.string().optional(),
			ending_before: z.string().optional(),
		}),
		buildRequest: (params, key) => {
			const qs = new URLSearchParams();
			qs.set("limit", String(params.limit ?? 10));
			if (params.customer) qs.set("customer", String(params.customer));
			if (params.subscription) qs.set("subscription", String(params.subscription));
			if (params.status) qs.set("status", String(params.status));
			if (params.starting_after) qs.set("starting_after", String(params.starting_after));
			if (params.ending_before) qs.set("ending_before", String(params.ending_before));
			return {
				url: `${BASE_URL}/invoices?${qs}`,
				method: "GET",
				headers: basicAuthHeaders(key),
			};
		},
	},

	get_invoice: {
		schema: z.object({
			invoice_id: z.string(),
		}),
		buildRequest: (params, key) => ({
			url: `${BASE_URL}/invoices/${params.invoice_id}`,
			method: "GET",
			headers: basicAuthHeaders(key),
		}),
	},
};

registerService({
	name: "stripe",
	baseUrl: BASE_URL,
	auth: { type: "bearer" },
	actions,
});
