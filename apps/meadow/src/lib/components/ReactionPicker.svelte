<!--
  ReactionPicker — Popover emoji grid for reactions.

  Keyboard navigable, click-outside dismissal.
  Uses the MEADOW_REACTIONS set.
-->
<script lang="ts">
  import { MEADOW_REACTIONS } from "$lib/constants/reactions";

  interface Props {
    postId: string;
    userReactions: string[];
    onreact: (postId: string, emoji: string) => void;
    onclose: () => void;
  }

  const { postId, userReactions, onreact, onclose }: Props = $props();

  const hasReacted = $derived(new Set(userReactions));

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      onclose();
    }
  }

  function handleClickOutside(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest(".reaction-picker")) {
      onclose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} onclick={handleClickOutside} />

<div
  class="reaction-picker absolute bottom-full left-0 z-10 mb-2 rounded-xl border border-white/20 bg-white/90 p-2 shadow-lg backdrop-blur-md dark:border-cream-100/20 dark:bg-cream-100/80"
  role="group"
  aria-label="React to this post"
>
  <div class="grid grid-cols-5 gap-1">
    {#each MEADOW_REACTIONS as { emoji, label }}
      <button
        type="button"
        class="flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-transform hover:scale-125 {hasReacted.has(emoji) ? 'bg-grove-100 dark:bg-cream-100/30' : 'hover:bg-grove-50 dark:hover:bg-cream-100/15'}"
        aria-label="{label} {hasReacted.has(emoji) ? '(remove)' : ''}"
        aria-pressed={hasReacted.has(emoji)}
        onclick={(e: MouseEvent) => { e.stopPropagation(); onreact(postId, emoji); }}
      >
        {emoji}
      </button>
    {/each}
  </div>
</div>

<style>
  @media (prefers-reduced-motion: reduce) {
    button {
      transition-duration: 0s !important;
    }
  }
</style>
