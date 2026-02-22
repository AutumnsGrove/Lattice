/**
 * Utility Functions
 *
 * Helper functions used throughout the backup system.
 */

/**
 * Format SQL value for INSERT statements
 * Handles NULL, numbers, booleans, binary data, and strings
 */
export function formatSqlValue(value: unknown): string {
	if (value === null) return "NULL";
	if (typeof value === "number") return value.toString();
	if (typeof value === "boolean") return value ? "1" : "0";
	if (value instanceof Uint8Array) {
		// Convert Uint8Array to hex string without Node.js Buffer
		const hex = Array.from(value)
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");
		return `X'${hex}'`;
	}
	// Escape single quotes for strings
	return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * Format bytes to human-readable string
 * Example: 1024 → "1.0 KB"
 */
export function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Generate a UUID v4
 * Simple implementation for job IDs
 */
export function generateJobId(): string {
	return crypto.randomUUID();
}

/**
 * Get current Unix timestamp
 */
export function getUnixTimestamp(): number {
	return Math.floor(Date.now() / 1000);
}

/**
 * Format date as YYYY-MM-DD
 */
export function formatDate(date: Date): string {
	return date.toISOString().split("T")[0];
}

/**
 * Calculate expiration timestamp based on retention weeks
 */
export function calculateExpirationTimestamp(retentionWeeks: number): number {
	const now = Date.now();
	const retentionMs = retentionWeeks * 7 * 24 * 60 * 60 * 1000;
	return Math.floor((now + retentionMs) / 1000);
}
