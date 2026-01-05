/**
 * Utility for merging class names
 * Simple implementation - combines classes and removes duplicates
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
	return classes.filter(Boolean).join(' ');
}
