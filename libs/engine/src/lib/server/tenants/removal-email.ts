/**
 * The email a removed account holder receives
 *
 * Removal used to be silent. The help centre promises a human process, a
 * 30-day window and a support reply; none of that fired when we removed an
 * account for spam, and the person had no idea their blog was gone or why
 * (#1596 §A/§3).
 *
 * Two things this email is not:
 *
 * - **It is not a warning.** It arrives after the removal, deliberately. Notice
 *   before a link-farm takedown is notice to publish again before we finish.
 * - **It is not a legal notice.** It cites the rule so the person can check we
 *   are describing their account accurately, then it talks like a person.
 *
 * The reason an operator types is included verbatim. That is the part a person
 * reading at 2am actually wants — not the section number, but what happened.
 */

import type { RemovalPolicy } from "./removal-policy";

export interface RemovalEmailInput {
	/** `emmareed` — the name they knew their blog by. */
	subdomain: string;
	/** The operator's own words. Included as written. */
	reason: string;
	policy: RemovalPolicy;
	/** True when the login identity went with the tenant. */
	identityDeleted: boolean;
	/** Address to reply to. Support, not a person's inbox. */
	contact: string;
}

export interface RemovalEmail {
	subject: string;
	html: string;
	text: string;
}

const CONTACT_FALLBACK = "hello@grove.place";

/**
 * What was taken, in words rather than table names.
 *
 * "We deleted 1 row from platform_billing" is true and useless. The person wants
 * to know their blog is gone and their uploads with it.
 */
function whatWasRemoved(input: RemovalEmailInput): string[] {
	const removed = [
		`your blog at ${input.subdomain}.grove.place`,
		"its posts, pages, and settings",
		"the images and files you uploaded",
		`the subdomain itself, which anyone may now register`,
	];

	if (input.identityDeleted) {
		removed.push("the login you used to sign in, and any connected sign-in methods");
	}

	return removed;
}

export function buildRemovalEmail(input: RemovalEmailInput): RemovalEmail {
	const contact = input.contact || CONTACT_FALLBACK;
	const host = `${input.subdomain}.grove.place`;
	const removed = whatWasRemoved(input);

	const subject = input.policy.abuse
		? "Your Grove account was removed"
		: "Your Grove account has been deleted";

	const opener = input.policy.abuse
		? `We've removed ${host} and the account behind it.`
		: `As you asked, we've deleted ${host} and the account behind it.`;

	const reasonLine = input.reason.trim()
		? input.policy.abuse
			? `In our words: ${input.reason.trim()}`
			: `Your note: ${input.reason.trim()}`
		: "";

	const citation = input.policy.abuse
		? `The rule: ${input.policy.section} ${input.policy.title} — ${input.policy.url}`
		: "";

	const found = input.policy.abuse ? `What we found: ${input.policy.found}` : "";

	const closing = input.policy.abuse
		? [
				`If we got this wrong — a shared network, a false positive, a site you didn't know was involved — reply to this email and tell us. A person reads it, and we have reversed removals before.`,
				`We did not keep a copy of your writing, and we are not offering an export of content removed for this reason.`,
			]
		: [
				`If you didn't ask for this, reply immediately. Backups live on a 90-day clock, and inside that window we may still be able to help.`,
				`If you left because something here drove you away, we'd genuinely like to know. No pressure — you can also leave quietly.`,
			];

	const text = [
		"Hello,",
		"",
		opener,
		"",
		...(found ? [found] : []),
		...(citation ? [citation] : []),
		...(reasonLine ? [reasonLine] : []),
		"",
		"What's gone:",
		...removed.map((line) => `  • ${line}`),
		"",
		"Backups clear on our usual 90-day clock, and then nothing recoverable remains.",
		"",
		...closing,
		"",
		"— Grove",
		`   (${contact})`,
		"",
	].join("\n");

	return {
		subject,
		html: buildHtml({ input, opener, found, citation, reasonLine, removed, closing, contact }),
		text,
	};
}

function buildHtml(data: {
	input: RemovalEmailInput;
	opener: string;
	found: string;
	citation: string;
	reasonLine: string;
	removed: string[];
	closing: string[];
	contact: string;
}): string {
	const { input, opener, found, citation, reasonLine, removed, closing, contact } = data;
	const host = `${input.subdomain}.grove.place`;

	return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin: 0; padding: 0; background-color: #fefdfb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #333;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fefdfb;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <div style="margin-bottom: 30px; font-size: 24px; font-weight: 600; color: #1e2227;">Grove</div>

        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1e2227; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); color: #fefdfb;">
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 700; color: #fefdfb;">
                ${escapeHtml(opener)}
              </h1>

              ${
								found
									? `<p style="margin: 0 0 12px 0; font-size: 16px; line-height: 1.5; color: #e0ddd8;">${escapeHtml(found)}</p>`
									: ""
							}
              ${
								citation
									? `<p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.5; color: #a8a5a0;">${escapeHtml(citation)}</p>`
									: ""
							}
              ${
								reasonLine
									? `<div style="background-color: #2a3035; border-radius: 6px; padding: 16px 20px; margin-bottom: 24px; color: #e0ddd8;">
                <p style="margin: 0; font-size: 15px; line-height: 1.5;">${escapeHtml(reasonLine)}</p>
              </div>`
									: ""
							}

              <p style="margin: 0 0 10px 0; font-size: 15px; color: #e0ddd8;">What's gone:</p>
              <ul style="margin: 0 0 24px 0; padding-left: 20px; color: #e0ddd8; font-size: 15px; line-height: 1.6;">
                ${removed.map((line) => `<li>${escapeHtml(line)}</li>`).join("\n                ")}
              </ul>

              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.5; color: #a8a5a0;">
                Backups clear on our usual 90-day clock, and then nothing recoverable remains.
              </p>

              ${closing
								.map(
									(paragraph) =>
										`<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.5; color: #e0ddd8;">${escapeHtml(paragraph)}</p>`,
								)
								.join("\n              ")}

              <p style="margin: 24px 0 0 0; font-size: 14px; color: #a8a5a0;">
                — Grove<br>
                <a href="mailto:${escapeHtml(contact)}" style="color: #22c55e; text-decoration: none;">${escapeHtml(contact)}</a>
              </p>
            </td>
          </tr>
        </table>

        <p style="margin: 24px 0 0 0; font-size: 12px; color: #a8a5a0;">
          You're receiving this because ${escapeHtml(host)} was on your account.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** The reason and the subdomain are operator- and user-supplied. */
function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}
