/**
 * Payment Email Service
 *
 * Sends payment-related emails via Zephyr service binding.
 * Adapted from apps/plant webhook handler email patterns.
 */

// =============================================================================
// TYPES
// =============================================================================

interface EmailParams {
	to: string;
	subject: string;
	html: string;
	text: string;
}

// =============================================================================
// HTML ESCAPING
// =============================================================================

/**
 * Escape HTML special characters to prevent injection in email templates.
 * User-provided values (name, subdomain, etc.) MUST be escaped before
 * interpolation into HTML email bodies.
 */
function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

// =============================================================================
// EMAIL SENDING
// =============================================================================

/**
 * Send an email via Zephyr service binding.
 * Non-blocking — caller should handle errors gracefully.
 */
async function sendViaZephyr(
	zephyr: Fetcher,
	params: EmailParams,
): Promise<{ success: boolean; error?: string }> {
	try {
		const response = await zephyr.fetch("https://internal/send", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				to: params.to,
				subject: params.subject,
				html: params.html,
				text: params.text,
				from: "Grove <hello@grove.place>",
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			return { success: false, error: `Zephyr ${response.status}: ${errorText}` };
		}

		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

// =============================================================================
// EMAIL TEMPLATES
// =============================================================================

/**
 * Send payment received / welcome email (first payment only)
 */
export async function sendPaymentReceivedEmail(
	zephyr: Fetcher,
	params: {
		to: string;
		name: string;
		subdomain: string;
		amount: string;
		paymentDate: string;
		planName: string;
		interval: string;
		nextPaymentDate: string;
		invoiceId: string;
	},
): Promise<void> {
	// Escape all user-provided values to prevent HTML injection
	const safeName = escapeHtml(params.name);
	const safePlanName = escapeHtml(params.planName);
	const safeAmount = escapeHtml(params.amount);
	const safeInterval = escapeHtml(params.interval);
	const safePaymentDate = escapeHtml(params.paymentDate);
	const safeNextPaymentDate = escapeHtml(params.nextPaymentDate);
	const adminUrl = `https://${encodeURIComponent(params.subdomain)}.grove.place/arbor/account`;

	const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #fefdfb; font-family: 'Lexend', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td style="padding: 30px; background-color: #1e2227; border-radius: 12px;">
        <h1 style="margin: 0 0 16px 0; font-size: 24px; color: #f5f2ea; font-weight: normal;">
          Welcome to Grove, ${safeName}!
        </h1>
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          Your ${safePlanName} subscription is active. Here's your receipt:
        </p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="8" style="margin: 0 0 24px 0;">
          <tr>
            <td style="color: rgba(245, 242, 234, 0.5); font-size: 14px;">Amount</td>
            <td style="color: #f5f2ea; font-size: 14px; text-align: right;">${safeAmount}</td>
          </tr>
          <tr>
            <td style="color: rgba(245, 242, 234, 0.5); font-size: 14px;">Plan</td>
            <td style="color: #f5f2ea; font-size: 14px; text-align: right;">${safePlanName} (${safeInterval}ly)</td>
          </tr>
          <tr>
            <td style="color: rgba(245, 242, 234, 0.5); font-size: 14px;">Date</td>
            <td style="color: #f5f2ea; font-size: 14px; text-align: right;">${safePaymentDate}</td>
          </tr>
          <tr>
            <td style="color: rgba(245, 242, 234, 0.5); font-size: 14px;">Next payment</td>
            <td style="color: #f5f2ea; font-size: 14px; text-align: right;">${safeNextPaymentDate}</td>
          </tr>
        </table>
        <p style="margin: 0 0 24px 0;">
          <a href="${adminUrl}" style="display: inline-block; padding: 12px 24px; background-color: #16a34a; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 500;">Visit Your Blog</a>
        </p>
        <p style="margin: 0; font-size: 14px; color: rgba(245, 242, 234, 0.5);">
          Questions? Just reply to this email.
        </p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-top: 30px;">
        <p style="margin: 0; font-size: 12px; color: rgba(61, 41, 20, 0.4);">grove.place</p>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

	const text = `Welcome to Grove, ${params.name}!

Your ${params.planName} subscription is active.

Amount: ${params.amount}
Plan: ${params.planName} (${params.interval}ly)
Date: ${params.paymentDate}
Next payment: ${params.nextPaymentDate}

Visit your blog: ${adminUrl}

Questions? Just reply to this email.

grove.place`;

	const result = await sendViaZephyr(zephyr, {
		to: params.to,
		subject: `Welcome to Grove ${params.planName}!`,
		html,
		text,
	});

	if (!result.success) {
		console.error("[Email] Failed to send payment receipt:", result.error);
	}
}

/**
 * Send payment failed email
 */
export async function sendPaymentFailedEmail(
	zephyr: Fetcher,
	params: {
		to: string;
		name: string;
		subdomain: string;
	},
): Promise<void> {
	const safeName = escapeHtml(params.name);
	const adminUrl = `https://${encodeURIComponent(params.subdomain)}.grove.place/arbor/account`;

	const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #fefdfb; font-family: 'Lexend', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td style="padding: 30px; background-color: #1e2227; border-radius: 12px;">
        <h1 style="margin: 0 0 16px 0; font-size: 24px; color: #f5f2ea; font-weight: normal;">
          Hi ${safeName},
        </h1>
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          We had trouble processing your latest payment. Your blog is still live, but please update your payment method to avoid any interruption.
        </p>
        <p style="margin: 0 0 24px 0;">
          <a href="${adminUrl}" style="display: inline-block; padding: 12px 24px; background-color: #16a34a; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 500;">Update Payment Method</a>
        </p>
        <p style="margin: 0; font-size: 14px; color: rgba(245, 242, 234, 0.5);">
          Questions? Just reply to this email.
        </p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-top: 30px;">
        <p style="margin: 0; font-size: 12px; color: rgba(61, 41, 20, 0.4);">grove.place</p>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

	const text = `Hi ${params.name},

We had trouble processing your latest payment. Your blog is still live, but please update your payment method to avoid any interruption.

Update payment method: ${adminUrl}

Questions? Just reply to this email.

grove.place`;

	const result = await sendViaZephyr(zephyr, {
		to: params.to,
		subject: "Action needed: payment issue on your Grove account",
		html,
		text,
	});

	if (!result.success) {
		console.error("[Email] Failed to send payment failed email:", result.error);
	}
}

/**
 * Send cancellation confirmation email
 */
export async function sendCancellationEmail(
	zephyr: Fetcher,
	params: {
		to: string;
		name: string;
		subdomain: string;
		periodEndDate: string;
		planName: string;
	},
): Promise<void> {
	const safeName = escapeHtml(params.name);
	const safeSubdomain = escapeHtml(params.subdomain);
	const safePeriodEndDate = escapeHtml(params.periodEndDate);
	const adminUrl = `https://${encodeURIComponent(params.subdomain)}.grove.place/arbor/account`;
	const siteUrl = `https://${encodeURIComponent(params.subdomain)}.grove.place`;

	const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #fefdfb; font-family: 'Lexend', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td style="padding: 30px; background-color: #1e2227; border-radius: 12px;">
        <h1 style="margin: 0 0 16px 0; font-size: 24px; color: #f5f2ea; font-weight: normal;">
          Hi ${safeName},
        </h1>
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          We've cancelled your membership as requested.
        </p>
        <hr style="border: none; border-top: 1px solid rgba(245, 242, 234, 0.1); margin: 24px 0;" />
        <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #f5f2ea; font-weight: 500;">
          Your blog stays live
        </h2>
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          <a href="${siteUrl}" style="color: #16a34a; text-decoration: none;">${safeSubdomain}.grove.place</a> remains fully accessible until <strong style="color: #f5f2ea;">${safePeriodEndDate}</strong>.
        </p>
        <hr style="border: none; border-top: 1px solid rgba(245, 242, 234, 0.1); margin: 24px 0;" />
        <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #f5f2ea; font-weight: 500;">
          Changed your mind?
        </h2>
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          Resume anytime before ${safePeriodEndDate}:
        </p>
        <p style="margin: 0 0 24px 0;">
          <a href="${adminUrl}" style="display: inline-block; padding: 12px 24px; background-color: #16a34a; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 500;">Resume Subscription</a>
        </p>
        <hr style="border: none; border-top: 1px solid rgba(245, 242, 234, 0.1); margin: 24px 0;" />
        <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #f5f2ea; font-weight: 500;">
          Your content is safe
        </h2>
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          After the period ends, your blog becomes private -- but nothing is deleted. You can resubscribe anytime to restore public access.
        </p>
        <p style="margin: 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          Questions? Just reply to this email.
        </p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-top: 30px;">
        <p style="margin: 0; font-size: 12px; color: rgba(61, 41, 20, 0.4);">grove.place</p>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

	const text = `Hi ${params.name},

We've cancelled your subscription as requested.

Your blog stays live
${params.subdomain}.grove.place remains fully accessible until ${params.periodEndDate}.

Changed your mind?
Resume anytime before ${params.periodEndDate}: ${adminUrl}

Your content is safe
After the period ends, your blog becomes private -- but nothing is deleted. You can resubscribe anytime to restore public access.

Questions? Just reply to this email.

grove.place`;

	const result = await sendViaZephyr(zephyr, {
		to: params.to,
		subject: "Your Grove membership has been cancelled",
		html,
		text,
	});

	if (!result.success) {
		console.error("[Email] Failed to send cancellation email:", result.error);
	}
}
