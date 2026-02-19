/**
 * Meadow Social Feed — Post type definitions
 */

/** A post in the Meadow community feed — either a Bloom (RSS) or a Note (native short-form) */
export interface MeadowPost {
  id: string;
  /** 'bloom' for RSS-syndicated posts, 'note' for native short-form */
  postType: "bloom" | "note";
  title: string;
  description: string;
  link: string;
  authorName: string | null;
  authorSubdomain: string;
  tags: string[];
  featuredImage: string | null;
  publishedAt: number; // Unix seconds
  contentHtml: string | null;
  /** Plain-text body for Notes (up to 1000 chars) */
  body: string | null;
  /** Heartwood user ID for Notes authors */
  userId: string | null;
  /** Current user's interaction state (populated server-side) */
  userVoted: boolean;
  userBookmarked: boolean;
  userReactions: string[];
  /** Aggregated engagement */
  score: number;
  reactionCounts: Record<string, number>;
}

/** Payload for creating a new Note */
export interface NoteCreatePayload {
  body: string;
  tags?: string[];
}
