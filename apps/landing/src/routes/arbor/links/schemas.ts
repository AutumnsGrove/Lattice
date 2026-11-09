/**
 * Short Links (Landing) - Validation Schemas
 *
 * Form shape only. Slug and target rules live in the engine's short-links
 * service so every surface enforces the same ones.
 */

import { z } from "zod";

export const CreateLinkSchema = z.object({
	target_url: z.string().trim().min(1, "Please enter where the link should go"),
	slug: z.string().trim().optional().default(""),
});

export const DisableLinkSchema = z.object({
	slug: z.string().trim().min(1, "Please choose a link to retire"),
});
