<script>
  import { Button, Badge, GlassConfirmDialog, toast } from '$lib/ui';
  import { api } from '$lib/utils/api.js';
  import { Trash2 } from 'lucide-svelte';

  let { data } = $props();

  /** @type {{ slug: string, title: string } | null} */
  let postToDelete = $state(null);
  let showDeleteDialog = $state(false);
  let deleting = $state(false);

  /** @param {string} dateString */
  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /** @param {{ slug: string, title: string }} post */
  function confirmDelete(post) {
    postToDelete = post;
    showDeleteDialog = true;
  }

  async function handleDelete() {
    if (!postToDelete) return;

    deleting = true;
    try {
      await api.delete(`/api/posts/${postToDelete.slug}`);
      // Remove from local list
      data.posts = data.posts.filter((/** @type {{ slug: string }} */ p) => p.slug !== postToDelete?.slug);
      showDeleteDialog = false;
      postToDelete = null;
    } catch (error) {
      console.error('Failed to delete post:', error);
      toast.error('Failed to delete post', { description: 'Please try again.' });
    } finally {
      deleting = false;
    }
  }

  function handleCancelDelete() {
    showDeleteDialog = false;
    postToDelete = null;
  }
</script>

<div class="max-w-screen-xl">
  <header class="flex justify-between items-start mb-8 max-md:flex-col max-md:items-stretch max-md:gap-4">
    <div>
      <h1 class="m-0 mb-1 text-3xl text-[var(--color-text)] dark:text-[var(--color-text-dark)] transition-colors">Blog Posts</h1>
      <p class="m-0 text-[var(--color-text-muted)] dark:text-[var(--color-text-subtle-dark)] transition-colors">{data.posts.length} posts</p>
    </div>
    <Button variant="primary" onclick={() => window.location.href = '/admin/blog/new'}>
      + New Post
    </Button>
  </header>

  <div class="bg-[var(--mobile-menu-bg)] dark:bg-[var(--color-bg-tertiary-dark)] rounded-[var(--border-radius-standard)] shadow-md dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] overflow-hidden transition-[background-color,box-shadow]">
    <table class="w-full border-collapse">
      <thead>
        <tr>
          <th class="p-4 text-left border-b border-[var(--color-border)] dark:border-[var(--color-border-dark)] bg-[var(--color-bg-secondary)] dark:bg-[var(--color-border-dark)] font-semibold text-xs text-[var(--color-text)] dark:text-[var(--color-text-dark)] transition-[background-color,color,border-color] max-md:px-2 max-md:py-3">Title</th>
          <th class="p-4 text-left border-b border-[var(--color-border)] dark:border-[var(--color-border-dark)] bg-[var(--color-bg-secondary)] dark:bg-[var(--color-border-dark)] font-semibold text-xs text-[var(--color-text)] dark:text-[var(--color-text-dark)] transition-[background-color,color,border-color] max-md:hidden">Date</th>
          <th class="p-4 text-left border-b border-[var(--color-border)] dark:border-[var(--color-border-dark)] bg-[var(--color-bg-secondary)] dark:bg-[var(--color-border-dark)] font-semibold text-xs text-[var(--color-text)] dark:text-[var(--color-text-dark)] transition-[background-color,color,border-color] max-md:hidden">Tags</th>
          <th class="p-4 text-left border-b border-[var(--color-border)] dark:border-[var(--color-border-dark)] bg-[var(--color-bg-secondary)] dark:bg-[var(--color-border-dark)] font-semibold text-xs text-[var(--color-text)] dark:text-[var(--color-text-dark)] transition-[background-color,color,border-color] max-md:px-2 max-md:py-3">Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each data.posts as post (post.slug)}
          <tr>
            <td class="p-4 text-left border-b border-[var(--color-border)] dark:border-[var(--color-border-dark)] transition-[border-color] max-md:px-2 max-md:py-3">
              <a href="/blog/{post.slug}" target="_blank" rel="noopener noreferrer" aria-label="{post.title} (opens in new tab)" class="font-medium text-[var(--color-primary)] dark:text-[var(--color-primary-light)] no-underline hover:underline transition-colors">
                {post.title}
              </a>
              {#if post.description}
                <p class="mt-1 mb-0 text-xs text-[var(--color-text-muted)] dark:text-[var(--color-text-subtle-dark)] transition-colors">{post.description}</p>
              {/if}
            </td>
            <td class="p-4 text-left border-b border-[var(--color-border)] dark:border-[var(--color-border-dark)] whitespace-nowrap text-[var(--color-text-muted)] dark:text-[var(--color-text-subtle-dark)] text-sm transition-[border-color,color] max-md:hidden">{formatDate(post.date)}</td>
            <td class="p-4 text-left border-b border-[var(--color-border)] dark:border-[var(--color-border-dark)] transition-[border-color] max-md:hidden">
              {#if post.tags.length > 0}
                <div class="flex flex-wrap gap-1">
                  {#each post.tags as tag (tag)}
                    <Badge variant="tag">{tag}</Badge>
                  {/each}
                </div>
              {:else}
                <span class="text-[var(--color-text-subtle)] dark:text-[var(--color-text-subtle-dark)] transition-colors">-</span>
              {/if}
            </td>
            <td class="p-4 text-left border-b border-[var(--color-border)] dark:border-[var(--color-border-dark)] whitespace-nowrap transition-[border-color] max-md:px-2 max-md:py-3">
              <a href="/blog/{post.slug}" target="_blank" rel="noopener noreferrer" aria-label="View {post.title} (opens in new tab)" class="text-[var(--color-primary)] dark:text-[var(--color-primary-light)] no-underline text-sm mr-4 hover:underline transition-colors max-md:mr-2">View</a>
              <a href="/admin/blog/edit/{post.slug}" class="text-[var(--color-primary)] dark:text-[var(--color-primary-light)] no-underline text-sm mr-4 hover:underline transition-colors max-md:mr-2">Edit</a>
              <button
                onclick={() => confirmDelete({ slug: post.slug, title: post.title })}
                disabled={deleting}
                class="text-red-500 dark:text-red-400 text-sm hover:underline transition-colors inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:no-underline"
                aria-label="Delete {post.title}"
              >
                <Trash2 class="w-3.5 h-3.5" />
                <span class="max-md:hidden">Delete</span>
              </button>
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="4" class="text-center text-[var(--color-text-muted)] dark:text-[var(--color-text-subtle-dark)] py-12 px-4 transition-colors">
              No blog posts yet. Create your first post!
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <div class="info-box">
    <h3>How Blog Posts Work</h3>
    <p>
      Create and edit posts directly in the built-in markdown editor. Posts are saved to the database
      and available immediately.
    </p>
    <ul>
      <li>Use <strong>+ New Post</strong> to create a new post with the markdown editor</li>
      <li>Use <strong>Edit</strong> links to modify existing posts</li>
      <li>Posts from <code>UserContent/Posts/</code> are also available (synced via GitHub)</li>
    </ul>
  </div>
</div>

<!-- Delete Confirmation Dialog -->
<GlassConfirmDialog
  bind:open={showDeleteDialog}
  title="Delete Post"
  message={`Are you sure you want to delete "${postToDelete?.title}"? This action cannot be undone.`}
  confirmLabel="Delete Post"
  cancelLabel="Cancel"
  variant="danger"
  loading={deleting}
  onconfirm={handleDelete}
  oncancel={handleCancelDelete}
/>

<style>
  .info-box {
    margin-top: 2rem;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius-standard);
    padding: 1.5rem;
    transition: background-color 0.3s ease, border-color 0.3s ease;
  }

  .info-box h3 {
    margin: 0 0 0.75rem 0;
    font-size: 1rem;
    color: var(--color-text);
    transition: color 0.3s ease;
  }

  .info-box p {
    margin: 0 0 0.75rem 0;
    color: var(--color-text-muted);
    font-size: 0.9rem;
    transition: color 0.3s ease;
  }

  .info-box ul {
    margin: 0;
    padding-left: 1.25rem;
    color: var(--color-text-muted);
    font-size: 0.9rem;
    transition: color 0.3s ease;
  }

  .info-box li {
    margin-bottom: 0.25rem;
  }

  .info-box code {
    background: var(--color-border);
    padding: 0.125rem 0.25rem;
    border-radius: var(--border-radius-small);
    font-size: 0.85em;
    transition: background-color 0.3s ease;
  }
</style>
