// Request Magic Login Code
// POST /api/auth/request-code

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createMagicCode, getOrCreateUser } from '$lib/server/db';

export const POST: RequestHandler = async ({ request, platform }) => {
	if (!platform?.env?.DB) {
		throw error(500, 'Database not available');
	}

	let body: { email?: string };
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid request body');
	}

	const { email } = body;

	if (!email || typeof email !== 'string') {
		throw error(400, 'Email is required');
	}

	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
		throw error(400, 'Invalid email address');
	}

	const normalizedEmail = email.toLowerCase().trim();

	// Check if email is in admin list
	const adminEmails = (platform.env.ADMIN_EMAILS || '')
		.split(',')
		.map((e: string) => e.trim().toLowerCase())
		.filter(Boolean);

	if (adminEmails.length > 0 && !adminEmails.includes(normalizedEmail)) {
		// Don't reveal whether email is admin or not
		// But still return success to prevent enumeration
		return json({ success: true, message: 'If this email is registered, a code has been sent' });
	}

	try {
		const { DB, RESEND_API_KEY } = platform.env;

		// Create or get user
		await getOrCreateUser(DB, normalizedEmail);

		// Create magic code
		const magicCode = await createMagicCode(DB, normalizedEmail);

		// Send email with the code
		if (RESEND_API_KEY) {
			const emailResponse = await fetch('https://api.resend.com/emails', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${RESEND_API_KEY}`
				},
				body: JSON.stringify({
					from: 'Grove <noreply@grove.place>',
					to: normalizedEmail,
					subject: 'Your Grove Admin Login Code',
					html: `
						<div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
							<h1 style="color: #3d2914; font-size: 24px; margin-bottom: 8px;">Grove Admin</h1>
							<p style="color: #666; margin-bottom: 24px;">Your login code is:</p>
							<div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
								<code style="font-size: 32px; letter-spacing: 4px; color: #16a34a; font-weight: bold;">${magicCode.code}</code>
							</div>
							<p style="color: #999; font-size: 14px;">This code expires in 15 minutes. If you didn't request this, you can ignore this email.</p>
						</div>
					`
				})
			});

			if (!emailResponse.ok) {
				console.error('[Email Error]', await emailResponse.text());
			}
		} else {
			// Development: log the code
			console.log(`[DEV] Magic code for ${normalizedEmail}: ${magicCode.code}`);
		}

		return json({ success: true, message: 'Code sent to your email' });
	} catch (err) {
		console.error('[Request Code Error]', err);
		throw error(500, 'Failed to send code');
	}
};
