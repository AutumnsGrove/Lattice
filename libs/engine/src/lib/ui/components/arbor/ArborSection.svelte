<!--
  ArborSection — Standardized section page wrapper

  Provides a consistent layout for individual Arbor pages: title + icon,
  optional description, optional action buttons, and content area.

  Usage:
    import { ArborSection } from '@autumnsgrove/lattice/ui/arbor';

    <ArborSection title="Garden" description="Manage your blog posts" icon={FileText}>
      page content here
    </ArborSection>
-->
<script lang="ts">
  import { resolveTerm } from "../../utils/grove-term-resolve";
  import type { ArborSectionProps } from "./types";

  let { title, description, icon, termSlug, actions, children }: ArborSectionProps = $props();

  let resolvedTitle = $derived(termSlug ? resolveTerm(termSlug) : title);
</script>

<section class="arbor-section">
  <div class="arbor-section-header">
    <div class="arbor-section-title-row">
      {#if icon}
        {@const Icon = icon}
        <Icon class="arbor-section-icon" />
      {/if}
      <h1 class="arbor-section-title">{resolvedTitle}</h1>
    </div>
    {#if actions}
      <div class="arbor-section-actions">
        {@render actions()}
      </div>
    {/if}
  </div>
  {#if description}
    <p class="arbor-section-description">{description}</p>
  {/if}
  <div class="arbor-section-content">
    {@render children()}
  </div>
</section>

<style>
  .arbor-section {
    width: 100%;
  }

  .arbor-section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 0.5rem;
  }

  .arbor-section-title-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .arbor-section-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--color-text);
    margin: 0;
  }

  :global(.arbor-section-icon) {
    width: 1.5rem;
    height: 1.5rem;
    color: var(--user-accent, var(--color-primary));
    flex-shrink: 0;
  }

  .arbor-section-description {
    color: var(--color-text-muted);
    font-size: 0.9rem;
    margin: 0 0 1.5rem 0;
    line-height: 1.5;
  }

  :global(.dark) .arbor-section-description {
    color: var(--grove-text-muted);
  }

  .arbor-section-content {
    width: 100%;
  }

  .arbor-section-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
</style>
