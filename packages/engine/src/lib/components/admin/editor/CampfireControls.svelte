<script>
  /**
   * CampfireControls - Floating controls for timed writing sessions
   */

  let {
    active = false,
    elapsed = "0:00",
    wordsWritten = 0,
    onEnd = () => {},
  } = $props();
</script>

{#if active}
  <div class="campfire-controls">
    <div class="campfire-ember"></div>
    <div class="campfire-stats">
      <span class="campfire-time">{elapsed}</span>
      <span class="campfire-words">+{wordsWritten} words</span>
    </div>
    <button type="button" class="campfire-end" onclick={onEnd}>
      [<span class="key">e</span>nd]
    </button>
  </div>
{/if}

<style>
  .key {
    color: var(--editor-accent, #8bc48b);
    font-weight: bold;
    text-decoration: underline;
  }

  .campfire-controls {
    position: absolute;
    top: 1rem;
    right: 1rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0.75rem;
    background: rgba(40, 30, 20, 0.95);
    border: 1px solid #5a4a30;
    border-radius: 6px;
    font-family: "JetBrains Mono", "Fira Code", monospace;
    font-size: 0.85rem;
    z-index: 50;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  }

  .campfire-ember {
    width: 12px;
    height: 12px;
    background: radial-gradient(circle, #ff6b35, #ff4500);
    border-radius: 50%;
    animation: ember-glow 1.5s ease-in-out infinite;
    box-shadow: 0 0 8px #ff6b35, 0 0 16px rgba(255, 107, 53, 0.5);
  }

  @keyframes ember-glow {
    0%, 100% {
      opacity: 0.8;
      transform: scale(1);
    }
    50% {
      opacity: 1;
      transform: scale(1.1);
    }
  }

  .campfire-stats {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .campfire-time {
    color: #ffb347;
    font-weight: 500;
  }

  .campfire-words {
    font-size: 0.75rem;
    color: #c9a86c;
  }

  .campfire-end {
    background: transparent;
    border: none;
    color: #9d8060;
    font-family: inherit;
    font-size: 0.8rem;
    cursor: pointer;
    transition: color 0.1s ease;
    padding: 0;
  }

  .campfire-end:hover {
    color: #ffb347;
  }
</style>
