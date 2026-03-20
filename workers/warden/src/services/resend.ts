/**
 * Resend Service Definition
 *
 * Actions: send_email
 * Auth: Bearer token
 *
 * Domain restriction: only allows sending from @grove.place addresses.
 */

import { z } from "zod";
import { registerService } from "./registry";
import type { ServiceAction } from "./registry";

const BASE_URL = "https://api.resend.com";

/** Only allow sending from @grove.place domain */
const groveEmailSchema = z.email().refine((email) => email.endsWith("@grove.place"), {
	message: "Warden only permits sending from @grove.place addresses",
});

const actions: Record<string, ServiceAction> = {
	send_email: {
		schema: z.object({
			from: groveEmailSchema,
			to: z.union([z.email(), z.array(z.email())]),
			subject: z.string(),
			html: z.string().optional(),
			text: z.string().optional(),
			reply_to: z.email().optional(),
			cc: z.union([z.email(), z.array(z.email())]).optional(),
			bcc: z.union([z.email(), z.array(z.email())]).optional(),
			tags: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
		}),
		buildRequest: (params, token) => ({
			url: `${BASE_URL}/emails`,
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(params),
		}),
	},
};

registerService({
	name: "resend",
	baseUrl: BASE_URL,
	auth: { type: "bearer" },
	actions,
});
