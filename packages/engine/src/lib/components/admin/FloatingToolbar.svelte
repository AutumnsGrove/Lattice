<script>
  import { Bold, Italic, Link, Heading1, Heading2, Heading3, Code } from "lucide-svelte";
  import { tick } from "svelte";

  /**
   * FloatingToolbar - Medium-style floating toolbar for text formatting
   * Appears above selected text with formatting options
   *
   * @security This component modifies raw markdown content but does NOT sanitize input.
   * The parent component MUST sanitize all content before persisting to the database
   * to prevent XSS attacks. Use sanitizeMarkdown() when converting to HTML for display.
   * See: $lib/utils/sanitize.js
   */

  // Props
  /** @type {{ textareaRef?: HTMLTextAreaElement | null, content?: string, readonly?: boolean, onContentChange?: (content: string) => void }} */
  let {
    textareaRef = /** @type {HTMLTextAreaElement | null} */ (null),
    content = $bindable(""),
    readonly = false,
    onContentChange = () => {},
  } = $props();

  // Toolbar state
  let isVisible = $state(false);
  let toolbarPosition = $state({ top: 0, left: 0 });
  let selectionStart = $state(0);
  let selectionEnd = $state(0);

  /** @type {HTMLDivElement | null} */
  let toolbarRef = $state(null);

  // Track selection changes
  function handleSelectionChange() {
    if (!textareaRef || readonly) return;

    const start = textareaRef.selectionStart;
    const end = textareaRef.selectionEnd;

    // Only show toolbar when there's actual selected text
    if (start !== end && document.activeElement === textareaRef) {
      selectionStart = start;
      selectionEnd = end;
      positionToolbar();
      isVisible = true;
    } else {
      isVisible = false;
    }
  }

  function positionToolbar() {
    if (!textareaRef || !toolbarRef) return;

    // Get textarea bounding rect
    const textareaRect = textareaRef.getBoundingClientRect();

    // Calculate approximate position based on selection
    // For textarea, we need to estimate position based on text metrics
    const textBeforeSelection = content.substring(0, selectionStart);
    const lines = textBeforeSelection.split('\n');
    const currentLineIndex = lines.length - 1;
    const lineHeight = parseFloat(getComputedStyle(textareaRef).lineHeight) || 24;

    // Calculate vertical position (above the selection)
    const scrollTop = textareaRef.scrollTop;
    const lineTop = currentLineIndex * lineHeight - scrollTop;
    const toolbarTop = textareaRect.top + lineTop - 48; // 48px gap above selection

    // Calculate horizontal center
    const toolbarWidth = toolbarRef?.offsetWidth || 200;
    let toolbarLeft = textareaRect.left + (textareaRect.width / 2) - (toolbarWidth / 2);

    // Viewport constraints
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 12;

    // Constrain to viewport
    toolbarLeft = Math.max(padding, Math.min(toolbarLeft, viewportWidth - toolbarWidth - padding));
    const finalTop = Math.max(padding, Math.min(toolbarTop, viewportHeight - 60));

    toolbarPosition = {
      top: finalTop,
      left: toolbarLeft,
    };
  }

  /**
   * Wrap selected text with formatting markers
   * @param {string} before
   * @param {string} after
   */
  async function wrapSelection(before, after) {
    if (!textareaRef) return;

    const selectedText = content.substring(selectionStart, selectionEnd);
    const newContent =
      content.substring(0, selectionStart) +
      before + selectedText + after +
      content.substring(selectionEnd);

    content = newContent;
    onContentChange(newContent);

    await tick();

    // Restore selection inside the wrapped text
    textareaRef.selectionStart = selectionStart + before.length;
    textareaRef.selectionEnd = selectionEnd + before.length;
    textareaRef.focus();

    // Defer visibility check to allow selection to update
    requestAnimationFrame(() => {
      const selection = window.getSelection();
      if (!selection || selection.toString().length === 0) {
        isVisible = false;
      }
    });
  }

  /**
   * Insert text at beginning of selected line(s)
   * @param {string} prefix
   */
  async function insertLinePrefix(prefix) {
    if (!textareaRef) return;

    // Find the start of the current line
    const beforeSelection = content.substring(0, selectionStart);
    const lineStart = beforeSelection.lastIndexOf('\n') + 1;

    const newContent =
      content.substring(0, lineStart) +
      prefix +
      content.substring(lineStart);

    content = newContent;
    onContentChange(newContent);

    await tick();

    // Position cursor after the prefix
    const newPos = selectionStart + prefix.length;
    textareaRef.selectionStart = newPos;
    textareaRef.selectionEnd = selectionEnd + prefix.length;
    textareaRef.focus();

    // Defer visibility check to allow selection to update
    requestAnimationFrame(() => {
      const selection = window.getSelection();
      if (!selection || selection.toString().length === 0) {
        isVisible = false;
      }
    });
  }

  function handleBold() {
    wrapSelection("**", "**");
  }

  function handleItalic() {
    wrapSelection("_", "_");
  }

  function handleCode() {
    wrapSelection("`", "`");
  }

  function handleLink() {
    wrapSelection("[", "](url)");
  }

  function handleH1() {
    insertLinePrefix("# ");
  }

  function handleH2() {
    insertLinePrefix("## ");
  }

  function handleH3() {
    insertLinePrefix("### ");
  }

  /** @param {MouseEvent} e */
  function handleClickOutside(e) {
    if (toolbarRef && !toolbarRef.contains(/** @type {Node} */ (e.target)) && e.target !== textareaRef) {
      isVisible = false;
    }
  }

  /**
   * Handle keyboard shortcuts for formatting
   * @param {KeyboardEvent} e
   */
  function handleKeyboardShortcuts(e) {
    if (!textareaRef || readonly) return;
    if (document.activeElement !== textareaRef) return;

    const isMod = e.metaKey || e.ctrlKey;
    if (!isMod) return;

    // Update selection state before applying formatting
    selectionStart = textareaRef.selectionStart;
    selectionEnd = textareaRef.selectionEnd;

    // Only apply if there's a selection
    if (selectionStart === selectionEnd) return;

    switch (e.key.toLowerCase()) {
      case 'b':
        e.preventDefault();
        handleBold();
        break;
      case 'i':
        e.preventDefault();
        handleItalic();
        break;
    }
  }

  // Track if the textarea is focused to avoid global listener interference
  let isTextareaFocused = $state(false);

  // Handle focus/blur on textarea to manage global listeners lifecycle
  function handleTextareaFocus() {
    isTextareaFocused = true;
  }

  /** @param {FocusEvent} e */
  function handleTextareaBlur(e) {
    // If focus moved to toolbar, keep it open
    if (e.relatedTarget && toolbarRef?.contains(/** @type {Node} */ (e.relatedTarget))) {
      return;
    }
    isTextareaFocused = false;
    isVisible = false;
  }

  // Set up focus tracking on the textarea
  $effect(() => {
    if (!textareaRef) return;

    textareaRef.addEventListener("focus", handleTextareaFocus);
    textareaRef.addEventListener("blur", handleTextareaBlur);

    // Check if already focused
    if (document.activeElement === textareaRef) {
      isTextareaFocused = true;
    }

    return () => {
      textareaRef?.removeEventListener("focus", handleTextareaFocus);
      textareaRef?.removeEventListener("blur", handleTextareaBlur);
    };
  });

  // Only add global listeners when textarea is focused
  // This prevents interference with other form elements in the admin panel
  $effect(() => {
    if (!isTextareaFocused) {
      isVisible = false;
      return;
    }

    // Use selectionchange for more reliable selection tracking (catches programmatic changes)
    document.addEventListener("selectionchange", handleSelectionChange);
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyboardShortcuts);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyboardShortcuts);
    };
  });

  // Re-position when selection changes
  $effect(() => {
    if (isVisible && toolbarRef) {
      positionToolbar();
    }
  });
