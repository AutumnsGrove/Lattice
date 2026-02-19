<script lang="ts">
  import { enhance } from "$app/forms";
  import { GlassCard, GlassButton, toast } from "$lib/ui/components/ui";
  import { Rss, Plus, Trash2, ExternalLink } from "lucide-svelte";

  let { data, form } = $props();

  let showAddForm = $state(false);

  $effect(() => {
    if (form?.blogAdded) {
      toast.success("Blog added to your roll");
      showAddForm = false;
    } else if (form?.blogRemoved) {
      toast.success("Blog removed");
    } else if (form?.error) {
      toast.error(form.error);
    }
  });
</script>

<svelte:head>
  <title>Blogroll - Curios</title>
</svelte:head>

<div class="blogroll-page">
  <header class="page-header">
    <div class="title-row">
      <Rss class="header-icon" />
      <h1>Blogroll</h1>
    </div>
    <p class="subtitle">
      The blogs you love, the voices you return to.
      Share your reading list with the world.
    </p>
  </header>

  <section class="add-section">
    {#if !showAddForm}
      <GlassButton variant="accent" onclick={() => (showAddForm = true)}>
        <Plus class="btn-icon" />
        Add a Blog
      </GlassButton>
    {:else}
      <GlassCard class="add-form-card">
        <h2>Add a Blog</h2>
        <form method="POST" action="?/add" use:enhance>
          <div class="form-grid">
            <div class="form-field">
              <label for="title">Blog Name</label>
              <input
                type="text"
                id="title"
                name="title"
                placeholder="My Favorite Blog"
                required
                maxlength="100"
                class="glass-input"
              />
            </div>

            <div class="form-field">
              <label for="url">Blog URL</label>
              <input
                type="url"
                id="url"
                name="url"
                placeholder="https://example.com"
                required
                class="glass-input"
              />
            </div>

            <div class="form-field full-width">
              <label for="description">Description <span class="optional">(optional)</span></label>
              <input
                type="text"
                id="description"
                name="description"
                placeholder="A brilliant blog about..."
                maxlength="300"
                class="glass-input"
              />
            </div>

            <div class="form-field">
              <label for="feedUrl">RSS Feed URL <span class="optional">(optional)</span></label>
              <input
                type="url"
                id="feedUrl"
                name="feedUrl"
                placeholder="https://example.com/feed.xml"
                class="glass-input"
              />
            </div>
          </div>

          <div class="form-actions">
            <GlassButton type="submit" variant="accent">
              <Plus class="btn-icon" />
              Add Blog
            </GlassButton>
            <GlassButton variant="ghost" onclick={() => (showAddForm = false)}>
              Cancel
            </GlassButton>
          </div>
        </form>
      </GlassCard>
    {/if}
  </section>

  <section class="blogs-section">
    {#if data.items.length === 0}
      <GlassCard class="empty-card">
        <Rss class="empty-icon" />
        <p>Your blogroll is empty.</p>
        <p class="empty-hint">Add the blogs you love to share them with visitors.</p>
      </GlassCard>
    {:else}
      <div class="blog-list">
        {#each data.items as blog}
          <GlassCard class="blog-card">
            <div class="blog-header">
              <div class="blog-info">
                {#if blog.faviconUrl}
                  <img src={blog.faviconUrl} alt="" class="blog-favicon" width="16" height="16" />
                {/if}
                <div>
                  <h3>
                    <a href={blog.url} target="_blank" rel="noopener noreferrer">
                      {blog.title}
                      <ExternalLink class="external-icon" />
                    </a>
                  </h3>
                  {#if blog.description}
                    <p class="blog-description">{blog.description}</p>
                  {/if}
                  {#if blog.lastPostTitle}
                    <p class="latest-post">
                      Latest: <a href={blog.lastPostUrl} target="_blank" rel="noopener noreferrer">{blog.lastPostTitle}</a>
                    </p>
                  {/if}
                </div>
              </div>
              <form method="POST" action="?/remove" use:enhance>
                <input type="hidden" name="blogId" value={blog.id} />
                <GlassButton type="submit" variant="ghost" class="remove-btn" title="Remove blog" aria-label="Remove blog">
                  <Trash2 class="btn-icon" />
                </GlassButton>
              </form>
            </div>
          </GlassCard>
        {/each}
      </div>
    {/if}
  </section>
</div>

<style>
  .blogroll-page { max-width: 800px; margin: 0 auto; }
  .page-header { margin-bottom: 2rem; }
  .title-row { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
  :global(.header-icon) { width: 2rem; height: 2rem; color: var(--color-primary); }
  h1 { font-size: 2rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .subtitle { color: var(--color-text-muted); font-size: 0.95rem; line-height: 1.6; max-width: 600px; }
  .add-section { margin-bottom: 2rem; }
  :global(.add-form-card) { padding: 1.5rem; }
  h2 { font-size: 1.25rem; font-weight: 600; margin: 0 0 1.25rem 0; color: var(--color-text); }
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .full-width { grid-column: 1 / -1; }
  .form-field { display: flex; flex-direction: column; gap: 0.375rem; }
  .form-field label { font-size: 0.85rem; font-weight: 500; color: var(--color-text-muted); }
  .optional { font-weight: 400; opacity: 0.7; }
  .glass-input { padding: 0.5rem 0.75rem; border: 1px solid var(--grove-overlay-12); border-radius: var(--border-radius-standard); background: var(--grove-overlay-4); color: var(--color-text); font-size: 0.9rem; }
  .glass-input:focus { outline: none; border-color: var(--color-primary); }
  .form-actions { display: flex; gap: 0.75rem; margin-top: 1.25rem; }
  :global(.btn-icon) { width: 1rem; height: 1rem; margin-right: 0.375rem; }
  :global(.empty-card) { padding: 3rem 1.5rem; text-align: center; }
  :global(.empty-icon) { width: 3rem; height: 3rem; color: var(--color-text-muted); opacity: 0.5; margin-bottom: 1rem; }
  .empty-hint { font-size: 0.85rem; color: var(--color-text-muted); opacity: 0.7; }
  .blog-list { display: flex; flex-direction: column; gap: 0.75rem; }
  :global(.blog-card) { padding: 1rem 1.25rem; }
  .blog-header { display: flex; justify-content: space-between; align-items: flex-start; }
  .blog-info { display: flex; gap: 0.75rem; align-items: flex-start; }
  .blog-favicon { border-radius: 2px; margin-top: 0.25rem; }
  .blog-info h3 { font-size: 1rem; font-weight: 600; margin: 0; }
  .blog-info h3 a { color: var(--color-text); text-decoration: none; display: inline-flex; align-items: center; gap: 0.375rem; }
  .blog-info h3 a:hover { color: var(--color-primary); }
  :global(.external-icon) { width: 0.75rem; height: 0.75rem; opacity: 0.5; }
  .blog-description { font-size: 0.85rem; color: var(--color-text-muted); margin: 0.25rem 0 0; }
  .latest-post { font-size: 0.8rem; color: var(--color-text-muted); margin: 0.375rem 0 0; }
  .latest-post a { color: var(--color-primary); text-decoration: none; }
  .latest-post a:hover { text-decoration: underline; }
  :global(.remove-btn) { min-width: 2.75rem; min-height: 2.75rem; }
  @media (max-width: 640px) { .form-grid { grid-template-columns: 1fr; } }
</style>
