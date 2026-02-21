import { fail, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { verifyTurnstileToken, generateId } from "@autumnsgrove/lattice/services";
import { GROVE_EMAILS } from "@autumnsgrove/lattice/config";
import { Resend } from "resend";

/**
 * Escape HTML special characters to prevent XSS in email templates
 */
function escapeHtml(unsafe: string | null): string {
	if (!unsafe) return "";
	return unsafe
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

const VALID_SEVERITY = ["critical", "high", "medium", "low", "informational"] as const;

export const load: PageServerLoad = async ({ locals, platform }) => {
	return {
		user: locals.user || null,
		turnstileKey: platform?.env?.TURNSTILE_SITE_KEY || "",
	};
};

export const actions: Actions = {
	report: async ({ request, platform, locals, getClientAddress }) => {
		const formData = await request.formData();
		const name = (formData.get("name") as string)?.trim() || null;
		const email = (formData.get("email") as string)?.trim();
		const severity = (formData.get("severity") as string)?.trim() || "medium";
		const subject = (formData.get("subject") as string)?.trim();
		const description = (formData.get("description") as string)?.trim();
		const turnstileToken = formData.get("cf-turnstile-response") as string;

		// Validate severity
		const validSeverity = VALID_SEVERITY.includes(severity as (typeof VALID_SEVERITY)[number])
			? severity
			: "medium";

		// Validate required fields
		if (!email) {
			return fail(400, {
				error: "Email is required so we can follow up with you.",
			});
		}

		if (!subject || subject.length < 3) {
			return fail(400, { error: "Please provide a brief summary." });
		}

		if (!description || description.length < 20 || description.length > 10000) {
			return fail(400, {
				error: "Please provide a description between 20 and 10,000 characters.",
			});
		}

		// Turnstile verification for guests
		if (!locals.user) {
			if (!turnstileToken) {
				return fail(400, {
					error: "Please complete the verification challenge.",
				});
			}

			const turnstileResult = await verifyTurnstileToken({
				token: turnstileToken,
				secretKey: platform?.env?.TURNSTILE_SECRET_KEY || "",
				remoteip: getClientAddress(),
			});

			if (!turnstileResult.success) {
				return fail(403, {
					error: "Human verification failed. Please try again.",
				});
			}
		}

		// Rate limiting: 3 reports per day per IP
		const ip = getClientAddress();
		const rateLimitKey = `security:ip:${ip}`;

		try {
			if (platform?.env?.CACHE) {
				const existing = await platform.env.CACHE.get(rateLimitKey);
				const count = existing ? parseInt(existing, 10) : 0;

				if (count >= 3) {
					return fail(429, {
						error:
							"You've submitted several reports today. Please try again tomorrow, or email security@grove.place directly.",
					});
				}

				await platform.env.CACHE.put(rateLimitKey, (count + 1).toString(), {
					expirationTtl: 60 * 60 * 24,
				});
			}
		} catch (err) {
			console.error("Rate limit check failed:", err);
		}

		// Generate a report ID for tracking
		const reportId = `SEC-${new Date().getFullYear()}-${generateId().slice(0, 8).toUpperCase()}`;

		// Send notification email to Autumn/security team
		if (platform?.env?.RESEND_API_KEY) {
			try {
				const resend = new Resend(platform.env.RESEND_API_KEY);

				const severityLabels: Record<string, string> = {
					critical: "CRITICAL",
					high: "High",
					medium: "Medium",
					low: "Low",
					informational: "Informational",
				};

				const emailSubject = `[Security ${reportId}] [${severityLabels[validSeverity]}] ${subject}`;

				const emailText = `Security Vulnerability Report

Report ID: ${reportId}
Severity: ${severityLabels[validSeverity] || validSeverity}
From: ${name || "Anonymous researcher"}
Email: ${email}
${locals.user ? `User ID: ${locals.user.id}` : "(External researcher)"}

---

${description}

---
This report was submitted via grove.place/security`;

				const emailHtml = `<div style="font-family: sans-serif; line-height: 1.6;">
<h2 style="color: #991b1b; margin-bottom: 0.5rem;">Security Vulnerability Report</h2>
<p style="color: #666; margin-top: 0;">
<strong>${escapeHtml(reportId)}</strong> &middot; Severity: ${severityLabels[validSeverity] || validSeverity}
</p>

<p><strong>From:</strong> ${escapeHtml(name) || "Anonymous researcher"}<br>
<strong>Email:</strong> ${escapeHtml(email)}<br>
${locals.user ? `<strong>User:</strong> ${escapeHtml(locals.user.id)}<br>` : "<em>(External researcher)</em><br>"}
</p>

<hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;">

<p style="white-space: pre-wrap;">${escapeHtml(description)}</p>

<hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;">

<p style="font-size: 14px; color: #666;">
Submitted via <a href="https://grove.place/security" style="color: #166534;">grove.place/security</a>
</p>
</div>`;

				await resend.emails.send({
					from: GROVE_EMAILS.security.from,
					to: GROVE_EMAILS.security.address,
					replyTo: email,
					subject: emailSubject,
					text: emailText,
					html: emailHtml,
				});
			} catch (err) {
				console.error("Failed to send security notification email:", err);
				// Don't fail - we still want to confirm receipt
			}
		}

		// Send confirmation email to reporter
		if (platform?.env?.RESEND_API_KEY && email) {
			try {
				const resend = new Resend(platform.env.RESEND_API_KEY);

				const confirmSubject = `Security report received: ${reportId}`;

				const confirmText = `Hi ${name || "there"},

Thank you for taking the time to report a potential security vulnerability to Grove. We take every report seriously.

Your report ID: ${reportId}

I'll review your report and get back to you as soon as possible. For critical issues, I aim to respond within 24 hours.

Please keep this report ID for your records. If you need to follow up or provide additional information, you can reply to this email or reach out at security@grove.place.

Thank you for helping keep Grove safe for everyone.

—Autumn
Grove`;

				const confirmHtml = `<div style="font-family: sans-serif; line-height: 1.6; max-width: 600px;">
<p>Hi ${escapeHtml(name) || "there"},</p>

<p>Thank you for taking the time to report a potential security vulnerability to Grove. We take every report seriously.</p>

<p><strong>Your report ID:</strong> ${escapeHtml(reportId)}</p>

<div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin: 24px 0; border-left: 4px solid #991b1b;">
<p style="margin: 0 0 8px 0; font-weight: bold;">${escapeHtml(subject)}</p>
<p style="margin: 0; color: #666;">We'll review this and follow up with you directly.</p>
</div>

<p style="color: #666;">I'll review your report and get back to you as soon as possible. For critical issues, I aim to respond within 24 hours.</p>

<p style="color: #666;">Please keep this report ID for your records. If you need to follow up, you can reply to this email or reach out at <a href="mailto:security@grove.place" style="color: #166534;">security@grove.place</a>.</p>

<p style="color: #666;">Thank you for helping keep Grove safe for everyone.</p>

<p style="margin-top: 24px;">—Autumn<br><a href="https://grove.place" style="color: #166534;">Grove</a></p>
</div>`;

				await resend.emails.send({
					from: GROVE_EMAILS.security.from,
					to: email,
					subject: confirmSubject,
					text: confirmText,
					html: confirmHtml,
				});
			} catch (err) {
				console.error("Failed to send security confirmation email:", err);
				// Don't fail
			}
		}

		return { success: true, reportId };
	},
};
