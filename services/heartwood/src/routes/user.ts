/**
 * User Routes - Profile management (avatar, etc.)
 *
 * Endpoints:
 * - POST /user/avatar - Update user's avatar URL
 * - DELETE /user/avatar - Remove user's avatar URL
 */

import { Hono } from "hono";
import type { Env } from "../types.js";
import { updateUserAvatar, updateUserPreferences } from "../db/queries.js";
import { getSessionFromRequest } from "../lib/session.js";
import { createDbSession } from "../db/session.js";
import type { SessionDO } from "../durables/SessionDO.js";
import { validateSession as validateBetterAuthSession } from "../lib/server/session.js";

const user = new Hono<{ Bindings: Env }>();

/**
 * Resolve the authenticated user ID from the request.
 * Tries SessionDO first, then Better Auth.
 */
async function resolveUserId(req: Request, env: Env): Promise<string | null> {
	// Try SessionDO
	const parsedSession = await getSessionFromRequest(req, env.SESSION_SECRET);
	if (parsedSession) {
		const sessionDO = env.SESSIONS.get(
			env.SESSIONS.idFromName(`session:${parsedSession.userId}`),
		) as DurableObjectStub<SessionDO>;
		const result = await sessionDO.validateSession(parsedSession.sessionId);
		if (result.valid) return parsedSession.userId;
	}

	// Try Better Auth
	const betterAuthUser = await validateBetterAuthSession(req, env);
	if (betterAuthUser) return betterAuthUser.id;

	return null;
}

/**
 * POST /user/avatar
 * Update the authenticated user's avatar URL.
 * Called by Aspen after uploading to R2.
 */
user.post("/avatar", async (c) => {
	const userId = await resolveUserId(c.req.raw, c.env);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	let avatarUrl: string;
	try {
		const body = await c.req.json<{ avatarUrl: string }>();
		avatarUrl = body.avatarUrl;
	} catch {
		return c.json({ error: "Invalid request body" }, 400);
	}

	if (!avatarUrl || typeof avatarUrl !== "string") {
		return c.json({ error: "avatarUrl is required" }, 400);
	}

	// Only allow cdn.grove.place URLs (prevent arbitrary URL injection)
	if (!avatarUrl.startsWith("https://cdn.grove.place/")) {
		return c.json({ error: "Invalid avatar URL" }, 400);
	}

	const db = createDbSession(c.env);
	await updateUserAvatar(db, userId, avatarUrl);

	return c.json({ success: true });
});

/**
 * DELETE /user/avatar
 * Remove the authenticated user's avatar URL.
 * Called by Aspen after deleting from R2.
 */
user.delete("/avatar", async (c) => {
	const userId = await resolveUserId(c.req.raw, c.env);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const db = createDbSession(c.env);
	await updateUserAvatar(db, userId, null);

	return c.json({ success: true });
});

/**
 * PUT /user/preferences
 * Update the authenticated user's preferences (theme, grove mode, season).
 */
user.put("/preferences", async (c) => {
	const userId = await resolveUserId(c.req.raw, c.env);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	let body: Record<string, unknown>;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid request body" }, 400);
	}

	// Validate values
	const validThemes = ["light", "dark", "system"];
	const validSeasons = ["spring", "summer", "autumn", "winter", "midnight"];

	const preferences: {
		theme?: string | null;
		grove_mode?: boolean | null;
		season?: string | null;
	} = {};

	if ("theme" in body) {
		if (body.theme !== null && !validThemes.includes(body.theme as string)) {
			return c.json({ error: "Invalid theme value" }, 400);
		}
		preferences.theme = body.theme as string | null;
	}

	if ("groveMode" in body) {
		if (body.groveMode !== null && typeof body.groveMode !== "boolean") {
			return c.json({ error: "Invalid groveMode value" }, 400);
		}
		preferences.grove_mode = body.groveMode as boolean | null;
	}

	if ("season" in body) {
		if (body.season !== null && !validSeasons.includes(body.season as string)) {
			return c.json({ error: "Invalid season value" }, 400);
		}
		preferences.season = body.season as string | null;
	}

	if (Object.keys(preferences).length === 0) {
		return c.json({ error: "No valid preferences provided" }, 400);
	}

	const db = createDbSession(c.env);
	await updateUserPreferences(db, userId, preferences);

	return c.json({ success: true });
});

export default user;
