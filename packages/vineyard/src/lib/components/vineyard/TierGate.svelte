<!--
  TierGate.svelte
  Conditionally shows content based on user tier

  Usage:
  <TierGate required="oak" current={userTier}>
    <AdvancedFeature />
    <UpgradePrompt slot="fallback" />
  </TierGate>

  Tiers (lowest to highest):
  - seedling
  - sapling
  - oak
  - grove
-->
<script lang="ts">
  import type { TierGateProps, GroveTier } from '../../types/index.js';
  import type { Snippet } from 'svelte';
  import { Lock, Sparkles } from 'lucide-svelte';

  interface Props extends TierGateProps {
    children: Snippet;
    fallback?: Snippet;
    showPreview?: boolean;
  }

  let { required, current, children, fallback, showPreview = false }: Props = $props();

  const tierLevels: Record<GroveTier, number> = {
    seedling: 0,
    sapling: 1,
    oak: 2,
    grove: 3
  };

  const tierLabels: Record<GroveTier, string> = {
    seedling: 'Seedling',
    sapling: 'Sapling',
    oak: 'Oak',
    grove: 'Grove'
  };

  const hasAccess = $derived(tierLevels[current] >= tierLevels[required]);
</script>

<div class="tier-gate" data-required={required} data-has-access={hasAccess}>
  {#if hasAccess}
    {@render children()}
  {:else}
    <div class="tier-gate-container">
      {#if showPreview}
        <div class="tier-gate-preview" aria-hidden="true">
          {@render children()}
        </div>
      {/if}

      <div class="tier-gate-overlay">
        {#if fallback}
          {@render fallback()}
        {:else}
          <div class="tier-gate-fallback">
            <div class="fallback-icon">
              <Lock size={24} />
            </div>
            <h4 class="fallback-title">
              {tierLabels[required]} Feature
            </h4>
            <p class="fallback-description">
              This feature requires {tierLabels[required]} tier or higher.
            </p>
            <a href="/upgrade" class="upgrade-button">
              <Sparkles size={16} />
              Upgrade to {tierLabels[required]}
            </a>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .tier-gate-container {
    position: relative;
    border-radius: 0.75rem;
    overflow: hidden;
  }

  .tier-gate-preview {
    filter: blur(4px);
    opacity: 0.5;
    pointer-events: none;
    user-select: none;
  }

  .tier-gate-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-surface, rgba(255, 255, 255, 0.9));
    backdrop-filter: blur(8px);
  }

  .tier-gate-container:not(:has(.tier-gate-preview)) .tier-gate-overlay {
    position: relative;
    min-height: 12rem;
  }

  .tier-gate-fallback {
    text-align: center;
    padding: 2rem;
    max-width: 20rem;
  }

  .fallback-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 3.5rem;
    height: 3.5rem;
    background: var(--color-accent-bg, #f0fdf4);
    border-radius: 50%;
    color: var(--color-primary, #16a34a);
    margin-bottom: 1rem;
  }

  .fallback-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--color-foreground, #292524);
    margin: 0 0 0.5rem;
  }

  .fallback-description {
    font-size: 0.875rem;
    color: var(--color-foreground-muted, rgba(61, 41, 20, 0.7));
    margin: 0 0 1.25rem;
    line-height: 1.5;
  }

  .upgrade-button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1.25rem;
    background: var(--color-primary, #16a34a);
    color: var(--color-primary-foreground, white);
    font-size: 0.875rem;
    font-weight: 600;
    border-radius: 9999px;
    text-decoration: none;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    box-shadow: var(--shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.1));
  }

  .upgrade-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 12px -2px rgba(0, 0, 0, 0.15);
  }

  @media (prefers-reduced-motion: reduce) {
    .upgrade-button {
      transition: none;
    }
    .upgrade-button:hover {
      transform: none;
    }
  }
</style>
