import type { Handle } from "@sveltejs/kit";

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

  // Skip DB access for prerendered knowledge base routes
  // (adapter-cloudflare throws when accessing platform.env during prerendering)
  const isPrerenderedRoute = event.route.id?.startsWith("/knowledge/");
  if (isPrerenderedRoute) {
    return resolve(event);
  }

  // Create a D1 session for consistent reads within this request
  // This enables read replication while maintaining "read your own writes" consistency
  if (event.platform?.env?.DB) {
    event.locals.dbSession = event.platform.env.DB.withSession();
  }

  // Check for session cookie
  const sessionId = event.cookies.get("session");
  if (!sessionId || !event.locals.dbSession) {
    return resolve(event);
  }

  try {
    const dbSession = event.locals.dbSession;

    // Get session and check if it's valid using the D1 session
    const session = await dbSession
      .prepare(
        'SELECT * FROM sessions WHERE id = ? AND expires_at > datetime("now")',
      )
      .bind(sessionId)
      .first<SessionRow>();

    if (!session) {
      // Clear invalid session cookie
      event.cookies.delete("session", { path: "/" });
      return resolve(event);
    }

    // Get user using the same D1 session for consistency
    const user = await dbSession
      .prepare("SELECT * FROM users WHERE id = ?")
      .bind(session.user_id)
      .first<UserRow>();

    if (user) {
      event.locals.user = {
        email: user.email,
        is_admin: user.is_admin === 1,
      };
    }
  } catch (error) {
    console.error("[Auth Hook Error]", error);
  }

  return resolve(event);
};
