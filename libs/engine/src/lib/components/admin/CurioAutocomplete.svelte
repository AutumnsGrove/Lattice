<script>
  import { CURIO_METADATA } from "$lib/utils/markdown-directives";
  import { tick } from "svelte";

  /**
   * @typedef {Object} CurioStatusItem
   * @property {string} slug
   * @property {string} name
   * @property {boolean} enabled
   */

  // Props
  let {
    query = "",
    configuredCurios = /** @type {CurioStatusItem[]} */ ([]),
    position = { top: 0, left: 0 },
    onselect = /** @type {(directiveText: string, cursorOffset: number) => void} */ (() => {}),
    onclose = () => {},
  } = $props();

  let activeIndex = $state(0);
  /** @type {HTMLElement | null} */
  let listRef = $state(null);

  // Build lookup map from configured curios
  const configuredMap = $derived.by(() => {
    /** @type {Map<string, boolean>} */
    const map = new Map();
    for (const c of configuredCurios) {
      map.set(c.slug, c.enabled);
    }
    return map;
  });

  // Filter curio metadata based on query
  const filteredItems = $derived.by(() => {
    const q = query.toLowerCase();
    const curios = CURIO_METADATA.filter((item) => {
      if (!q) return true;
      return (
        item.id.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q)
      );
    });

    // Separate curios from system directives
    const regular = curios.filter((c) => !("system" in c && c.system));
    const system = curios.filter((c) => "system" in c && c.system);

    return { regular, system, total: regular.length + system.length };
  });

  // Reset active index when filter changes
  $effect(() => {
    // Access query to track it
    query;
    activeIndex = 0;
  });

  // Scroll active item into view
  $effect(() => {
    if (listRef && activeIndex >= 0) {
      const activeItem = listRef.querySelector(`[data-index="${activeIndex}"]`);
      if (activeItem) {
        activeItem.scrollIntoView({ block: "nearest" });
      }
    }
  });

  /**
   * Get the configured status for a curio.
   * @param {string} id
   * @returns {{ configured: boolean, enabled: boolean }}
   */
  function getStatus(id) {
    // Map curio metadata IDs to the slug used in the status data
    // Most are the same, but a few differ
    const slugMap = /** @type {Record<string, string>} */ ({
      poll: "polls",
      statusbadges: "statusbadge",
    });
    const slug = slugMap[id] || id;

    if (configuredMap.has(slug)) {
      return { configured: true, enabled: configuredMap.get(slug) ?? false };
    }
    return { configured: false, enabled: false };
  }

  /**
   * Build the directive text and cursor offset for a selected curio.
   * @param {typeof CURIO_METADATA[number]} item
   */
  function buildDirective(item) {
    if (item.requiresArg) {
      // ::name[]:: — cursor goes between the brackets
      const text = `::${item.id}[]::`;
      const cursorOffset = item.id.length + 3; // after ::name[
      return { text, cursorOffset };
    }
    // ::name:: — cursor goes after
    const text = `::${item.id}::`;
    const cursorOffset = text.length;
    return { text, cursorOffset };
  }

  /**
   * Select a curio from the list.
   * @param {typeof CURIO_METADATA[number]} item
   */
  function selectItem(item) {
    const { text, cursorOffset } = buildDirective(item);
    onselect(text, cursorOffset);
  }

  /**
   * Handle keyboard navigation. Called by parent MarkdownEditor.
   * Returns true if the key was handled (should preventDefault).
   * @param {KeyboardEvent} e
   * @returns {boolean}
   */
  export function handleKey(e) {
    const total = filteredItems.total;
    if (total === 0) return false;

    if (e.key === "ArrowDown") {
      activeIndex = (activeIndex + 1) % total;
      return true;
    }
    if (e.key === "ArrowUp") {
      activeIndex = (activeIndex - 1 + total) % total;
      return true;
    }
    if (e.key === "Enter" || e.key === "Tab") {
      // Get the item at active index
      const allItems = [...filteredItems.regular, ...filteredItems.system];
      if (allItems[activeIndex]) {
        selectItem(allItems[activeIndex]);
      }
      return true;
    }
    if (e.key === "Escape") {
      onclose();
      return true;
    }
    return false;
  }
