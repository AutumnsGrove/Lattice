// Fetch posts from D1 database via Cloudflare Worker API
const WORKER_URL = 'https://autumnsgrove-sync-posts.m7jv4v7npb.workers.dev';

export async function load() {
  try {
    const response = await fetch(`${WORKER_URL}/posts`);

    if (!response.ok) {
      console.error('Failed to fetch posts from worker:', response.status, response.statusText);
      return { posts: [] };
    }

    // Worker API returns an array directly, not {posts: [...]}
    const postsArray = await response.json();

    // Transform posts - tags are already parsed by the worker
    const posts = postsArray.map(/** @param {any} post */ (post) => ({
      slug: post.slug,
      title: post.title,
      date: post.date,
      tags: Array.isArray(post.tags) ? post.tags : [],
      description: post.description || '',
    }));

    return { posts };
  } catch (error) {
    console.error('Error fetching posts from worker:', error);
    return { posts: [] };
  }
}
