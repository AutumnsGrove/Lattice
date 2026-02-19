/**
 * API: Save Profile
 *
 * POST /api/save-profile
 *
 * JSON API endpoint for saving profile during onboarding.
 * Bypasses SvelteKit form actions to avoid grove-router POST proxy issues.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { PLANT_ERRORS, logPlantError } from "$lib/errors";

const USERNAME_REGEX = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
  // Parse JSON body
  let body: {
    displayName?: string;
    username?: string;
    favoriteColor?: string | null;
    interests?: string[];
  };

  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request" }, { status: 400 });
  }

  const displayName = body.displayName?.trim();
  const username = body.username?.toLowerCase().trim();
  const favoriteColor = body.favoriteColor || null;
  const interests = Array.isArray(body.interests) ? body.interests : [];

  // Validate required fields
  if (!displayName) {
    return json({ error: "Display name is required" }, { status: 400 });
  }

  if (!username) {
    return json({ error: "Username is required" }, { status: 400 });
  }

  if (!USERNAME_REGEX.test(username)) {
    return json({ error: "Invalid username format" }, { status: 400 });
  }

  if (username.length < 3 || username.length > 30) {
    return json({ error: "Username must be 3-30 characters" }, { status: 400 });
  }

  // Get onboarding ID from cookie
  const onboardingId = cookies.get("onboarding_id");
  if (!onboardingId) {
    logPlantError(PLANT_ERRORS.COOKIE_ERROR, {
      path: "/api/save-profile",
      detail: "Missing onboarding_id cookie",
    });
    return json(
      { error: "Session expired. Please sign in again." },
      { status: 401 },
    );
  }

  const db = platform?.env?.DB;
  if (!db) {
    logPlantError(PLANT_ERRORS.DB_UNAVAILABLE, { path: "/api/save-profile" });
    return json({ error: "Service temporarily unavailable" }, { status: 503 });
  }

  // Double-check username availability
  try {
    const reserved = await db
      .prepare("SELECT username FROM reserved_usernames WHERE username = ?")
      .bind(username)
      .first();

    if (reserved) {
      return json({ error: "This username is reserved" }, { status: 400 });
    }
  } catch (err) {
    logPlantError(PLANT_ERRORS.ONBOARDING_QUERY_FAILED, {
      path: "/api/save-profile",
      detail: "SELECT reserved_usernames failed",
      cause: err,
    });
    return json({ error: "Unable to check username" }, { status: 500 });
  }

  try {
    const existingTenant = await db
      .prepare("SELECT subdomain FROM tenants WHERE subdomain = ?")
      .bind(username)
      .first();

    if (existingTenant) {
      return json({ error: "This username is already taken" }, { status: 400 });
    }
  } catch (err) {
    logPlantError(PLANT_ERRORS.TENANT_QUERY_FAILED, {
      path: "/api/save-profile",
      detail: "SELECT tenants for username check failed",
      cause: err,
    });
    return json({ error: "Unable to check username" }, { status: 500 });
  }

  // Update onboarding record
  try {
    await db
      .prepare(
        `UPDATE user_onboarding
         SET display_name = ?,
             username = ?,
             favorite_color = ?,
             interests = ?,
             profile_completed_at = unixepoch(),
             updated_at = unixepoch()
         WHERE id = ?`,
      )
      .bind(
        displayName,
        username,
        favoriteColor,
        JSON.stringify(interests),
        onboardingId,
      )
      .run();
  } catch (err) {
    logPlantError(PLANT_ERRORS.ONBOARDING_UPDATE_FAILED, {
      path: "/api/save-profile",
      detail: `UPDATE user_onboarding for id=${onboardingId}`,
      cause: err,
    });
    return json(
      { error: "Unable to save profile. Please try again." },
      { status: 500 },
    );
  }

  // Log success with email_verified status for debugging
  try {
    const record = await db
      .prepare("SELECT email_verified FROM user_onboarding WHERE id = ?")
      .bind(onboardingId)
      .first<{ email_verified: number | null }>();

    console.log(
      `[Profile API] Saved profile for ${onboardingId.slice(0, 8)}... ` +
        `username=${username}, email_verified=${record?.email_verified}`,
    );
  } catch {
    // Non-critical diagnostic
  }

  return json({ success: true, redirect: "/plans" });
};
