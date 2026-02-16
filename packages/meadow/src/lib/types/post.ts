/**
 * Meadow Social Feed — Post type definitions
 */

/** A post in the Meadow community feed, aggregated from tenant RSS feeds */
export interface MeadowPost {
  id: string;
  title: string;
  description: string;
  link: string;
  authorName: string | null;
  authorSubdomain: string;
  tags: string[];
  featuredImage: string | null;
  publishedAt: number; // Unix seconds
  contentHtml: string | null;
  /** Current user's interaction state (populated server-side) */
  userVoted: boolean;
  userBookmarked: boolean;
  userReactions: string[];
  /** Aggregated engagement */
  score: number;
  reactionCounts: Record<string, number>;
}
