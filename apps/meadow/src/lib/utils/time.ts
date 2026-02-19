/**
 * Meadow — Relative time formatting
 *
 * Converts Unix seconds to human-readable relative time strings.
 * Implemented directly (not imported from blogroll — that export
 * isn't in the engine's package.json map).
 */

/**
 * Format a Unix timestamp (seconds) as a relative time string.
 * Examples: "just now", "3m ago", "2h ago", "yesterday", "3d ago", "2w ago", "Jan 15"
 */
export function formatRelativeTime(unixSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - unixSeconds;

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return "yesterday";
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)}w ago`;

  // Older than ~30 days: show absolute date
  const date = new Date(unixSeconds * 1000);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}
