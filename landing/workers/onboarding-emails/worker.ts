/**
 * Grove Onboarding Emails Worker
 *
 * Scheduled worker that sends follow-up emails to waitlist signups.
 * Runs daily and checks for users who need Day 3, Day 7, or Day 14 emails.
 *
 * Schedule: Daily at 10:00 AM UTC
 */

import { Resend } from 'resend';

interface Env {
	DB: D1Database;
	RESEND_API_KEY: string;
}

interface EmailSignup {
	id: number;
	email: string;
	name: string | null;
	created_at: string;
	day3_email_sent: number;
	day7_email_sent: number;
	day14_email_sent: number;
}

// =============================================================================
// UNSUBSCRIBE TOKEN UTILITIES
// =============================================================================

const UNSUBSCRIBE_PREFIX = 'grove-unsubscribe-v1';

async function generateUnsubscribeToken(email: string, secret: string): Promise<string> {
	const encoder = new TextEncoder();
	const keyData = encoder.encode(secret);
	const messageData = encoder.encode(`${UNSUBSCRIBE_PREFIX}:${email.toLowerCase()}`);

	const cryptoKey = await crypto.subtle.importKey(
		'raw',
		keyData,
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);

	const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
	const hashArray = Array.from(new Uint8Array(signature));
	const hex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
	return hex.substring(0, 32);
}

async function generateUnsubscribeUrl(email: string, secret: string): Promise<string> {
	const token = await generateUnsubscribeToken(email, secret);
	const params = new URLSearchParams({
		email: email.toLowerCase(),
		token
	});
	return `https://grove.place/unsubscribe?${params.toString()}`;
}

// =============================================================================
// EMAIL TEMPLATES
// =============================================================================

