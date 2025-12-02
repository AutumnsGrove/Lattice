// Verify Magic Login Code
// POST /api/auth/verify-code

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyMagicCode, getUserByEmail, createSession } from '$lib/server/db';

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
	if (!platform?.env?.DB) {
		throw error(500, 'Database not available');
	}

	let body: { email?: string; code?: string };
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid request body');
	}

	const { email, code } = body;

	if (!email || typeof email !== 'string') {
		throw error(400, 'Email is required');
	}

	if (!code || typeof code !== 'string') {
		throw error(400, 'Code is required');
	}

	const normalizedEmail = email.toLowerCase().trim();
	const normalizedCode = code.toUpperCase().trim();

	try {
		const { DB, ADMIN_EMAILS } = platform.env;

		// Verify the magic code
		const isValid = await verifyMagicCode(DB, normalizedEmail, normalizedCode);

		if (!isValid) {
			throw error(400, 'Invalid or expired code');
		}

		// Get the user
		const user = await getUserByEmail(DB, normalizedEmail);

		if (!user) {
			throw error(400, 'User not found');
		}

		// Check if user is admin
		const adminEmails = (ADMIN_EMAILS || '')
			.split(',')
			.map((e: string) => e.trim().toLowerCase())
			.filter(Boolean);

		const isAdmin = adminEmails.length === 0 || adminEmails.includes(normalizedEmail);

		// Update user's admin status if needed
		if (isAdmin && !user.is_admin) {
			await DB.prepare('UPDATE users SET is_admin = 1, updated_at = datetime("now") WHERE id = ?')
				.bind(user.id)
				.run();
		}

		// Create session
		const session = await createSession(DB, user.id);

		// Set session cookie
		cookies.set('session', session.id, {
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			maxAge: 30 * 24 * 60 * 60 // 30 days
		});

		return json({
			success: true,
			message: 'Login successful',
			user: {
				email: user.email,
				is_admin: isAdmin
			}
		});
	} catch (err) {
		console.error('[Verify Code Error]', err);
		if (err instanceof Error && 'status' in err) {
			throw err;
		}
		throw error(500, 'Failed to verify code');
	}
};
