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
  .tier-gate {
    --grove-amber-500: #f59e0b;
    --grove-amber-600: #d97706;
    --grove-stone-800: #292524;
    --grove-glass-bg: rgba(255, 251, 235, 0.95);
  }

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
    background: var(--grove-glass-bg);
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
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    border-radius: 50%;
    color: var(--grove-amber-600);
    margin-bottom: 1rem;
  }

  .fallback-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--grove-stone-800);
    margin: 0 0 0.5rem;
  }

  .fallback-description {
    font-size: 0.875rem;
    color: #78716c;
    margin: 0 0 1.25rem;
    line-height: 1.5;
  }

  .upgrade-button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1.25rem;
    background: linear-gradient(135deg, var(--grove-amber-500) 0%, var(--grove-amber-600) 100%);
    color: white;
    font-size: 0.875rem;
    font-weight: 600;
    border-radius: 9999px;
    text-decoration: none;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
  }

  .upgrade-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
  }
</style>
