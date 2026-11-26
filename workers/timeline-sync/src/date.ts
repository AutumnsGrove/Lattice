/**
 * Which day the nightly run asks for.
 *
 * The day is fetched in the tenant's own timezone (`generateDay` reads
 * `config.timezone`, and the GitHub window is that zone's midnight to midnight),
 * so the date the run asks for has to be a day that has already finished *in
 * that zone*. Asking for "yesterday in UTC" at 01:00 UTC was neither: it was 8 PM
 * the previous evening in New York, so the last four hours of the day were still
 * in progress, and because the summary row was written the next run skipped the
 * date — those commits never appeared (#1832).
 *
 * The cron now fires at 09:00 UTC, after every tenant's local day has ended
 * (latest local time at 09:00 UTC is 22:00 in NZDT), and each tenant's date is
 * computed in its own zone here.
 */

/** The calendar date `now` falls on in `timeZone`, as YYYY-MM-DD. */
function dateInZone(now: Date, timeZone: string): string {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(now);

	const part = (type: Intl.DateTimeFormatPartTypes): string =>
		parts.find((p) => p.type === type)?.value ?? "";

	return `${part("year")}-${part("month")}-${part("day")}`;
}

/**
 * The most recent day that has finished in `timeZone`, as YYYY-MM-DD.
 *
 * A missing or unrecognised zone falls back to UTC rather than throwing: a bad
 * value in one tenant's settings must not stop the whole nightly run. The
 * fallback is the old behaviour, so a tenant whose zone is wrong gets a late
 * page, not no page.
 *
 * The step back is calendar arithmetic on a UTC date, not `now - 86400000` in
 * the tenant's zone, because the former cannot land on a DST transition.
 */
export function yesterdayInZone(timeZone?: string | null, now: Date = new Date()): string {
	let today: string;
	try {
		today = dateInZone(now, timeZone?.trim() || "UTC");
	} catch {
		today = dateInZone(now, "UTC");
	}

	const [year, month, day] = today.split("-").map(Number);
	const previous = new Date(Date.UTC(year, month - 1, day));
	previous.setUTCDate(previous.getUTCDate() - 1);

	return previous.toISOString().slice(0, 10);
}
