/**
 * Notes Service — Create and delete native short-form posts.
 *
 * Notes are words left in the meadow for others to find.
 * Up to 1000 characters, optional rich text (content_html), no title, no external link.
 */

import type { MeadowPost } from "$lib/types/post";

/**
 * Create a new Note in the meadow.
 *
 * @param contentHtml - Sanitized HTML from the NoteEditor (null for plain-text notes)
 * @param tenantId - The user's tenant ID (required for FK constraint)
 * @param authorSubdomain - The user's blog subdomain (for attribution)
 */
export async function createNote(
  db: D1Database,
  userId: string,
  authorName: string | null,
  body: string,
  tags?: string[],
  contentHtml?: string | null,
  tenantId?: string,
  authorSubdomain?: string,
): Promise<MeadowPost> {
  const id = crypto.randomUUID();
  const guid = `note:${id}`;
  const now = Math.floor(Date.now() / 1000);
  const trimmedBody = body.trim();
  const subdomain = authorSubdomain ?? "";

  await db
    .prepare(
      `INSERT INTO meadow_posts
        (id, tenant_id, guid, title, description, content_html, link,
         author_name, author_subdomain, tags, featured_image,
         published_at, fetched_at, score, reaction_counts, visible,
         post_type, user_id, body)
      VALUES (?, ?, ?, '', '', ?, '',
              ?, ?, ?, NULL,
              ?, ?, 0, '{}', 1,
              'note', ?, ?)`,
    )
    .bind(
      id,
      tenantId ?? "",
      guid,
      contentHtml ?? null,
      authorName,
      subdomain,
      JSON.stringify(tags || []),
      now,
      now,
      userId,
      trimmedBody,
    )
    .run();

  // Return the created post in client shape
  return {
    id,
    postType: "note",
    title: "",
    description: "",
    link: "",
    authorName,
    authorSubdomain: subdomain,
    tags: tags || [],
    featuredImage: null,
    publishedAt: now,
    contentHtml: contentHtml ?? null,
    body: trimmedBody,
    userId,
    userVoted: false,
    userBookmarked: false,
    userReactions: [],
    score: 0,
    reactionCounts: {},
  };
}

/**
 * Delete a Note — only the author can delete their own notes.
 * Returns true if a row was deleted.
 */
export async function deleteNote(
  db: D1Database,
  userId: string,
  noteId: string,
): Promise<boolean> {
  const result = await db
    .prepare(
      `DELETE FROM meadow_posts
       WHERE id = ? AND user_id = ? AND post_type = 'note'`,
    )
    .bind(noteId, userId)
    .run();

  return (result.meta?.changes ?? 0) > 0;
}
