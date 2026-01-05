/**
 * Date formatting utilities for consistent date display across the app
 */

/**
 * Check if a date is valid
 */
function isValidDate(date: Date): boolean {
	return !isNaN(date.getTime());
}

/**
 * Format a timestamp for incident timelines
 * Example: "Jan 5, 3:45 PM"
 */
export function formatTime(timestamp: string): string {
	const date = new Date(timestamp);
	if (!isValidDate(date)) return 'Unknown time';

	return date.toLocaleString('en-US', {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit'
	});
}

/**
 * Format a date for grouping incidents by day
 * Example: "January 5, 2026"
 */
export function formatDateFull(timestamp: string): string {
	const date = new Date(timestamp);
	if (!isValidDate(date)) return 'Unknown date';

	return date.toLocaleDateString('en-US', {
		month: 'long',
		day: 'numeric',
		year: 'numeric'
	});
}

/**
 * Format a date for uptime bar tooltips
 * Example: "Sun, Jan 5"
 */
export function formatDateShort(dateStr: string): string {
	const date = new Date(dateStr);
	if (!isValidDate(date)) return 'Unknown';

	return date.toLocaleDateString('en-US', {
		weekday: 'short',
		month: 'short',
		day: 'numeric'
	});
}

/**
 * Format a relative time for "last updated" displays
 * Example: "Just now", "5 minutes ago", "2 hours ago"
 */
export function formatRelativeTime(timestamp: string): string {
	const date = new Date(timestamp);
	if (!isValidDate(date)) return 'Unknown';

	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);

	if (diffMins < 1) return 'Just now';
	if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;

	const diffHours = Math.floor(diffMins / 60);
	if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

	// Fall back to formatted date for older timestamps
	return formatTime(timestamp);
}

/**
 * Calculate and format a duration between two timestamps
 * Example: "45 min", "2h 30m", "1d 4h"
 */
export function formatDuration(startTimestamp: string, endTimestamp?: string | null): string {
	const start = new Date(startTimestamp);
	if (!isValidDate(start)) return 'Unknown';

	const end = endTimestamp ? new Date(endTimestamp) : new Date();
	if (!isValidDate(end)) return 'Unknown';

	const diffMs = end.getTime() - start.getTime();
	const diffMins = Math.floor(diffMs / 60000);

	if (diffMins < 60) return `${diffMins} min`;

	const diffHours = Math.floor(diffMins / 60);
	if (diffHours < 24) return `${diffHours}h ${diffMins % 60}m`;

	const diffDays = Math.floor(diffHours / 24);
	return `${diffDays}d ${diffHours % 24}h`;
}
