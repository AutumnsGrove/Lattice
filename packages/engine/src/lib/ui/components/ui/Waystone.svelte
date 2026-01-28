<script lang="ts">
  import { HelpCircle } from 'lucide-svelte';
  import { cn } from '$lib/ui/utils';

  interface Props {
    slug: string;           // KB article path (e.g., "custom-fonts")
    label?: string;         // Screen reader label (default: "Learn more")
    size?: 'sm' | 'md';     // Size variant (default: "sm")
    inline?: boolean;       // Display inline with text (default: false)
    class?: string;
  }

  let {
    slug,
    label = 'Learn more',
    size = 'sm',
    inline = false,
    class: className
  }: Props = $props();

  // Absolute URL - KB only exists on grove.place, not tenant subdomains
  const helpUrl = $derived(`https://grove.place/knowledge/help/${slug}`);
</script>

<a
  href={helpUrl}
  target="_blank"
  rel="noopener noreferrer"
  class={cn('waystone', `waystone--${size}`, inline && 'waystone--inline', className)}
  title="Help: {label}"
>
  <span class="sr-only">Help: {label}</span>
  <HelpCircle class="waystone-icon" />
</a>

<style>
  .waystone {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: var(--glass-bg, var(--color-surface));
    border: 1px solid var(--color-border);
    color: var(--color-text-muted);
    text-decoration: none;
    transition: all 0.15s ease;
    flex-shrink: 0;
    position: relative;
  }

  /* Extend touch target to meet WCAG 2.5.5 (44×44px minimum) */
  .waystone::before {
    content: '';
    position: absolute;
    inset: -12px; /* Extends hit area beyond visual element */
    border-radius: 50%;
  }

  .waystone--sm {
    width: 20px;
    height: 20px;
  }

  .waystone--md {
    width: 24px;
    height: 24px;
  }

  .waystone--inline {
    margin-left: 0.5rem;
    vertical-align: middle;
  }

  .waystone:hover,
  .waystone:focus-visible {
    background: var(--color-accent, var(--color-primary));
    border-color: var(--color-accent, var(--color-primary));
    color: white;
  }

  .waystone:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  :global(.waystone-icon) {
    width: 14px;
    height: 14px;
  }

  .waystone--md :global(.waystone-icon) {
    width: 16px;
    height: 16px;
  }

  @media (prefers-reduced-motion: reduce) {
    .waystone {
      transition: none;
    }
  }
</style>
