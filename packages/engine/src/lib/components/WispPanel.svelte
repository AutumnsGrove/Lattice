<script>
  import { slide, fade } from "svelte/transition";
  import { Button } from "$lib/ui/components/primitives/button";
  import { MAX_CONTENT_LENGTH } from "$lib/config/wisp.js";

  /**
   * @typedef {Object} Props
   * @property {string} content - Content to analyze
   * @property {boolean} enabled - Whether Wisp is enabled
   * @property {string} postTitle - Optional post title for context
   * @property {string} postSlug - Optional post slug for logging
   * @property {(original: string, suggestion: string) => void} onApplyFix - Callback when user applies a fix
   */

  /** @type {Props} */
  let {
    content = "",
    enabled = false,
    postTitle = "",
    postSlug = "",
    onApplyFix = (original, suggestion) => {},
  } = $props();

  // Panel state
  let isOpen = $state(false);
  let isMinimized = $state(true);

  // Analysis state
  let isAnalyzing = $state(false);
  let analysisError = $state(null);
  let results = $state(null);
  let activeTab = $state("grammar");
  let selectedMode = $state("quick"); // quick or thorough

  // ASCII art vibes - text landscapes that create atmosphere
  const vibes = {
    idle: `
      .  *  .    .  *
   .    _    .      .
  .   /   \\    *  .
     / ~ ~ \\  .    .
    /       \\______
   ~~~~~~~~~~~~~~~~~~~`,

    analyzing: `
    . * . analyzing . *
      \\  |  /
    -- (o.o) --  thinking
      /  |  \\
   ~~~~~~~~~~~~~~~~~
     words flowing...`,

    success: `
              *
    .    *  /|\\   .
   *   .   / | \\    *
         /__|__\\
    ~~~~~/      \\~~~~
      all clear  `,

    grammarGood: `
        .-~~~-.
      .'       '.
     /  ^   ^   \\
    |  (o) (o)  |  nice!
     \\   <=>   /
      '-.___.-'`,

    toneWarm: `
       __/\\__
      \\      /
    <(  ~~~~  )>
      /      \\
     /   ^^   \\
    warm & cozy`,

    error: `
      .  x  .
        /|\\
       / | \\  oops
      /  |  \\
    _____|_____
    try again?`,
  };

  // Get current vibe based on state
  let currentVibe = $derived(() => {
    if (isAnalyzing) return vibes.analyzing;
    if (analysisError) return vibes.error;
    if (results?.grammar?.overallScore >= 90) return vibes.grammarGood;
    if (results?.tone) return vibes.toneWarm;
    if (results) return vibes.success;
    return vibes.idle;
  });

  // Seasonal vibe rotation for idle state
  const seasonalVibes = [
    // Forest morning
    `
    .  *  .    .  *
  .    _    .      .
     /   \\    *  .
    / ~ ~ \\  .    .
   /       \\______
  ~~~~~~~~~~~~~~~~~~~`,
    // Starry grove
    `
  *  .  * .  *  .  *
    .  *    *  .
        _/\\_     *
   .   /    \\  .
   ___/      \\___
  ~~~~~~  ~~~~~~~~~`,
    // Mountain vista
    `
        /\\
    .  /  \\  .  *
      /    \\    .
   * /  /\\  \\  .
  __/  /  \\  \\__
  ~~~~~~~~~~~~~~~~`,
    // Meadow
    `
   . * . * . * . * .
     ~  ~  ~  ~  ~
    ,  ,  ,  ,  ,  ,
   v v v v v v v v v
   | | | | | | | | |
  ==================`,
    // Night grove
    `
  * . . * . . * . *
     .    *    .
      \\  | /
   --- (._.) ---
      /  |  \\
  ~~~quiet night~~~`,
  ];

  let vibeIndex = $state(0);
  let panelRef = $state(null);

  // Content length status
  let contentLengthStatus = $derived(() => {
    const len = content.length;
    const pct = Math.round((len / MAX_CONTENT_LENGTH) * 100);
    if (len > MAX_CONTENT_LENGTH) return { status: "over", pct: 100, len };
    if (pct > 80) return { status: "warn", pct, len };
    return { status: "ok", pct, len };
  });

  // Rotate through vibes when idle
  $effect(() => {
    if (!isOpen || isAnalyzing || results) return;

    const interval = setInterval(() => {
      vibeIndex = (vibeIndex + 1) % seasonalVibes.length;
    }, 8000);

    return () => clearInterval(interval);
  });

  // Handle keyboard navigation
  function handleKeydown(e) {
    if (e.key === "Escape" && isOpen) {
      e.preventDefault();
      minimize();
    }
  }

  // Get the display vibe
  let displayVibe = $derived(() => {
    if (isAnalyzing) return vibes.analyzing;
    if (analysisError) return vibes.error;
    if (results) return currentVibe();
    return seasonalVibes[vibeIndex];
  });

  // Run analysis
  async function runAnalysis(action = "all") {
    if (!content.trim()) {
      analysisError = "Write something first!";
      return;
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      analysisError = `Content too long (${content.length.toLocaleString()} chars). Max ${MAX_CONTENT_LENGTH.toLocaleString()}.`;
      return;
    }

    isAnalyzing = true;
    analysisError = null;

    try {
      const res = await fetch("/api/grove/wisp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          action,
          mode: selectedMode,
          context: { title: postTitle, slug: postSlug }
        })
      });

      if (res.ok) {
        results = await res.json();
        if (action === "grammar") activeTab = "grammar";
        else if (action === "tone") activeTab = "tone";
        else if (action === "readability") activeTab = "readability";
      } else {
        const error = await res.json();
        analysisError = error.error || "Analysis failed";
      }
    } catch (err) {
      analysisError = "Could not connect to Wisp";
    } finally {
      isAnalyzing = false;
    }
  }

  // Apply a grammar fix
  function applyFix(suggestion) {
    onApplyFix(suggestion.original, suggestion.suggestion);
    // Remove from list
    if (results?.grammar?.suggestions) {
      results.grammar.suggestions = results.grammar.suggestions.filter(
        s => s.original !== suggestion.original
      );
    }
  }

  // Clear results
  function clearResults() {
    results = null;
    analysisError = null;
  }

  // Toggle panel
  function togglePanel() {
    if (isMinimized) {
      isMinimized = false;
      isOpen = true;
    } else {
      isOpen = !isOpen;
    }
  }

  // Minimize to tab
  function minimize() {
    isMinimized = true;
    isOpen = false;
  }

  // Severity colors
  function getSeverityClass(severity) {
    switch (severity) {
      case "error": return "severity-error";
      case "warning": return "severity-warning";
      default: return "severity-style";
    }
  }

  // Format score as visual bar
  function formatScore(score) {
    if (score === null || score === undefined) return "░░░░░░░░░░";
    const filled = Math.round(score / 10);
    const empty = 10 - filled;
    return "█".repeat(filled) + "░".repeat(empty);
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if enabled}
  <!-- Minimized tab on the side -->
  {#if isMinimized}
    <button
      class="wisp-tab"
      onclick={togglePanel}
      title="Open Wisp"
      aria-label="Open Wisp writing assistant"
      transition:fade={{ duration: 150 }}
    >
      <span class="tab-icon" aria-hidden="true">~</span>
      <span class="tab-text">wisp</span>
    </button>
  {/if}

  <!-- Main panel -->
  {#if isOpen && !isMinimized}
    <aside
      class="wisp-panel"
      role="complementary"
      aria-label="Wisp writing assistant"
      bind:this={panelRef}
      transition:slide={{ axis: "x", duration: 200 }}
    >
      <!-- Header -->
      <header class="panel-header">
        <h3>wisp</h3>
        <div class="header-actions">
          <button class="icon-btn" onclick={minimize} title="Minimize" aria-label="Minimize panel">
            <span aria-hidden="true">−</span>
          </button>
          <button class="icon-btn" onclick={() => isOpen = false} title="Close (Esc)" aria-label="Close panel">
            <span aria-hidden="true">×</span>
          </button>
        </div>
      </header>

      <!-- Content length indicator -->
      <div
        class="content-length"
        class:warn={contentLengthStatus().status === "warn"}
        class:over={contentLengthStatus().status === "over"}
        aria-live="polite"
      >
        <span class="length-text">
          {contentLengthStatus().len.toLocaleString()} / {MAX_CONTENT_LENGTH.toLocaleString()}
        </span>
        <div class="length-bar">
          <div class="length-fill" style="width: {contentLengthStatus().pct}%"></div>
        </div>
      </div>

      <!-- Vibes section - the ASCII art atmosphere -->
      <div class="vibes-section">
        <pre class="ascii-vibe" aria-hidden="true">{displayVibe()}</pre>
      </div>

      <!-- Mode selector -->
      <div class="mode-selector">
        <label>
          <input type="radio" bind:group={selectedMode} value="quick" />
          <span>quick</span>
        </label>
        <label>
          <input type="radio" bind:group={selectedMode} value="thorough" />
          <span>thorough</span>
        </label>
      </div>

      <!-- Action buttons -->
      <div class="actions" role="group" aria-label="Analysis actions">
        <button
          class="action-btn"
          onclick={() => runAnalysis("grammar")}
          disabled={isAnalyzing || contentLengthStatus().status === "over"}
          aria-busy={isAnalyzing}
        >
          grammar
        </button>
        <button
          class="action-btn"
          onclick={() => runAnalysis("tone")}
          disabled={isAnalyzing || contentLengthStatus().status === "over"}
          aria-busy={isAnalyzing}
        >
          tone
        </button>
        <button
          class="action-btn"
          onclick={() => runAnalysis("readability")}
          disabled={isAnalyzing}
          aria-busy={isAnalyzing}
        >
          reading
        </button>
        <button
          class="action-btn action-full"
          onclick={() => runAnalysis("all")}
          disabled={isAnalyzing || contentLengthStatus().status === "over"}
          aria-busy={isAnalyzing}
        >
          {isAnalyzing ? "thinking..." : "full check"}
        </button>
      </div>

      <!-- Error message -->
      {#if analysisError}
        <div class="error-message" transition:slide>
          <p>{analysisError}</p>
          <button onclick={() => analysisError = null}>dismiss</button>
        </div>
      {/if}

      <!-- Results -->
      {#if results}
        <div class="results" transition:slide>
          <!-- Tabs -->
          <div class="tabs">
            {#if results.grammar}
              <button
                class="tab"
                class:active={activeTab === "grammar"}
                onclick={() => activeTab = "grammar"}
              >
                grammar
              </button>
            {/if}
            {#if results.tone}
              <button
                class="tab"
                class:active={activeTab === "tone"}
                onclick={() => activeTab = "tone"}
              >
                tone
              </button>
            {/if}
            {#if results.readability}
              <button
                class="tab"
                class:active={activeTab === "readability"}
                onclick={() => activeTab = "readability"}
              >
                reading
              </button>
            {/if}
          </div>

          <!-- Grammar Results -->
          {#if activeTab === "grammar" && results.grammar}
            <div class="tab-content">
              <div class="score-display">
                <span class="score-label">clarity</span>
                <span class="score-bar">{formatScore(results.grammar.overallScore)}</span>
                <span class="score-num">{results.grammar.overallScore ?? "—"}</span>
              </div>

              {#if results.grammar.suggestions?.length > 0}
                <div class="suggestions">
                  {#each results.grammar.suggestions as suggestion}
                    <div class="suggestion {getSeverityClass(suggestion.severity)}">
                      <div class="suggestion-original">
                        <span class="strike">{suggestion.original}</span>
                      </div>
                      <div class="suggestion-fix">
                        <span class="arrow">→</span>
                        <span class="fix-text">{suggestion.suggestion}</span>
                      </div>
                      <div class="suggestion-reason">{suggestion.reason}</div>
                      <button class="apply-btn" onclick={() => applyFix(suggestion)}>
                        apply
                      </button>
                    </div>
                  {/each}
                </div>
              {:else}
                <p class="no-issues">looking good!</p>
              {/if}
            </div>
          {/if}

          <!-- Tone Results -->
          {#if activeTab === "tone" && results.tone}
            <div class="tab-content">
              <p class="tone-analysis">{results.tone.analysis}</p>

              {#if results.tone.traits?.length > 0}
                <div class="traits">
                  {#each results.tone.traits as trait}
                    <div class="trait">
                      <span class="trait-name">{trait.trait}</span>
                      <div class="trait-bar-container">
                        <div class="trait-bar" style="width: {trait.score}%"></div>
                      </div>
                      <span class="trait-score">{trait.score}</span>
                    </div>
                  {/each}
                </div>
              {/if}

              {#if results.tone.suggestions?.length > 0}
                <div class="tone-suggestions">
                  {#each results.tone.suggestions as sug}
                    <p class="tone-sug">• {sug}</p>
                  {/each}
                </div>
              {/if}
            </div>
          {/if}

          <!-- Readability Results -->
          {#if activeTab === "readability" && results.readability}
            <div class="tab-content">
              <div class="readability-stats">
                <div class="stat">
                  <span class="stat-label">grade level</span>
                  <span class="stat-value">{results.readability.fleschKincaid}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">reading time</span>
                  <span class="stat-value">{results.readability.readingTime}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">words</span>
                  <span class="stat-value">{results.readability.wordCount}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">sentences</span>
                  <span class="stat-value">{results.readability.sentenceCount}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">avg sentence</span>
                  <span class="stat-value">{results.readability.sentenceStats.average} words</span>
                </div>
                <div class="stat">
                  <span class="stat-label">longest</span>
                  <span class="stat-value">{results.readability.sentenceStats.longest} words</span>
                </div>
              </div>

              {#if results.readability.suggestions?.length > 0}
                <div class="readability-suggestions">
                  {#each results.readability.suggestions as sug}
                    <p class="read-sug">• {sug}</p>
                  {/each}
                </div>
              {/if}
            </div>
          {/if}

          <!-- Usage info -->
          <div class="usage-info">
            {#if results.meta?.tokensUsed}
              <span>tokens: {results.meta.tokensUsed}</span>
              <span>cost: ${results.meta.cost?.toFixed(4) || "0.0000"}</span>
            {/if}
            <button class="clear-btn" onclick={clearResults}>clear</button>
          </div>
        </div>
      {/if}

      <!-- Footer note -->
      <footer class="panel-footer" aria-label="Wisp philosophy: analyzes your writing but never generates content">
        <p>a helper, not a writer</p>
      </footer>
    </aside>
  {/if}
{/if}

<style>
  /* Minimized tab */
  .wisp-tab {
    position: fixed;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    background: var(--color-surface, #2a2a2a);
    border: 1px solid var(--color-border, #3a3a3a);
    border-right: none;
    border-radius: 8px 0 0 8px;
    padding: 0.75rem 0.5rem;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    z-index: 100;
    transition: background-color 0.2s, transform 0.2s;
  }

  .wisp-tab:hover {
    background: var(--color-primary, #2d5a2d);
    transform: translateY(-50%) translateX(-2px);
  }

  .tab-icon {
    font-family: monospace;
    font-size: 1.2rem;
    color: var(--color-accent, #8bc48b);
  }

  .tab-text {
    font-size: 0.6rem;
    text-transform: lowercase;
    letter-spacing: 0.1em;
    color: var(--color-muted-foreground, #888);
    writing-mode: vertical-rl;
    text-orientation: mixed;
  }

  /* Main panel */
  .wisp-panel {
    position: fixed;
    right: 0;
    top: 0;
    bottom: 0;
    width: 280px;
    background: var(--color-background, #1e1e1e);
    border-left: 1px solid var(--color-border, #3a3a3a);
    display: flex;
    flex-direction: column;
    z-index: 100;
    font-size: 0.85rem;
    overflow: hidden;
  }

  /* Header */
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--color-border, #3a3a3a);
  }

  .panel-header h3 {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--color-accent, #8bc48b);
    letter-spacing: 0.05em;
  }

  .header-actions {
    display: flex;
    gap: 0.25rem;
  }

  .icon-btn {
    background: none;
    border: none;
    color: var(--color-muted-foreground, #888);
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    font-size: 1rem;
    line-height: 1;
    border-radius: 4px;
    transition: background-color 0.15s, color 0.15s;
  }

  .icon-btn:hover {
    background: var(--color-surface, #2a2a2a);
    color: var(--color-foreground, #d4d4d4);
  }

  /* Content length indicator */
  .content-length {
    padding: 0.25rem 0.75rem;
    border-bottom: 1px solid var(--color-border, #3a3a3a);
    font-size: 0.65rem;
    color: var(--color-muted-foreground, #888);
  }

  .content-length.warn {
    background: rgba(255, 193, 7, 0.1);
  }

  .content-length.warn .length-text {
    color: #ffc107;
  }

  .content-length.over {
    background: rgba(220, 53, 69, 0.1);
  }

  .content-length.over .length-text {
    color: #dc3545;
  }

  .length-text {
    display: block;
    margin-bottom: 0.25rem;
  }

  .length-bar {
    height: 2px;
    background: var(--color-border, #3a3a3a);
    border-radius: 1px;
    overflow: hidden;
  }

  .length-fill {
    height: 100%;
    background: var(--color-accent, #8bc48b);
    transition: width 0.2s ease;
  }

  .content-length.warn .length-fill {
    background: #ffc107;
  }

  .content-length.over .length-fill {
    background: #dc3545;
  }

  /* Vibes section */
  .vibes-section {
    padding: 0.5rem;
    text-align: center;
    border-bottom: 1px solid var(--color-border, #3a3a3a);
    background: var(--color-surface, #2a2a2a);
  }

  .ascii-vibe {
    margin: 0;
    font-family: monospace;
    font-size: 0.6rem;
    line-height: 1.2;
    color: var(--color-accent, #8bc48b);
    opacity: 0.8;
    white-space: pre;
    user-select: none;
  }

  /* Mode selector */
  .mode-selector {
    display: flex;
    gap: 1rem;
    padding: 0.5rem 1rem;
    border-bottom: 1px solid var(--color-border, #3a3a3a);
    font-size: 0.75rem;
  }

  .mode-selector label {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    cursor: pointer;
    color: var(--color-muted-foreground, #888);
  }

  .mode-selector input[type="radio"] {
    accent-color: var(--color-accent, #8bc48b);
  }

  /* Actions */
  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    padding: 0.75rem;
  }

  .action-btn {
    background: var(--color-surface, #2a2a2a);
    border: 1px solid var(--color-border, #3a3a3a);
    border-radius: 4px;
    padding: 0.5rem;
    color: var(--color-foreground, #d4d4d4);
    cursor: pointer;
    font-size: 0.75rem;
    transition: background-color 0.15s, border-color 0.15s;
  }

  .action-btn:hover:not(:disabled) {
    background: var(--color-primary, #2d5a2d);
    border-color: var(--color-accent, #8bc48b);
  }

  .action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .action-full {
    grid-column: 1 / -1;
    background: var(--color-primary, #2d5a2d);
    border-color: var(--color-accent, #8bc48b);
  }

  /* Error message */
  .error-message {
    margin: 0.5rem;
    padding: 0.5rem;
    background: rgba(220, 53, 69, 0.1);
    border: 1px solid rgba(220, 53, 69, 0.3);
    border-radius: 4px;
    color: #ff6b6b;
    font-size: 0.75rem;
  }

  .error-message button {
    background: none;
    border: none;
    color: inherit;
    text-decoration: underline;
    cursor: pointer;
    padding: 0;
    margin-top: 0.25rem;
  }

  /* Results */
  .results {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  /* Tabs */
  .tabs {
    display: flex;
    border-bottom: 1px solid var(--color-border, #3a3a3a);
  }

  .tab {
    flex: 1;
    background: none;
    border: none;
    padding: 0.5rem;
    color: var(--color-muted-foreground, #888);
    cursor: pointer;
    font-size: 0.7rem;
    text-transform: lowercase;
    border-bottom: 2px solid transparent;
    transition: color 0.15s, border-color 0.15s;
  }

  .tab:hover {
    color: var(--color-foreground, #d4d4d4);
  }

  .tab.active {
    color: var(--color-accent, #8bc48b);
    border-bottom-color: var(--color-accent, #8bc48b);
  }

  /* Tab content */
  .tab-content {
    flex: 1;
    overflow-y: auto;
    padding: 0.75rem;
  }

  /* Score display */
  .score-display {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    font-size: 0.75rem;
  }

  .score-label {
    color: var(--color-muted-foreground, #888);
  }

  .score-bar {
    font-family: monospace;
    color: var(--color-accent, #8bc48b);
    letter-spacing: -0.05em;
  }

  .score-num {
    color: var(--color-foreground, #d4d4d4);
    font-weight: 600;
  }

  /* Suggestions */
  .suggestions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .suggestion {
    background: var(--color-surface, #2a2a2a);
    border-radius: 4px;
    padding: 0.5rem;
    border-left: 3px solid var(--color-border, #3a3a3a);
  }

  .suggestion.severity-error {
    border-left-color: #dc3545;
  }

  .suggestion.severity-warning {
    border-left-color: #ffc107;
  }

  .suggestion.severity-style {
    border-left-color: var(--color-accent, #8bc48b);
  }

  .suggestion-original {
    margin-bottom: 0.25rem;
  }

  .strike {
    text-decoration: line-through;
    color: var(--color-muted-foreground, #888);
    font-style: italic;
  }

  .suggestion-fix {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    margin-bottom: 0.25rem;
  }

  .arrow {
    color: var(--color-accent, #8bc48b);
  }

  .fix-text {
    color: var(--color-accent, #8bc48b);
  }

  .suggestion-reason {
    font-size: 0.7rem;
    color: var(--color-muted-foreground, #888);
    margin-bottom: 0.5rem;
  }

  .apply-btn {
    background: var(--color-primary, #2d5a2d);
    border: none;
    border-radius: 3px;
    padding: 0.25rem 0.5rem;
    color: white;
    cursor: pointer;
    font-size: 0.65rem;
    transition: background-color 0.15s;
  }

  .apply-btn:hover {
    background: var(--color-accent, #8bc48b);
  }

  .no-issues {
    color: var(--color-accent, #8bc48b);
    font-style: italic;
    text-align: center;
    padding: 1rem;
  }

  /* Tone results */
  .tone-analysis {
    color: var(--color-foreground, #d4d4d4);
    margin-bottom: 0.75rem;
    line-height: 1.4;
  }

  .traits {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .trait {
    display: grid;
    grid-template-columns: 80px 1fr 30px;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.7rem;
  }

  .trait-name {
    color: var(--color-muted-foreground, #888);
    text-transform: lowercase;
  }

  .trait-bar-container {
    background: var(--color-surface, #2a2a2a);
    height: 6px;
    border-radius: 3px;
    overflow: hidden;
  }

  .trait-bar {
    height: 100%;
    background: var(--color-accent, #8bc48b);
    border-radius: 3px;
    transition: width 0.3s ease;
  }

  .trait-score {
    text-align: right;
    color: var(--color-muted-foreground, #888);
  }

  .tone-suggestions {
    border-top: 1px solid var(--color-border, #3a3a3a);
    padding-top: 0.5rem;
  }

  .tone-sug {
    color: var(--color-muted-foreground, #888);
    font-size: 0.7rem;
    margin: 0.25rem 0;
  }

  /* Readability results */
  .readability-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .stat {
    background: var(--color-surface, #2a2a2a);
    padding: 0.5rem;
    border-radius: 4px;
  }

  .stat-label {
    display: block;
    font-size: 0.65rem;
    color: var(--color-muted-foreground, #888);
    text-transform: lowercase;
    margin-bottom: 0.25rem;
  }

  .stat-value {
    font-size: 0.9rem;
    color: var(--color-foreground, #d4d4d4);
    font-weight: 500;
  }

  .readability-suggestions {
    border-top: 1px solid var(--color-border, #3a3a3a);
    padding-top: 0.5rem;
  }

  .read-sug {
    color: var(--color-muted-foreground, #888);
    font-size: 0.7rem;
    margin: 0.25rem 0;
  }

  /* Usage info */
  .usage-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0.75rem;
    border-top: 1px solid var(--color-border, #3a3a3a);
    font-size: 0.65rem;
    color: var(--color-muted-foreground, #888);
  }

  .clear-btn {
    background: none;
    border: none;
    color: var(--color-muted-foreground, #888);
    cursor: pointer;
    text-decoration: underline;
    font-size: inherit;
  }

  .clear-btn:hover {
    color: var(--color-foreground, #d4d4d4);
  }

  /* Footer */
  .panel-footer {
    padding: 0.5rem;
    text-align: center;
    border-top: 1px solid var(--color-border, #3a3a3a);
    background: var(--color-surface, #2a2a2a);
  }

  .panel-footer p {
    margin: 0;
    font-size: 0.6rem;
    color: var(--color-muted-foreground, #888);
    font-style: italic;
    letter-spacing: 0.05em;
  }

  /* Scrollbar styling */
  .results::-webkit-scrollbar,
  .tab-content::-webkit-scrollbar {
    width: 4px;
  }

  .results::-webkit-scrollbar-track,
  .tab-content::-webkit-scrollbar-track {
    background: transparent;
  }

  .results::-webkit-scrollbar-thumb,
  .tab-content::-webkit-scrollbar-thumb {
    background: var(--color-border, #3a3a3a);
    border-radius: 2px;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .wisp-panel {
      width: 100%;
      max-width: 320px;
    }
  }
</style>
