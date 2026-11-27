import { expect, test } from "@playwright/test";

/**
 * One browser, one journey, the real local stack.
 *
 * seed a tenant → open a demo session → write a bloom → publish it →
 * read it as a stranger → assert the words appear.
 *
 * Resist adding to it. If this passes, the pieces fit; if it fails, something in
 * the chain is broken and no amount of unit coverage will say so.
 */

const TENANT = "midnight-bloom";

/** Same slug rule the API applies to a generated slug. */
function slugify(title: string): string {
	return title
		.toLowerCase()
		.replace(/[^a-z0-9-]/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
}

test("a writer publishes a bloom and a stranger can read it", async ({ page, browser }) => {
	const demoSecret = process.env.DEMO_MODE_SECRET ?? "e2e-demo-secret";
	const stamp = Date.now();
	const title = `E2E Bloom ${stamp}`;
	const body = `Words written by the browser at ${stamp}.`;
	const slug = slugify(title);

	// Open a demo session: hooks trades the query parameter for a cookie, so the
	// rest of the journey is authenticated without an OAuth callback.
	await page.goto(`/arbor?demo=${demoSecret}&subdomain=${TENANT}`);
	await expect(page).toHaveURL(/\/arbor/);

	// Write it.
	await page.goto(`/arbor/garden/new?subdomain=${TENANT}`);
	await page.getByLabel("Post title").fill(title);
	await page.getByLabel("Markdown editor content").fill(body);
	await page.getByRole("button", { name: "Publish" }).click();

	// Publishing navigates back to the garden listing, which proves the save and
	// the publish both landed rather than just closing the dialog.
	await page.waitForURL(/\/arbor\/garden(?!\/new)/, { timeout: 30_000 });

	// Read it as a stranger: a fresh context with no cookies at all.
	const strangerContext = await browser.newContext();
	const stranger = await strangerContext.newPage();
	const response = await stranger.goto(`/garden/${slug}?subdomain=${TENANT}`);

	expect(response?.status()).toBe(200);
	await expect(stranger.getByText(body)).toBeVisible();
	await expect(stranger).toHaveTitle(new RegExp(title));

	await strangerContext.close();
});
