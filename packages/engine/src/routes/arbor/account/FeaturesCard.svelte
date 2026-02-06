<script lang="ts">
  import { GlassCard, Waystone, GroveTerm, GroveSwap } from "$lib/ui";
  import { BarChart3, Calendar, Sparkles } from "lucide-svelte";

  interface Props {
    curiosCount?: number;
  }

  let { curiosCount = 0 }: Props = $props();
</script>

<GlassCard variant="frosted" class="mb-6">
  <div class="section-header">
    <h2>Your Features</h2>
  </div>
  <p class="section-description">
    Explore the tools available to enhance your Grove. Each feature adds new capabilities to your site.
  </p>

  <div class="feature-grid">
    <!-- Rings (Analytics) -->
    <a href="/arbor/analytics" class="feature-item">
      <div class="feature-icon">
        <BarChart3 class="icon" />
      </div>
      <div class="feature-content">
        <div class="feature-title">
          <span><GroveTerm term="rings">Rings</GroveTerm></span>
          <Waystone slug="what-is-rings" label="Learn about Rings analytics" />
        </div>
        <p class="feature-description">
          Privacy-first analytics showing how <GroveTerm term="wanderer">Wanderers</GroveTerm> explore your Grove.
        </p>
      </div>
    </a>

    <!-- Trail -->
    <a href="/arbor/timeline" class="feature-item">
      <div class="feature-icon">
        <Calendar class="icon" />
      </div>
      <div class="feature-content">
        <div class="feature-title">
          <span><GroveSwap term="trails">Trail</GroveSwap></span>
          <Waystone slug="what-are-trails" label="Learn about Trail" />
        </div>
        <p class="feature-description">
          Track your creative journey with automated activity summaries.
        </p>
      </div>
    </a>

    <!-- Curios -->
    <a href="/arbor/curios" class="feature-item">
      <div class="feature-icon curios">
        <Sparkles class="icon" />
      </div>
      <div class="feature-content">
        <div class="feature-title">
          <span><GroveTerm term="curios">Curios</GroveTerm></span>
          <Waystone slug="what-are-curios" label="Learn about Curios" />
        </div>
        <p class="feature-description">
          Special page types like Gallery, Timeline, and Journey.
          {#if curiosCount > 0}
            <span class="curio-count">{curiosCount} active</span>
          {/if}
        </p>
      </div>
    </a>
  </div>
</GlassCard>

<style>
  .section-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .section-description {
    margin: 0 0 1.25rem 0;
    color: var(--color-text-muted);
    font-size: 0.9rem;
  }

  .feature-grid {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .feature-item {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    padding: 1rem;
    background: var(--grove-overlay-5);
    border-radius: var(--border-radius-standard);
    text-decoration: none;
    color: inherit;
    transition: background 0.15s ease;
  }

  .feature-item:hover {
    background: var(--grove-overlay-10);
  }

  .feature-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: var(--border-radius-button);
    background: var(--color-primary-subtle, rgba(34, 197, 94, 0.1));
    color: var(--color-primary);
    flex-shrink: 0;
  }

  :global(.feature-icon .icon) {
    width: 20px;
    height: 20px;
  }

  .feature-content {
    flex: 1;
    min-width: 0;
  }

  .feature-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    color: var(--color-text);
    margin-bottom: 0.25rem;
  }

  .feature-description {
    margin: 0;
    font-size: 0.85rem;
    color: var(--color-text-muted);
    line-height: 1.4;
  }

  .curio-count {
    display: inline-block;
    margin-left: 0.25rem;
    padding: 0.125rem 0.5rem;
    background: var(--color-primary-subtle, rgba(34, 197, 94, 0.15));
    color: var(--color-primary);
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  @media (max-width: 480px) {
    .feature-item {
      padding: 0.75rem;
    }

    .feature-icon {
      width: 36px;
      height: 36px;
    }

    :global(.feature-icon .icon) {
      width: 18px;
      height: 18px;
    }
  }
</style>
