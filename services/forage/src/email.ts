/**
 * Email integration via Zephyr service binding
 *
 * Terminal-aesthetic email templates for domain search results and follow-up quizzes.
 * Sends through Grove's Zephyr email worker (Worker-to-Worker, no public API key needed).
 */

import type { DomainResult, ResultsEmailData, FollowupEmailData } from "./types";

/**
 * Send an email via Zephyr service binding
 */
export async function sendEmail(
	zephyr: Fetcher,
	apiKey: string,
	to: string,
	subject: string,
	html: string,
	from: string = "domains@grove.place",
	fromName: string = "Grove Domain Search",
): Promise<{ success: boolean; messageId?: string }> {
	const response = await zephyr.fetch("https://zephyr.internal/send", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-API-Key": apiKey,
		},
		body: JSON.stringify({
			type: "transactional",
			template: "raw",
			to,
			subject,
			html,
			from,
			fromName,
			source: "forage",
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Zephyr send error: ${error}`);
	}

	return response.json();
}

/**
 * Generate results email with terminal aesthetic
 */
export function generateResultsEmail(data: ResultsEmailData): string {
	const { business_name, domains, results_url, booking_url } = data;

	// Group domains by pricing category
	const bundled = domains.filter((d) => (d.price_cents ?? 0) <= 3000);
	const recommended = domains.filter(
		(d) => (d.price_cents ?? 0) > 3000 && (d.price_cents ?? 0) <= 5000,
	);
	const premium = domains.filter((d) => (d.price_cents ?? 0) > 5000);

	const formatDomain = (d: DomainResult): string => {
		const price = d.price_cents ? `$${(d.price_cents / 100).toFixed(0)}/yr` : "N/A";
		return `    ${d.domain.padEnd(30)} ${price.padStart(10)}`;
	};

	const domainSection = (title: string, icon: string, domains: DomainResult[]): string => {
		if (domains.length === 0) return "";
		return `
│  ${icon} ${title.padEnd(52)} │
│                                                              │
${domains
	.slice(0, 5)
	.map((d) => `│${formatDomain(d)}             │`)
	.join("\n")}
│                                                              │`;
	};

	return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
      background-color: #1a1b26;
      color: #a9b1d6;
      padding: 20px;
      line-height: 1.6;
    }
    .box {
      background-color: #24283b;
      border: 1px solid #414868;
      border-radius: 8px;
      padding: 0;
      max-width: 600px;
      margin: 0 auto;
      white-space: pre;
      font-size: 13px;
    }
    .content {
      padding: 20px;
    }
    .header {
      color: #7aa2f7;
      font-weight: bold;
    }
    .success { color: #9ece6a; }
    .premium { color: #bb9af7; }
    .link {
      color: #7dcfff;
      text-decoration: none;
    }
    .footer {
      border-top: 1px solid #414868;
      padding: 15px 20px;
      color: #565f89;
      font-size: 11px;
    }
  </style>
</head>
<body>
  <div class="box">
    <div class="content">
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  <span class="header">YOUR DOMAINS ARE READY</span>                                  │
│  ──────────────────────                                      │
│                                                              │
│  We found ${String(domains.length).padEnd(2)} available options for "${business_name.slice(0, 20)}"${" ".repeat(Math.max(0, 20 - business_name.length))} │
│                                                              │
${domainSection("TOP PICKS (bundled, no extra cost)", "★", bundled)}
${domainSection("RECOMMENDED", "◆", recommended)}
${domainSection("PREMIUM (worth considering)", "💎", premium)}
│  ▸ <a href="${results_url}" class="link">View all ${domains.length} options</a>                              │
│                                                              │
│  ▸ <a href="${booking_url}" class="link">Book a call to finalize</a>                            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
    </div>
    <div class="footer">
grove.place • domain setup • ${new Date().toISOString().split("T")[0]}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate follow-up email with terminal aesthetic
 */
export function generateFollowupEmail(data: FollowupEmailData): string {
	const { business_name, quiz_url, batches_completed, domains_checked } = data;

	return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
      background-color: #1a1b26;
      color: #a9b1d6;
      padding: 20px;
      line-height: 1.6;
    }
    .box {
      background-color: #24283b;
      border: 1px solid #414868;
      border-radius: 8px;
      padding: 0;
      max-width: 600px;
      margin: 0 auto;
      white-space: pre;
      font-size: 13px;
    }
    .content {
      padding: 20px;
    }
    .header {
      color: #e0af68;
      font-weight: bold;
    }
    .link {
      color: #7dcfff;
      text-decoration: none;
    }
    .footer {
      border-top: 1px solid #414868;
      padding: 15px 20px;
      color: #565f89;
      font-size: 11px;
    }
  </style>
</head>
<body>
  <div class="box">
    <div class="content">
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  <span class="header">WE NEED YOUR INPUT</span>                                       │
│  ─────────────────                                           │
│                                                              │
│  Searching for "${business_name.slice(0, 20)}"...${" ".repeat(Math.max(0, 20 - business_name.length))}                   │
│                                                              │
│  We've checked ${String(domains_checked).padEnd(3)} domains across ${batches_completed} batch(es), but       │
│  haven't found enough great options yet.                     │
│                                                              │
│  Help us refine the search by answering a few quick          │
│  follow-up questions:                                        │
│                                                              │
│  ▸ <a href="${quiz_url}" class="link">Continue your search</a>                                │
│                                                              │
│  This takes about 30 seconds and helps us find               │
│  exactly what you're looking for.                            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
    </div>
    <div class="footer">
grove.place • domain setup • ${new Date().toISOString().split("T")[0]}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Send results email via Zephyr
 */
export async function sendResultsEmail(
	zephyr: Fetcher,
	apiKey: string,
	data: ResultsEmailData,
): Promise<{ success: boolean; messageId?: string }> {
	const html = generateResultsEmail(data);
	const subject = `Your domains are ready: ${data.business_name}`;

	return sendEmail(zephyr, apiKey, data.client_email, subject, html);
}

/**
 * Send follow-up email via Zephyr
 */
export async function sendFollowupEmail(
	zephyr: Fetcher,
	apiKey: string,
	data: FollowupEmailData,
): Promise<{ success: boolean; messageId?: string }> {
	const html = generateFollowupEmail(data);
	const subject = `Quick question about your domain search: ${data.business_name}`;

	return sendEmail(zephyr, apiKey, data.client_email, subject, html);
}
