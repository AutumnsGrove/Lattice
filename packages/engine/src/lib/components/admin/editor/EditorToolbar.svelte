<script>
  /**
   * EditorToolbar - Formatting toolbar for the markdown editor
   */

  let {
    readonly = false,
    showPreview = $bindable(true),
    onInsertHeading = (level) => {},
    onWrapSelection = (before, after) => {},
    onInsertLink = () => {},
    onInsertImage = () => {},
    onInsertCodeBlock = () => {},
    onInsertList = () => {},
    onInsertQuote = () => {},
    onOpenFullPreview = () => {},
  } = $props();
</script>

<div class="toolbar">
  <div class="toolbar-group">
    <button
      type="button"
      class="toolbar-btn"
      onclick={() => onInsertHeading(1)}
      title="Heading 1"
      disabled={readonly}
    >[h<span class="key">1</span>]</button>
    <button
      type="button"
      class="toolbar-btn"
      onclick={() => onInsertHeading(2)}
      title="Heading 2"
      disabled={readonly}
    >[h<span class="key">2</span>]</button>
    <button
      type="button"
      class="toolbar-btn"
      onclick={() => onInsertHeading(3)}
      title="Heading 3"
      disabled={readonly}
    >[h<span class="key">3</span>]</button>
  </div>

  <div class="toolbar-divider">|</div>

  <div class="toolbar-group">
    <button
      type="button"
      class="toolbar-btn"
      onclick={() => onWrapSelection("**", "**")}
      title="Bold (Cmd+B)"
      disabled={readonly}
    >[<span class="key">b</span>old]</button>
    <button
      type="button"
      class="toolbar-btn"
      onclick={() => onWrapSelection("_", "_")}
      title="Italic (Cmd+I)"
      disabled={readonly}
    >[<span class="key">i</span>talic]</button>
    <button
      type="button"
      class="toolbar-btn"
      onclick={() => onWrapSelection("`", "`")}
      title="Inline Code"
      disabled={readonly}
    >[<span class="key">c</span>ode]</button>
  </div>

  <div class="toolbar-divider">|</div>

  <div class="toolbar-group">
    <button
      type="button"
      class="toolbar-btn"
      onclick={onInsertLink}
      title="Link"
      disabled={readonly}
    >[<span class="key">l</span>ink]</button>
    <button
      type="button"
      class="toolbar-btn"
      onclick={onInsertImage}
      title="Image"
      disabled={readonly}
    >[i<span class="key">m</span>g]</button>
    <button
      type="button"
      class="toolbar-btn"
      onclick={onInsertCodeBlock}
      title="Code Block"
      disabled={readonly}
    >[bloc<span class="key">k</span>]</button>
  </div>

  <div class="toolbar-divider">|</div>

  <div class="toolbar-group">
    <button
      type="button"
      class="toolbar-btn"
      onclick={onInsertList}
      title="List"
      disabled={readonly}
    >[lis<span class="key">t</span>]</button>
    <button
      type="button"
      class="toolbar-btn"
      onclick={onInsertQuote}
      title="Quote"
      disabled={readonly}
    >[<span class="key">q</span>uote]</button>
  </div>

  <div class="toolbar-spacer"></div>

  <div class="toolbar-group">
    <button
      type="button"
      class="toolbar-btn toggle-btn"
      class:active={showPreview}
      onclick={() => (showPreview = !showPreview)}
      title="Toggle Preview"
    >{#if showPreview}[hide <span class="key">p</span>review]{:else}[show <span class="key">p</span>review]{/if}</button>
    <button
      type="button"
      class="toolbar-btn full-preview-btn"
      onclick={onOpenFullPreview}
      title="Open Full Preview (site styling)"
    >[<span class="key">f</span>ull]</button>
  </div>
</div>

<style>
  .key {
    color: var(--editor-accent, #8bc48b);
    font-weight: bold;
    text-decoration: underline;
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 0.15rem;
    padding: 0.4rem 0.75rem;
    background: var(--editor-bg-tertiary, var(--light-bg-primary));
    border-bottom: 1px solid var(--editor-border, var(--light-border-primary));
    flex-wrap: wrap;
    font-family: "JetBrains Mono", "Fira Code", monospace;
  }

  .toolbar-group {
    display: flex;
    gap: 0.1rem;
  }

  .toolbar-btn {
    padding: 0.2rem 0.35rem;
    background: transparent;
    border: none;
    border-radius: 0;
    color: var(--editor-accent-dim, #7a9a7a);
    font-family: inherit;
    font-size: 0.8rem;
    cursor: pointer;
    transition: color 0.1s ease;
    white-space: nowrap;
  }

  .toolbar-btn:hover:not(:disabled) {
    color: var(--editor-accent-bright, #a8dca8);
    background: transparent;
  }

  .toolbar-btn:hover:not(:disabled) .key {
    color: var(--editor-accent-glow, #c8f0c8);
  }

  .toolbar-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .toolbar-btn.toggle-btn {
    color: var(--editor-accent, #8bc48b);
  }

  .toolbar-btn.toggle-btn:hover {
    color: var(--editor-accent-glow, #c8f0c8);
  }

  .toolbar-btn.toggle-btn.active {
    color: var(--editor-accent-bright, #a8dca8);
    text-shadow: 0 0 8px color-mix(in srgb, var(--editor-accent, #8bc48b) 50%, transparent);
  }

  .toolbar-btn.full-preview-btn {
    color: #7ab3ff;
  }

  .toolbar-btn.full-preview-btn:hover {
    color: #9ac5ff;
  }

  .toolbar-btn.full-preview-btn .key {
    color: #9ac5ff;
  }

  .toolbar-divider {
    color: #4a4a4a;
    margin: 0 0.25rem;
    font-size: 0.8rem;
  }

  .toolbar-spacer {
    flex: 1;
  }
</style>
