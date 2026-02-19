/**
 * Meadow Service Layer Types
 *
 * Shared types for feed queries, pagination, and API responses.
 */

import type { MeadowPost } from "$lib/types/post";

// ─────────────────────────────────────────────────────────────────────────────
// Feed Filters & Sorting
// ─────────────────────────────────────────────────────────────────────────────

export type FeedFilter =
  | "all"
  | "popular"
  | "hot"
  | "top"
  | "following"
  | "bookmarks"
  | "notes"
  | "blooms";

export type TopPeriod = "day" | "week" | "month";

export interface FeedOptions {
  filter: FeedFilter;
  topPeriod?: TopPeriod;
  userId?: string | null;
  limit: number;
  offset: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────────────────────────────────────

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface FeedPage {
  posts: MeadowPost[];
  pagination: Pagination;
}

// ─────────────────────────────────────────────────────────────────────────────
// Reports
// ─────────────────────────────────────────────────────────────────────────────

export type ReportReason = "spam" | "harassment" | "misinformation" | "other";

export const VALID_REPORT_REASONS: Set<string> = new Set([
  "spam",
  "harassment",
  "misinformation",
  "other",
]);

// ─────────────────────────────────────────────────────────────────────────────
// Database Row Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PostRow {
  id: string;
  tenant_id: string;
  guid: string;
  title: string;
  description: string;
  content_html: string | null;
  link: string;
  author_name: string | null;
  author_subdomain: string;
  tags: string | null;
  featured_image: string | null;
  published_at: number;
  score: number;
  reaction_counts: string | null;
  post_type: string;
  user_id: string | null;
  body: string | null;
  // Joined from user context
  user_voted?: number | null;
  user_bookmarked?: number | null;
  user_reactions?: string | null;
}

/**
 * Transform a database row into the client-facing MeadowPost shape.
 */
export function rowToPost(row: PostRow): MeadowPost {
  let tags: string[] = [];
  try {
    tags = row.tags ? JSON.parse(row.tags) : [];
  } catch {
    tags = [];
  }

  let reactionCounts: Record<string, number> = {};
  try {
    reactionCounts = row.reaction_counts ? JSON.parse(row.reaction_counts) : {};
  } catch {
    reactionCounts = {};
  }

  let userReactions: string[] = [];
  try {
    userReactions = row.user_reactions ? JSON.parse(row.user_reactions) : [];
  } catch {
    userReactions = [];
  }

  return {
    id: row.id,
    postType: (row.post_type as "bloom" | "note") || "bloom",
    title: row.title,
    description: row.description,
    link: row.link,
    authorName: row.author_name,
    authorSubdomain: row.author_subdomain,
    tags,
    featuredImage: row.featured_image,
    publishedAt: row.published_at,
    contentHtml: row.content_html,
    body: row.body ?? null,
    userId: row.user_id ?? null,
    userVoted: Boolean(row.user_voted),
    userBookmarked: Boolean(row.user_bookmarked),
    userReactions,
    score: row.score,
    reactionCounts,
  };
}
