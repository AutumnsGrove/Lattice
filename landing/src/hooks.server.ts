import type { Handle } from '@sveltejs/kit';

interface SessionRow {
	id: string;
	user_id: string;
	expires_at: string;
}

interface UserRow {
	id: string;
	email: string;
	is_admin: number;
}

export const handle: Handle = async ({ event, resolve }) => {
	// Initialize user as null
	event.locals.user = null;

	// Check for session cookie
	const sessionId = event.cookies.get('session');
	if (!sessionId || !event.platform?.env?.DB) {
		return resolve(event);
	}

	try {
		const db = event.platform.env.DB;

		// Get session and check if it's valid
		const session = await db
			.prepare('SELECT * FROM sessions WHERE id = ? AND expires_at > datetime("now")')
			.bind(sessionId)
			.first<SessionRow>();

		if (!session) {
			// Clear invalid session cookie
			event.cookies.delete('session', { path: '/' });
			return resolve(event);
		}

		// Get user
		const user = await db
			.prepare('SELECT * FROM users WHERE id = ?')
			.bind(session.user_id)
			.first<UserRow>();

		if (user) {
			event.locals.user = {
				email: user.email,
				is_admin: user.is_admin === 1
			};
		}
	} catch (error) {
		console.error('[Auth Hook Error]', error);
	}

	return resolve(event);
};
