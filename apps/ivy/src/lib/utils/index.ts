/**
 * Shared Utilities
 */

/**
 * Constant-time string comparison (timing attack prevention)
 */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
	if (a.length !== b.length) return false;
	let result = 0;
	for (let i = 0; i < a.length; i++) {
		result |= a[i] ^ b[i];
	}
	return result === 0;
}

/**
 * Hash IP address for privacy-preserving rate limiting
 */
export async function hashIp(ip: string, salt: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(ip + salt);
	const hash = await crypto.subtle.digest("SHA-256", data);
	return Array.from(new Uint8Array(hash))
		.slice(0, 8)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
	return crypto.randomUUID();
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
	const now = new Date();
	const diff = now.getTime() - date.getTime();

	// Today: show time
	if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
		return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	}

	// This year: show month and day
	if (date.getFullYear() === now.getFullYear()) {
		return date.toLocaleDateString([], { month: "short", day: "numeric" });
	}

	// Older: show full date
	return date.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
}
