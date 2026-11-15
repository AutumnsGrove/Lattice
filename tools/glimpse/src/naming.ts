/**
 * Output naming, ported from the Python glimpse so existing capture paths and
 * muscle memory keep working.
 *
 *   https://plant.grove.place/blog + autumn + dark
 *     → plant-grove-place-blog-autumn-dark.png
 */

/** Turn a URL into a filename-safe slug: host + path, dashes for everything else. */
export function urlToSlug(url: string): string {
	let raw = url;
	try {
		const parsed = new URL(url);
		raw = `${parsed.host}${parsed.pathname}`;
	} catch {
		// Not an absolute URL (a name label, or a bare path) — slug it as-is.
	}

	const slug = raw
		.replace(/:\d+/g, "")
		.replace(/[^a-zA-Z0-9]+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");

	return slug.toLowerCase() || "capture";
}

export interface NameOptions {
	season?: string | null;
	theme?: string | null;
	selector?: string | null;
	device?: string | null;
	viewport?: { width: number; height: number } | null;
	name?: string | null;
	ext?: string;
}

/** Build a descriptive filename from the capture parameters. */
export function generateFilename(url: string, opts: NameOptions = {}): string {
	const parts = [opts.name ? urlToSlug(opts.name) : urlToSlug(url)];

	if (opts.season) parts.push(opts.season.toLowerCase());
	if (opts.theme) parts.push(opts.theme.toLowerCase());
	if (opts.selector) parts.push(urlToSlug(opts.selector));
	// Device and viewport change what you see, so they belong in the name —
	// otherwise a mobile shot silently overwrites the desktop one.
	if (opts.device) parts.push(urlToSlug(opts.device));
	if (opts.viewport) parts.push(`${opts.viewport.width}x${opts.viewport.height}`);

	return `${parts.join("-")}.${opts.ext ?? "png"}`;
}
