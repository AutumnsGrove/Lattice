<script lang="ts">
  import { GlassCard, Spinner } from "$lib/ui";
  import { ArrowUpRight, ArrowDownRight } from "lucide-svelte";
  import type { AvailableTier } from "./types";

  interface Props {
    availableTiers: AvailableTier[];
    changingPlan: boolean;
    selectedPlan: string;
    hasSubscription: boolean;
    onChangePlan: (planId: string) => void;
  }

  let {
    availableTiers,
    changingPlan,
    selectedPlan,
    hasSubscription,
    onChangePlan,
  }: Props = $props();

  // Filter to only show available tiers
  const displayTiers = $derived(
    availableTiers.filter((t) => t.status === "available")
  );

  // Only render if there are multiple tiers to choose from
  const shouldRender = $derived(hasSubscription && displayTiers.length > 1);
</script>

{#if shouldRender}
  <GlassCard variant="default" class="mb-6">
    <h2>Change Plan</h2>
    <p class="section-description">
      Upgrade for more features or downgrade if you need less.
      Changes are pro-rated based on your billing cycle.
    </p>

    <div class="plan-grid" role="group" aria-label="Available plans">
      {#each displayTiers as tier}
        {@const isProcessing = changingPlan && selectedPlan === tier.id}
        <button
          class="plan-option"
          class:current={tier.isCurrent}
          class:disabled={tier.status === "coming_soon" || changingPlan}
          onclick={() => onChangePlan(tier.id)}
          disabled={tier.isCurrent || tier.status === "coming_soon" || changingPlan}
          aria-label="{tier.name} plan, ${tier.monthlyPrice} per month{tier.isCurrent
            ? ' (current plan)'
            : tier.isUpgrade
              ? ' (upgrade)'
              : ' (downgrade)'}"
          aria-busy={isProcessing}
          aria-pressed={tier.isCurrent}
        >
          <div class="plan-option-header">
            <span class="plan-option-name">{tier.name}</span>
            {#if tier.isCurrent}
              <span class="current-badge" aria-hidden="true">Current</span>
            {:else if tier.isUpgrade}
              <ArrowUpRight class="direction-icon upgrade" aria-hidden="true" />
            {:else}
              <ArrowDownRight class="direction-icon downgrade" aria-hidden="true" />
            {/if}
          </div>

          <div class="plan-option-price">
            <span class="price-amount">${tier.monthlyPrice}</span>
            <span class="price-period">/month</span>
          </div>

          <ul class="plan-option-features" aria-label="Plan features">
            {#each tier.features.slice(0, 3) as feature}
              <li>{feature}</li>
            {/each}
          </ul>

          {#if isProcessing}
            <span aria-hidden="true"><Spinner size="sm" /></span>
          {/if}
        </button>
      {/each}
    </div>
  </GlassCard>
{/if}

<style>
  .section-description {
    margin: 0 0 1rem 0;
    color: var(--color-text-muted);
    font-size: 0.9rem;
    line-height: 1.5;
  }

  .plan-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .plan-option {
    padding: 1rem;
    border: 2px solid var(--color-border);
    border-radius: var(--border-radius-standard);
    background: transparent;
    cursor: pointer;
    text-align: left;
    transition: border-color 0.2s, background-color 0.2s;
  }

  .plan-option:hover:not(.current):not(.disabled) {
    border-color: var(--color-primary);
    background: var(--grove-overlay-5);
  }

  .plan-option.current {
    border-color: var(--color-primary);
    background: rgba(44, 95, 45, 0.08);
    cursor: default;
  }

  .plan-option.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .plan-option-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .plan-option-name {
    font-weight: 600;
    color: var(--color-text);
  }

  .current-badge {
    font-size: 0.75rem;
    padding: 0.125rem 0.5rem;
    background: var(--color-primary);
    color: white;
    border-radius: 9999px;
  }

  :global(.direction-icon) {
    width: 1.25rem;
    height: 1.25rem;
  }

  :global(.direction-icon.upgrade) {
    color: #16a34a;
  }

  :global(.direction-icon.downgrade) {
    color: #ea580c;
  }

  .plan-option-price {
    margin-bottom: 0.75rem;
  }

  .price-amount {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .price-period {
    font-size: 0.9rem;
    color: var(--color-text-muted);
  }

  .plan-option-features {
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 0.85rem;
    color: var(--color-text-muted);
  }

  .plan-option-features li {
    padding: 0.125rem 0;
  }
</style>
