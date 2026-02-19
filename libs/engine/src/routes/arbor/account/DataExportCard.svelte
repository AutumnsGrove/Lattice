<script lang="ts">
  import { GlassCard, Button, Waystone } from "$lib/ui";
  import { Archive } from "lucide-svelte";

  interface ExportCounts {
    posts: number;
    pages: number;
    media: number;
  }

  interface Props {
    exportCounts: ExportCounts;
  }

  let { exportCounts }: Props = $props();
</script>

<GlassCard variant="default" class="mb-6">
  <h2>Your Data <Waystone slug="exporting-your-content" label="Learn about data portability" inline /></h2>
  <p class="section-description">
    You own your content. Export your blog posts, pages, images, and account
    data at any time. We believe in data portability — you should never feel
    locked in.
  </p>

  <div class="export-summary">
    Your grove contains {exportCounts.posts} posts, {exportCounts.pages} pages, and {exportCounts.media} media files.
  </div>

  <div class="zip-export-callout">
    <Archive class="callout-icon" aria-hidden="true" />
    <div class="callout-content">
      <strong>Full Zip Export</strong>
      <p>Download all your content as Markdown files with images — ready for any platform.</p>
      <Button
        variant="secondary"
        href="/arbor/export"
        aria-label="Go to full export page"
      >
        <Archive class="btn-icon" aria-hidden="true" />
        Go to Full Export
      </Button>
    </div>
  </div>
</GlassCard>

<style>
  .section-description {
    margin: 0 0 1rem 0;
    color: var(--color-text-muted);
    font-size: 0.9rem;
    line-height: 1.5;
  }

  .export-summary {
    margin: 0 0 1rem 0;
    padding: 0.75rem 1rem;
    background: rgba(44, 95, 45, 0.05);
    border-radius: var(--border-radius-small);
    font-size: 0.85rem;
    color: var(--color-text-muted);
  }

  .zip-export-callout {
    display: flex;
    gap: 0.75rem;
    padding: 1rem;
    background: rgba(44, 95, 45, 0.08);
    border: 1px solid rgba(44, 95, 45, 0.2);
    border-radius: var(--border-radius-standard);
  }

  :global(.dark) .zip-export-callout {
    background: rgba(34, 197, 94, 0.08);
    border-color: rgba(34, 197, 94, 0.2);
  }

  :global(.callout-icon) {
    width: 1.25rem;
    height: 1.25rem;
    color: var(--color-primary);
    flex-shrink: 0;
    margin-top: 2px;
  }

  .callout-content strong {
    display: block;
    margin-bottom: 0.25rem;
    color: var(--color-text);
    font-size: 0.9rem;
  }

  .callout-content p {
    margin: 0 0 0.75rem 0;
    font-size: 0.85rem;
    color: var(--color-text-muted);
    line-height: 1.4;
  }

  :global(.btn-icon) {
    width: 1rem;
    height: 1rem;
    margin-right: 0.375rem;
  }
</style>
