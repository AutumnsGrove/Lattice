/**
 * Better Auth Integration for Forage Worker
 *
 * Validates session cookies from auth-api.grove.place
 * Provides middleware for protecting API endpoints
 */

export interface BetterAuthUser {
	id: string;
	email: string;
	name: string;
	emailVerified: boolean;
	image?: string;
	createdAt: string;
	updatedAt: string;
}

export interface BetterAuthSession {
	id: string;
	userId: string;
	expiresAt: string;
	token: string;
	ipAddress?: string;
	userAgent?: string;
}

export interface SessionResponse {
	user: BetterAuthUser;
	session: BetterAuthSession;
}

/**
 * Validates a Better Auth session by checking with auth-api.grove.place
 *
 * @param request - The incoming request with cookies
 * @returns SessionResponse if authenticated, null if not
 */
export async function validateSession(request: Request): Promise<SessionResponse | null> {
	try {
		// Forward cookies to Better Auth session endpoint
		const cookieHeader = request.headers.get("cookie");

		if (!cookieHeader) {
			return null;
		}

		// Call Better Auth session endpoint
		const sessionResponse = await fetch("https://auth-api.grove.place/api/auth/session", {
			method: "GET",
			headers: {
				cookie: cookieHeader,
				"content-type": "application/json",
			},
		});

		if (!sessionResponse.ok) {
			return null;
		}

		const sessionData = (await sessionResponse.json()) as SessionResponse;

		// Validate that we got required fields
		if (!sessionData.user?.id || !sessionData.session?.id) {
			return null;
		}

		return sessionData;
	} catch (error) {
		console.error("Session validation error:", error);
		return null;
	}
}

/**
 * Creates an unauthorized response
 */
export function unauthorizedResponse(): Response {
	return new Response(
		JSON.stringify({
			error: "Unauthorized",
			message: "Valid authentication required. Please sign in at https://auth-api.grove.place",
		}),
		{
			status: 401,
			headers: {
				"Content-Type": "application/json",
				"WWW-Authenticate": 'Cookie realm="Better Auth"',
			},
		},
	);
}

/**
 * Extracts client_id from authenticated user
 * Uses user email as the client_id for consistency
 */
export function getClientId(user: { email: string }): string {
	return user.email;
}
