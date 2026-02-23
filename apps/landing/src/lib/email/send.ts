import { ZephyrClient } from "@autumnsgrove/lattice/zephyr";
import { getWelcomeEmailHtml, getWelcomeEmailText } from "./templates";
import { generateUnsubscribeUrl } from "./tokens";

const DEFAULT_ZEPHYR_URL = "https://grove-zephyr.m7jv4v7npb.workers.dev";

export async function sendWelcomeEmail(
	toEmail: string,
	zephyrApiKey: string,
	zephyrUrl?: string,
	/** Secret for unsubscribe token (if not provided, uses zephyrApiKey) */
	unsubscribeSecret?: string,
	/** Service binding for direct Worker-to-Worker routing (preferred over HTTP) */
	zephyrBinding?: Fetcher,
): Promise<{ success: boolean; error?: string }> {
	const zephyr = new ZephyrClient({
		baseUrl: zephyrUrl || DEFAULT_ZEPHYR_URL,
		apiKey: zephyrApiKey,
		fetcher: zephyrBinding,
	});

	// Generate unsubscribe URL for this recipient
	// Uses a dedicated secret or falls back to the API key
	const secret = unsubscribeSecret || zephyrApiKey;
	const unsubscribeUrl = await generateUnsubscribeUrl(toEmail, secret);

	const result = await zephyr.send({
		type: "sequence",
		template: "raw",
		to: toEmail,
		subject: "Welcome to Grove 🌿",
		html: getWelcomeEmailHtml(unsubscribeUrl),
		text: getWelcomeEmailText(unsubscribeUrl),
		headers: {
			"List-Unsubscribe": `<${unsubscribeUrl}>`,
			"List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
		},
	});

	if (!result.success) {
		console.error("Zephyr error:", result.errorMessage);
		return { success: false, error: result.errorMessage };
	}

	return { success: true };
}
