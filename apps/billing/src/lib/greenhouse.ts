/**
 * Greenhouse Mode — Server-side helpers
 *
 * Mock data and utilities for the billing hub's dev/test mode.
 * When greenhouse mode is active (via cookie), these replace
 * real billing-api calls with realistic test data.
 *
 * Cookie: "grove_greenhouse=1"
 * Guard: Only active when import.meta.env.DEV or GREENHOUSE_ENABLED env var is set.
 */

import type { Cookies } from "@sveltejs/kit";

/** Check if greenhouse mode is active for this request. */
export function isGreenhouseMode(cookies: Cookies, platform?: App.Platform): boolean {
	const cookie = cookies.get("grove_greenhouse");
	if (cookie !== "1") return false;

	// Only allow in dev or when explicitly enabled in environment
	if (import.meta.env.DEV) return true;
	if (platform?.env && platform.env.GREENHOUSE_ENABLED === "true") return true;

	return false;
}

/**
 * Check if the greenhouse subscription has been "cancelled".
 * This cookie simulates the D1 state that billing-api would manage.
 */
export function isGreenhouseCancelled(cookies: Cookies): boolean {
	return cookies.get("grove_greenhouse_billing") === "cancelled";
}

/** Mark the greenhouse subscription as cancelled. */
export function setGreenhouseCancelled(cookies: Cookies): void {
	cookies.set("grove_greenhouse_billing", "cancelled", {
		path: "/",
		secure: true,
		httpOnly: true,
		sameSite: "lax",
	});
}

/** Clear the greenhouse cancellation (resume). */
export function clearGreenhouseCancelled(cookies: Cookies): void {
	cookies.delete("grove_greenhouse_billing", { path: "/" });
}

/** Mock tenant/user IDs for greenhouse mode. */
export const GREENHOUSE_AUTH = {
	tenantId: "greenhouse-tenant-001",
	userId: "greenhouse-user-001",
} as const;

/** Mock billing status — an active Sapling subscription. */
export const GREENHOUSE_STATUS = {
	plan: "sapling",
	status: "active",
	flourishState: "active",
	currentPeriodEnd: _futureDate(30),
	cancelAtPeriodEnd: false,
	isComped: false,
	paymentMethod: { last4: "4242", brand: "visa" },
} as const;

/** Mock billing status — a subscription scheduled for cancellation. */
export const GREENHOUSE_STATUS_CANCELLING = {
	...GREENHOUSE_STATUS,
	cancelAtPeriodEnd: true,
} as const;

/** Helper: ISO date string N days from now. */
function _futureDate(days: number): string {
	return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}
