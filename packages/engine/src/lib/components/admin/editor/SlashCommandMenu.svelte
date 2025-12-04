<script>
  /**
   * SlashCommandMenu - Popup menu for slash commands in the editor
   */

  let {
    open = $bindable(false),
    commands = [],
    selectedIndex = $bindable(0),
    onExecute = (index) => {},
  } = $props();

  // Filter commands that match query (if any)
  let filteredCommands = $derived(commands);
</script>

{#if open}
  <div class="slash-menu">
    <div class="slash-menu-header">:: commands</div>
    {#each filteredCommands as cmd, i}
      <button
        type="button"
        class="slash-menu-item"
        class:selected={i === selectedIndex}
        onclick={() => onExecute(i)}
      >
        <span class="slash-cmd-label">{cmd.label}</span>
      </button>
    {/each}
    {#if filteredCommands.length === 0}
      <div class="slash-menu-empty">; no commands found</div>
    {/if}
  </div>
{/if}

<style>
  .slash-menu {
    position: absolute;
    bottom: 100%;
    left: 1rem;
    margin-bottom: 0.5rem;
    background: var(--editor-bg-secondary, #252526);
    border: 1px solid var(--editor-border-accent, #4a7c4a);
    border-radius: 6px;
    min-width: 200px;
    max-height: 300px;
    overflow-y: auto;
    z-index: 1000;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    font-family: "JetBrains Mono", "Fira Code", monospace;
  }

  .slash-menu-header {
    padding: 0.5rem 0.75rem;
    font-size: 0.7rem;
    color: var(--editor-accent-dim, #7a9a7a);
    border-bottom: 1px solid var(--editor-border, #3a3a3a);
    text-transform: lowercase;
  }

  .slash-menu-item {
    display: block;
    width: 100%;
    padding: 0.5rem 0.75rem;
    background: transparent;
    border: none;
    text-align: left;
    color: var(--editor-text, #d4d4d4);
    font-family: inherit;
    font-size: 0.85rem;
    cursor: pointer;
    transition: background 0.1s ease;
  }

  .slash-menu-item:hover,
  .slash-menu-item.selected {
    background: var(--editor-bg-tertiary, #1a1a1a);
  }

  .slash-menu-item.selected {
    color: var(--editor-accent, #8bc48b);
  }

  .slash-menu-empty {
    padding: 0.75rem;
    color: var(--editor-text-dim, #9d9d9d);
    font-size: 0.8rem;
    font-style: italic;
  }
</style>