</script>

{#if isVisible}
  <div
    bind:this={toolbarRef}
    class="floating-toolbar"
    style="top: {toolbarPosition.top}px; left: {toolbarPosition.left}px;"
    role="toolbar"
    aria-label="Text formatting toolbar"
  >
    <button
      type="button"
      class="toolbar-btn"
      onclick={handleBold}
      title="Bold (Cmd+B)"
      aria-label="Bold"
    >
      <Bold size={16} />
    </button>

    <button
      type="button"
      class="toolbar-btn"
      onclick={handleItalic}
      title="Italic (Cmd+I)"
      aria-label="Italic"
    >
      <Italic size={16} />
    </button>

    <button
      type="button"
      class="toolbar-btn"
      onclick={handleCode}
      title="Inline code"
      aria-label="Code"
    >
      <Code size={16} />
    </button>

    <div class="toolbar-divider"></div>

    <button
      type="button"
      class="toolbar-btn"
      onclick={handleLink}
      title="Insert link"
      aria-label="Link"
    >
      <Link size={16} />
    </button>

    <div class="toolbar-divider"></div>

    <button
      type="button"
      class="toolbar-btn"
      onclick={handleH1}
      title="Heading 1"
      aria-label="Heading 1"
    >
      <Heading1 size={16} />
    </button>

    <button
      type="button"
      class="toolbar-btn"
      onclick={handleH2}
      title="Heading 2"
      aria-label="Heading 2"
    >
      <Heading2 size={16} />
    </button>

    <button
      type="button"
      class="toolbar-btn"
      onclick={handleH3}
      title="Heading 3"
      aria-label="Heading 3"
    >
      <Heading3 size={16} />
    </button>
  </div>
{/if}

<style>
  .floating-toolbar {
    position: fixed;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.5rem 0.75rem;
    background: rgba(30, 30, 30, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 9999px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(8px);
    z-index: 1000;
    animation: toolbar-appear 0.15s ease-out;
  }

  @keyframes toolbar-appear {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .toolbar-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: 6px;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .toolbar-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.95);
  }

  .toolbar-btn:active {
    transform: scale(0.95);
  }

  .toolbar-divider {
    width: 1px;
    height: 20px;
    background: rgba(255, 255, 255, 0.15);
    margin: 0 0.25rem;
  }
</style>
