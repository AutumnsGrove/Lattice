import { getAllPosts } from "$lib/utils/markdown.js";
import type { PageServerLoad } from "./$types.js";

export const prerender = false;

export const load: PageServerLoad = () => {
  const posts = getAllPosts();

  // Extract all unique tags from posts
  const allTags = [...new Set(posts.flatMap((post) => post.tags))].sort();

  return {
    posts,
    allTags,
  };
};
