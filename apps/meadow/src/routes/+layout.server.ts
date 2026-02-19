import type { LayoutServerLoad } from "./$types";
import { loadChannelMessages } from "@autumnsgrove/lattice/services";

export const load: LayoutServerLoad = async ({ platform, locals }) => {
  const db = platform?.env?.DB;

  const messages = db
    ? await loadChannelMessages(db, "meadow").catch(() => [])
    : [];

  // Resolve user's subdomain for "My Grove" link
  let userSubdomain: string | null = null;
  if (db && locals.user) {
    try {
      const row = await db
        .prepare(
          "SELECT subdomain FROM tenants WHERE user_id = ? AND active = 1 LIMIT 1",
        )
        .bind(locals.user.id)
        .first<{ subdomain: string }>();
      userSubdomain = row?.subdomain ?? null;
    } catch {
      // Non-critical — "My Grove" link will just not appear
    }
  }

  return {
    messages,
    user: locals.user,
    userSubdomain,
  };
};
