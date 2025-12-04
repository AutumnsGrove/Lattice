<script>
  /**
   * FullPreviewModal - Full-page preview modal with site styling
   */

  let {
    open = $bindable(false),
    previewHtml = "",
    title = "",
    date = "",
    tags = [],
  } = $props();

  function formatDate(dateStr) {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
</script>

<svelte:window onkeydown={(e) => e.key === "Escape" && open && (open = false)} />

{#if open}
  <div class="full-preview-modal" role="dialog" aria-modal="true">
    <div class="full-preview-backdrop" onclick={() => (open = false)}></div>
    <div class="full-preview-container">
      <header class="full-preview-header">
        <h2>:: full preview</h2>
        <div class="full-preview-actions">
          <button
            type="button"
            class="full-preview-close"
            onclick={() => (open = false)}
          >
            [<span class="key">c</span>lose]
          </button>
        </div>
      </header>
      <div class="full-preview-scroll">
        <article class="full-preview-article">
          <!-- Post Header -->
          {#if title || date || tags.length > 0}
            <header class="content-header">
              {#if title}
                <h1>{title}</h1>
              {/if}
              {#if date || tags.length > 0}
                <div class="post-meta">
                  {#if date}
                    <time datetime={date}>
                      {formatDate(date)}
                    </time>
                  {/if}
                  {#if tags.length > 0}
                    <div class="tags">
                      {#each tags as tag}
                        <span class="tag">{tag}</span>
                      {/each}
                    </div>
                  {/if}
                </div>
              {/if}
            </header>
          {/if}

          <!-- Rendered Content -->
          <div class="content-body">
            {#if previewHtml}
              {@html previewHtml}
            {:else}
              <p class="preview-placeholder">Start writing to see your content here...</p>
            {/if}
          </div>
        </article>
      </div>
    </div>
  </div>
{/if}

<style>
  .key {
    color: var(--editor-accent, #8bc48b);
    font-weight: bold;
    text-decoration: underline;
  }

  .full-preview-modal {
    position: fixed;
    inset: 0;
    z-index: 3000;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .full-preview-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
  }

  .full-preview-container {
    position: relative;
    width: 90%;
    max-width: 900px;
    height: 90vh;
    background: var(--editor-bg, #1e1e1e);
    border: 1px solid var(--editor-border-accent, #4a7c4a);
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 16px 64px rgba(0, 0, 0, 0.5);
  }

  .full-preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background: var(--editor-bg-tertiary, #1a1a1a);
    border-bottom: 1px solid var(--editor-border, #3a3a3a);
    font-family: "JetBrains Mono", "Fira Code", monospace;
  }

  .full-preview-header h2 {
    font-size: 0.85rem;
    font-weight: normal;
    color: var(--editor-accent-dim, #7a9a7a);
    margin: 0;
  }

  .full-preview-close {
    background: transparent;
    border: none;
    color: var(--editor-accent-dim, #7a9a7a);
    font-family: inherit;
    font-size: 0.85rem;
    cursor: pointer;
    transition: color 0.1s ease;
  }

  .full-preview-close:hover {
    color: var(--editor-accent, #8bc48b);
  }

  .full-preview-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 2rem;
  }

  .full-preview-article {
    max-width: 700px;
    margin: 0 auto;
  }

  .content-header {
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid var(--editor-border, #3a3a3a);
  }

  .content-header h1 {
    font-size: 2rem;
    font-weight: 600;
    color: var(--editor-text, #d4d4d4);
    margin: 0 0 0.75rem 0;
    line-height: 1.3;
  }

  .post-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1rem;
    font-size: 0.9rem;
    color: var(--editor-text-dim, #9d9d9d);
  }

  .post-meta time {
    color: var(--editor-accent-dim, #7a9a7a);
  }

  .tags {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .tag {
    padding: 0.2rem 0.5rem;
    background: var(--editor-bg-secondary, #252526);
    border: 1px solid var(--editor-border, #3a3a3a);
    border-radius: 3px;
    font-size: 0.8rem;
    color: var(--editor-text-dim, #9d9d9d);
  }

  .content-body {
    color: var(--editor-text, #d4d4d4);
    line-height: 1.7;
  }

  .content-body :global(h1),
  .content-body :global(h2),
  .content-body :global(h3),
  .content-body :global(h4) {
    color: var(--editor-text, #d4d4d4);
    margin-top: 1.5em;
    margin-bottom: 0.5em;
  }

  .content-body :global(p) {
    margin: 1em 0;
  }

  .content-body :global(a) {
    color: var(--editor-accent, #8bc48b);
    text-decoration: underline;
  }

  .content-body :global(code) {
    background: var(--editor-bg-secondary, #252526);
    padding: 0.15em 0.4em;
    border-radius: 3px;
    font-size: 0.9em;
  }

  .content-body :global(pre) {
    background: var(--editor-bg-tertiary, #1a1a1a);
    padding: 1rem;
    border-radius: 6px;
    overflow-x: auto;
    border: 1px solid var(--editor-border, #3a3a3a);
  }

  .content-body :global(pre code) {
    background: transparent;
    padding: 0;
  }

  .content-body :global(blockquote) {
    border-left: 3px solid var(--editor-accent-dim, #7a9a7a);
    margin: 1em 0;
    padding-left: 1em;
    color: var(--editor-text-dim, #9d9d9d);
    font-style: italic;
  }

  .content-body :global(ul),
  .content-body :global(ol) {
    margin: 1em 0;
    padding-left: 1.5em;
  }

  .content-body :global(li) {
    margin: 0.25em 0;
  }

  .content-body :global(img) {
    max-width: 100%;
    height: auto;
    border-radius: 6px;
    margin: 1em 0;
  }

  .content-body :global(hr) {
    border: none;
    border-top: 1px solid var(--editor-border, #3a3a3a);
    margin: 2em 0;
  }

  .preview-placeholder {
    color: var(--editor-text-dim, #9d9d9d);
    font-style: italic;
    text-align: center;
    padding: 2rem;
  }
</style>
