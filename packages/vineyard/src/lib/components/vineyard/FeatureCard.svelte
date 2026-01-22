<!--
  FeatureCard.svelte
  Card component for showcasing individual features

  Usage:
  <FeatureCard
    title="Storage Overview"
    description="See usage across posts and media"
    status="ready"
    icon="HardDrive"
  >
    <DemoComponent slot="demo" />
  </FeatureCard>
-->
<script lang="ts">
  import type { FeatureCardProps } from '../../types/index.js';
  import type { Snippet, Component } from 'svelte';
  import StatusBadge from './StatusBadge.svelte';
  import * as icons from 'lucide-svelte';

  interface Props extends FeatureCardProps {
    demo?: Snippet;
  }

  let { title, description, status, icon, demo }: Props = $props();

  const IconComponent = $derived(
    icon && icon in icons ? (icons as unknown as Record<string, Component>)[icon] : null
  );
</script>

<article class="feature-card" data-status={status}>
  <div class="card-header">
    {#if IconComponent}
      <div class="feature-icon">
        <IconComponent size={24} />
      </div>
    {/if}
    <div class="feature-status">
      <StatusBadge {status} />
    </div>
  </div>

  <div class="feature-content">
    <h3 class="feature-title">{title}</h3>
    <p class="feature-description">{description}</p>
  </div>

  {#if demo}
    <div class="feature-demo">
      {@render demo()}
    </div>
  {/if}
</article>

<style>
  .feature-card {
    --grove-amber-50: #fffbeb;
    --grove-amber-100: #fef3c7;
    --grove-amber-500: #f59e0b;
    --grove-amber-600: #d97706;
    --grove-stone-800: #292524;
    --grove-glass-bg: rgba(255, 251, 235, 0.7);
    --grove-glass-border: rgba(245, 158, 11, 0.2);

    background: var(--grove-glass-bg);
    backdrop-filter: blur(12px);
    border: 1px solid var(--grove-glass-border);
    border-radius: 1rem;
    padding: 1.5rem;
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .feature-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(245, 158, 11, 0.15);
    border-color: var(--grove-amber-500);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .feature-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    background: linear-gradient(135deg, var(--grove-amber-100) 0%, var(--grove-amber-50) 100%);
    border-radius: 0.75rem;
    color: var(--grove-amber-600);
  }

  .feature-status {
    flex-shrink: 0;
  }

  .feature-content {
    flex: 1;
  }

  .feature-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--grove-stone-800);
    margin: 0 0 0.5rem;
  }

  .feature-description {
    font-size: 0.9375rem;
    color: #78716c;
    margin: 0;
    line-height: 1.6;
  }

  .feature-demo {
    margin-top: 0.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--grove-glass-border);
  }
</style>
