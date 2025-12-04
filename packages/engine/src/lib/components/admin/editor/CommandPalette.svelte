<script>
  /**
   * CommandPalette - Cmd+K style command palette for the editor
   */
  import { tick } from "svelte";

  let {
    open = $bindable(false),
    commands = [],
    onExecute = (index) => {},
  } = $props();

  let query = $state("");
  let selectedIndex = $state(0);
  let inputRef = $state(null);

  // Filter commands based on query
  let filteredCommands = $derived(
    commands.filter(cmd =>
      cmd.label.toLowerCase().includes(query.toLowerCase())
    )
  );

  // Reset state when opening
  $effect(() => {
    if (open) {
      query = "";
      selectedIndex = 0;
      tick().then(() => inputRef?.focus());
    }
  });

  function handleKeydown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % filteredCommands.length;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      selectedIndex = (selectedIndex - 1 + filteredCommands.length) % filteredCommands.length;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      executeCommand(selectedIndex);
    }
    if (e.key === "Escape") {
      open = false;
    }
  }

  function executeCommand(index) {
    const cmd = filteredCommands[index];
    if (cmd) {
      onExecute(cmd);
      open = false;
    }
  }
</script>

{#if open}
  <div class="command-palette-overlay" onclick={() => open = false}>
    <div class="command-palette" onclick={(e) => e.stopPropagation()}>
      <input
        type="text"
        class="command-palette-input"
        placeholder="> type a command..."
        bind:value={query}
        bind:this={inputRef}
        onkeydown={handleKeydown}
      />
      <div class="command-palette-list">
        {#each filteredCommands as cmd, i}
          <button
            type="button"
            class="command-palette-item"
            class:selected={i === selectedIndex}
            onclick={() => executeCommand(i)}
          >
            <span class="palette-cmd-label">{cmd.label}</span>
            {#if cmd.shortcut}
              <span class="palette-cmd-shortcut">{cmd.shortcut}</span>
            {/if}
          </button>
        {/each}
        {#if filteredCommands.length === 0}
          <div class="command-palette-empty">; no commands match</div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .command-palette-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 15vh;
    z-index: 2000;
  }

  .command-palette {
    background: var(--editor-bg-secondary, #252526);
    border: 1px solid var(--editor-border-accent, #4a7c4a);
    border-radius: 8px;
    width: 90%;
    max-width: 500px;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    font-family: "JetBrains Mono", "Fira Code", monospace;
  }

  .command-palette-input {
    width: 100%;
    padding: 0.75rem 1rem;
    background: var(--editor-bg-tertiary, #1a1a1a);
    border: none;
    border-bottom: 1px solid var(--editor-border, #3a3a3a);
    color: var(--editor-text, #d4d4d4);
    font-family: inherit;
    font-size: 0.95rem;
    outline: none;
  }

  .command-palette-input::placeholder {
    color: var(--editor-text-dim, #9d9d9d);
  }

  .command-palette-list {
    max-height: 300px;
    overflow-y: auto;
  }

  .command-palette-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 0.6rem 1rem;
    background: transparent;
    border: none;
    text-align: left;
    color: var(--editor-text, #d4d4d4);
    font-family: inherit;
    font-size: 0.85rem;
    cursor: pointer;
    transition: background 0.1s ease;
  }

  .command-palette-item:hover,
  .command-palette-item.selected {
    background: var(--editor-bg-tertiary, #1a1a1a);
  }

  .command-palette-item.selected {
    color: var(--editor-accent, #8bc48b);
  }

  .palette-cmd-shortcut {
    font-size: 0.75rem;
    color: var(--editor-accent-dim, #7a9a7a);
    padding: 0.15rem 0.4rem;
    background: var(--editor-bg, #1e1e1e);
    border-radius: 3px;
  }

  .command-palette-empty {
    padding: 1rem;
    color: var(--editor-text-dim, #9d9d9d);
    font-size: 0.85rem;
    font-style: italic;
    text-align: center;
  }
</style>