</script>

{#if filteredItems.total > 0}
  <div
    class="curio-autocomplete"
    style="top: {position.top}px; left: {position.left}px;"
    role="listbox"
    aria-label="Curio directives"
    bind:this={listRef}
  >
    {#if filteredItems.regular.length > 0}
      <div class="curio-section-label">Curios</div>
      {#each filteredItems.regular as item, i}
        {@const status = getStatus(item.id)}
        {@const isActive = i === activeIndex}
        <button
          type="button"
          class="curio-item"
          class:active={isActive}
          class:unconfigured={!status.configured}
          data-index={i}
          role="option"
          aria-selected={isActive}
          onclick={() => selectItem(item)}
          onmouseenter={() => (activeIndex = i)}
        >
          <span class="curio-name">{item.name}</span>
          <span class="curio-id">::{item.id}::</span>
          {#if status.configured}
            <span class="curio-status configured" title="Configured">
              <span class="status-dot"></span>
            </span>
          {:else}
            <span class="curio-status" title="Not configured">
              <span class="status-dot unconfigured"></span>
            </span>
          {/if}
        </button>
      {/each}
    {/if}

    {#if filteredItems.system.length > 0}
      <div class="curio-section-label system">System</div>
      {#each filteredItems.system as item, i}
        {@const globalIndex = filteredItems.regular.length + i}
        {@const isActive = globalIndex === activeIndex}
        <button
          type="button"
          class="curio-item system"
          class:active={isActive}
          data-index={globalIndex}
          role="option"
          aria-selected={isActive}
          onclick={() => selectItem(item)}
          onmouseenter={() => (activeIndex = globalIndex)}
        >
          <span class="curio-name">{item.name}</span>
          <span class="curio-id">::{item.id}[]::</span>
          <span class="curio-status configured">
            <span class="status-dot system"></span>
          </span>
        </button>
      {/each}
    {/if}

    {#if filteredItems.total === 0}
      <div class="curio-empty">No matching directives</div>
    {/if}
  </div>
{/if}

<style>
  .curio-autocomplete {
    position: absolute;
    z-index: 200;
    min-width: 240px;
    max-width: 320px;
    max-height: 280px;
    overflow-y: auto;
    background: rgba(30, 30, 30, 0.95);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(139, 196, 139, 0.25);
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(139, 196, 139, 0.1);
    padding: 4px;
    font-family: "JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace;
    font-size: 0.8rem;
  }

  .curio-section-label {
    padding: 4px 8px 2px;
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #7a9a7a;
    font-weight: 600;
    user-select: none;
  }

  .curio-section-label.system {
    border-top: 1px solid rgba(139, 196, 139, 0.15);
    margin-top: 2px;
    padding-top: 6px;
  }

  .curio-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 6px 8px;
    background: transparent;
    border: none;
    border-radius: 4px;
    color: #d4d4d4;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    font-size: inherit;
    transition: background 0.1s ease;
  }

  .curio-item:hover,
  .curio-item.active {
    background: rgba(139, 196, 139, 0.15);
  }

  .curio-item.active {
    outline: 1px solid rgba(139, 196, 139, 0.3);
  }

  .curio-item.unconfigured {
    opacity: 0.6;
  }

  .curio-item.unconfigured:hover,
  .curio-item.unconfigured.active {
    opacity: 0.85;
  }

  .curio-name {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .curio-id {
    color: #7a9a7a;
    font-size: 0.7rem;
    flex-shrink: 0;
  }

  .curio-status {
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #4ade80;
  }

  .status-dot.unconfigured {
    background: #555;
  }

  .status-dot.system {
    background: #7ab3ff;
  }

  .curio-empty {
    padding: 8px;
    color: #5a5a5a;
    font-style: italic;
    text-align: center;
  }
</style>