function wrapEmail(content: string, unsubscribeUrl: string): string {
	return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Grove</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fefdfb; font-family: Georgia, Cambria, 'Times New Roman', serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td align="center" style="padding-bottom: 30px;">
        <svg width="48" height="59" viewBox="0 0 417 512" xmlns="http://www.w3.org/2000/svg">
          <path fill="#5d4037" d="M171.274 344.942h74.09v167.296h-74.09V344.942z"/>
          <path fill="#16a34a" d="M0 173.468h126.068l-89.622-85.44 49.591-50.985 85.439 87.829V0h74.086v124.872L331 37.243l49.552 50.785-89.58 85.24H417v70.502H290.252l90.183 87.629L331 381.192 208.519 258.11 86.037 381.192l-49.591-49.591 90.218-87.631H0v-70.502z"/>
        </svg>
      </td>
    </tr>
    ${content}
    <tr>
      <td align="center" style="padding-top: 30px;">
        <p style="margin: 0; font-size: 12px; color: #3d2914; opacity: 0.4;">
          grove.place
        </p>
        <p style="margin: 8px 0 0 0; font-size: 11px; color: #3d2914; opacity: 0.3;">
          <a href="${unsubscribeUrl}" style="color: inherit;">Unsubscribe from updates</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

function getDay3Email(unsubscribeUrl: string): { subject: string; html: string; text: string } {
	const subject = "What we're building at Grove";

	const html = wrapEmail(
		`
    <tr>
      <td align="center" style="padding-bottom: 20px;">
        <h1 style="margin: 0; font-size: 24px; color: #3d2914; font-weight: normal;">
          A peek behind the curtain
        </h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px; background-color: #f0fdf4; border-radius: 12px;">
        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3d2914;">
          Hey there,
        </p>
        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3d2914;">
          Since you signed up for Grove, I wanted to share what we're actually building.
        </p>
        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3d2914;">
          <strong style="color: #16a34a;">Grove is a blogging platform</strong> — but not like the ones you've seen before. No algorithms deciding who sees your work. No ads. No data harvesting. Just your words, your space, your readers.
        </p>
        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3d2914;">
          Here's what you'll get:
        </p>
        <ul style="margin: 0 0 16px 0; padding-left: 20px; color: #3d2914; line-height: 1.8;">
          <li>Your own blog at <strong>yourname.grove.place</strong></li>
          <li>A clean, distraction-free writing experience</li>
          <li>Beautiful themes that put your words first</li>
          <li>Optional community features (if you want them)</li>
          <li>Your data, always exportable, always yours</li>
        </ul>
        <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #3d2914;">
          We're still growing, but we're getting closer every day. I'll keep you posted.
        </p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-top: 30px;">
        <p style="margin: 0; font-size: 14px; color: #3d2914; opacity: 0.5;">
          — Autumn
        </p>
      </td>
    </tr>
  `,
		unsubscribeUrl
	);

	const text = `
A peek behind the curtain
=========================

Hey there,

Since you signed up for Grove, I wanted to share what we're actually building.

Grove is a blogging platform — but not like the ones you've seen before. No algorithms deciding who sees your work. No ads. No data harvesting. Just your words, your space, your readers.

Here's what you'll get:

• Your own blog at yourname.grove.place
• A clean, distraction-free writing experience
• Beautiful themes that put your words first
• Optional community features (if you want them)
• Your data, always exportable, always yours

We're still growing, but we're getting closer every day. I'll keep you posted.

— Autumn

grove.place

---
Unsubscribe: ${unsubscribeUrl}
`.trim();

	return { subject, html, text };
}

function getDay7Email(unsubscribeUrl: string): { subject: string; html: string; text: string } {
	const subject = "Why we're building Grove";

	const html = wrapEmail(
		`
    <tr>
      <td align="center" style="padding-bottom: 20px;">
        <h1 style="margin: 0; font-size: 24px; color: #3d2914; font-weight: normal;">
          Why Grove exists
        </h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px; background-color: #f0fdf4; border-radius: 12px;">
        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3d2914;">
          Hey,
        </p>
        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3d2914;">
          I've been thinking about why I started Grove, and I wanted to share that with you.
        </p>
        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3d2914;">
          The internet used to feel like a place where you could just... exist. Make a weird little website. Write without worrying about engagement metrics. Connect with people who actually cared about what you had to say.
        </p>
        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3d2914;">
          Somewhere along the way, that got lost. Everything became about growth, algorithms, monetization. The platforms that promised to give us a voice turned us into products.
        </p>
        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3d2914;">
          <strong style="color: #16a34a;">Grove is my attempt to bring some of that back.</strong>
        </p>
        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3d2914;">
          A place where you own your space. Where your readers find you because they want to, not because an algorithm served you up. Where the business model is simple: you pay for the service, and that's it.
        </p>
        <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #3d2914;">
          Thanks for being here. It means more than you know.
        </p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-top: 30px;">
        <p style="margin: 0; font-size: 14px; color: #3d2914; opacity: 0.5;">
          — Autumn
        </p>
      </td>
    </tr>
  `,
		unsubscribeUrl
	);

	const text = `
Why Grove exists
================

Hey,

I've been thinking about why I started Grove, and I wanted to share that with you.

The internet used to feel like a place where you could just... exist. Make a weird little website. Write without worrying about engagement metrics. Connect with people who actually cared about what you had to say.

Somewhere along the way, that got lost. Everything became about growth, algorithms, monetization. The platforms that promised to give us a voice turned us into products.

Grove is my attempt to bring some of that back.

A place where you own your space. Where your readers find you because they want to, not because an algorithm served you up. Where the business model is simple: you pay for the service, and that's it.

Thanks for being here. It means more than you know.

— Autumn

grove.place

---
Unsubscribe: ${unsubscribeUrl}
`.trim();

	return { subject, html, text };
}

function getDay14Email(unsubscribeUrl: string): { subject: string; html: string; text: string } {
	const subject = 'Still here, still growing';

	const html = wrapEmail(
		`
    <tr>
      <td align="center" style="padding-bottom: 20px;">
        <h1 style="margin: 0; font-size: 24px; color: #3d2914; font-weight: normal;">
          A quick check-in
        </h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px; background-color: #f0fdf4; border-radius: 12px;">
        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3d2914;">
          Hey,
        </p>
        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3d2914;">
          It's been a couple weeks since you signed up for Grove. I wanted to check in and let you know we're still here, still working on this.
        </p>
        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3d2914;">
          Building something good takes time, and I'd rather do it right than rush it out. But progress is happening — every day, Grove gets a little closer to being ready for you.
        </p>
        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3d2914;">
          <strong style="color: #16a34a;">Questions? Ideas? Just want to say hi?</strong>
        </p>
        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3d2914;">
          You can reply directly to this email — it comes straight to me, not a support queue. I read everything.
        </p>
        <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #3d2914;">
          Thanks for your patience. I promise it'll be worth the wait.
        </p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-top: 30px;">
        <p style="margin: 0; font-size: 14px; color: #3d2914; opacity: 0.5;">
          — Autumn
        </p>
      </td>
    </tr>
  `,
		unsubscribeUrl
	);

	const text = `
A quick check-in
================

Hey,

It's been a couple weeks since you signed up for Grove. I wanted to check in and let you know we're still here, still working on this.

Building something good takes time, and I'd rather do it right than rush it out. But progress is happening — every day, Grove gets a little closer to being ready for you.

Questions? Ideas? Just want to say hi?

You can reply directly to this email — it comes straight to me, not a support queue. I read everything.

Thanks for your patience. I promise it'll be worth the wait.

— Autumn

grove.place

---
Unsubscribe: ${unsubscribeUrl}
`.trim();

	return { subject, html, text };
}

// =============================================================================
// EMAIL SENDING
// =============================================================================

async function sendEmail(
	resend: Resend,
	to: string,
	subject: string,
	html: string,
	text: string
): Promise<boolean> {
	try {
		const { error } = await resend.emails.send({
			from: 'Grove <hello@grove.place>',
			to,
			subject,
			html,
			text,
		});

		if (error) {
			console.error(`[Resend] Error sending to ${to}:`, error);
			return false;
		}

		return true;
	} catch (err) {
		console.error(`[Resend] Exception sending to ${to}:`, err);
		return false;
	}
}

function daysSinceSignup(createdAt: string): number {
	const signupDate = new Date(createdAt);
	const now = new Date();
	const diffMs = now.getTime() - signupDate.getTime();
	return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

async function processOnboardingEmails(env: Env): Promise<{ sent: number; errors: number }> {
	const resend = new Resend(env.RESEND_API_KEY);
	let sent = 0;
	let errors = 0;

	// Query users who need onboarding emails
	const result = await env.DB.prepare(`
		SELECT id, email, name, created_at, day3_email_sent, day7_email_sent, day14_email_sent
		FROM email_signups
		WHERE unsubscribed_at IS NULL
		  AND onboarding_emails_unsubscribed = 0
		  AND (
		    (day3_email_sent = 0 AND datetime(created_at, '+3 days') <= datetime('now'))
		    OR (day7_email_sent = 0 AND datetime(created_at, '+7 days') <= datetime('now'))
		    OR (day14_email_sent = 0 AND datetime(created_at, '+14 days') <= datetime('now'))
		  )
		LIMIT 100
	`).all<EmailSignup>();

	if (!result.results || result.results.length === 0) {
		console.log('[Onboarding] No users need emails today');
		return { sent: 0, errors: 0 };
	}

	console.log(`[Onboarding] Processing ${result.results.length} users`);

	for (const user of result.results) {
		const days = daysSinceSignup(user.created_at);

		// Generate secure unsubscribe URL for this user
		const unsubscribeUrl = await generateUnsubscribeUrl(user.email, env.RESEND_API_KEY);

		let emailToSend: { subject: string; html: string; text: string } | null = null;
		let emailType: 'day3' | 'day7' | 'day14' | null = null;

		// Determine which email to send (prioritize earlier emails)
		if (user.day3_email_sent === 0 && days >= 3) {
			emailToSend = getDay3Email(unsubscribeUrl);
			emailType = 'day3';
		} else if (user.day7_email_sent === 0 && days >= 7) {
			emailToSend = getDay7Email(unsubscribeUrl);
			emailType = 'day7';
		} else if (user.day14_email_sent === 0 && days >= 14) {
			emailToSend = getDay14Email(unsubscribeUrl);
			emailType = 'day14';
		}

		if (!emailToSend || !emailType) {
			continue;
		}

		console.log(`[Onboarding] Sending ${emailType} email to ${user.email}`);

		const success = await sendEmail(
			resend,
			user.email,
			emailToSend.subject,
			emailToSend.html,
			emailToSend.text
		);

		if (success) {
			// Mark email as sent
			const column = `${emailType}_email_sent`;
			await env.DB.prepare(`UPDATE email_signups SET ${column} = 1 WHERE id = ?`)
				.bind(user.id)
				.run();
			sent++;
		} else {
			errors++;
		}

		// Small delay to avoid rate limiting
		await new Promise((resolve) => setTimeout(resolve, 100));
	}

	return { sent, errors };
}

// =============================================================================
// WORKER HANDLERS
// =============================================================================

export default {
	// Scheduled handler - runs on cron trigger
	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		console.log(`[Onboarding] Cron triggered at ${new Date().toISOString()}`);

		const { sent, errors } = await processOnboardingEmails(env);

		console.log(`[Onboarding] Completed: ${sent} sent, ${errors} errors`);
	},

	// HTTP handler - for manual triggering and health checks
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// Health check
		if (url.pathname === '/health') {
			return new Response('OK', { status: 200 });
		}

		// Manual trigger (protected by auth in production)
		if (url.pathname === '/trigger' && request.method === 'POST') {
			const authHeader = request.headers.get('Authorization');
			if (!authHeader || !authHeader.startsWith('Bearer ')) {
				return new Response('Unauthorized', { status: 401 });
			}

			ctx.waitUntil(
				processOnboardingEmails(env).then(({ sent, errors }) => {
					console.log(`[Onboarding] Manual trigger: ${sent} sent, ${errors} errors`);
				})
			);

			return new Response(JSON.stringify({ status: 'processing' }), {
				status: 202,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		return new Response('Not Found', { status: 404 });
	},
};
