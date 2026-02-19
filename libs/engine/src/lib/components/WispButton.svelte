<script>
  /**
   * WispButton - Toolbar integration button for Wisp
   *
   * A compact button to toggle the Wisp writing assistant panel.
   * Use this in editor toolbars or floating action buttons.
   */

  /**
   * @typedef {Object} Props
   * @property {boolean} enabled - Whether Wisp is enabled for this user
   * @property {boolean} isOpen - Whether the panel is currently open
   * @property {() => void} onClick - Callback when button is clicked
   * @property {'icon' | 'text' | 'both'} variant - Display variant
   * @property {string} className - Additional CSS classes
   */

  /** @type {Props} */
  let {
    enabled = false,
    isOpen = false,
    onClick = () => {},
    variant = "both",
    className = "",
  } = $props();
</script>

{#if enabled}
  <button
    class="wisp-btn {className}"
    class:active={isOpen}
    onclick={onClick}
    title="Toggle Wisp writing assistant"
    aria-label="Toggle Wisp writing assistant"
    aria-pressed={isOpen}
  >
    {#if variant === "icon" || variant === "both"}
      <span class="wisp-icon" aria-hidden="true">~</span>
    {/if}
    {#if variant === "text" || variant === "both"}
      <span class="wisp-label">wisp</span>
    {/if}
  </button>
{/if}

<style>
  .wisp-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.375rem 0.625rem;
    background: var(--color-surface, #2a2a2a);
    border: 1px solid var(--color-border, #3a3a3a);
    border-radius: 4px;
    color: var(--color-muted-foreground, #888);
    cursor: pointer;
    font-size: 0.75rem;
    transition: all 0.15s ease;
  }

  .wisp-btn:hover {
    background: var(--color-primary, #2d5a2d);
    border-color: var(--color-accent, #8bc48b);
    color: var(--color-foreground, #d4d4d4);
  }

  .wisp-btn.active {
    background: var(--color-primary, #2d5a2d);
    border-color: var(--color-accent, #8bc48b);
    color: var(--color-accent, #8bc48b);
  }

  .wisp-icon {
    font-family: monospace;
    font-size: 1rem;
    line-height: 1;
  }

  .wisp-label {
    text-transform: lowercase;
    letter-spacing: 0.05em;
  }
</style>
