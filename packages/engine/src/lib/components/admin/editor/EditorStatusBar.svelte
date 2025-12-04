<script>
  /**
   * EditorStatusBar - Status bar showing cursor position, word count, and controls
   */
  import { soundLibrary } from "./EditorThemes.js";

  let {
    cursorLine = 1,
    cursorCol = 1,
    lineCount = 0,
    wordCount = 0,
    readingTime = "< 1 min",
    saving = false,
    hasDraft = false,
    typewriterMode = false,
    // Writing goal
    writingGoalEnabled = false,
    goalProgress = 0,
    // Campfire
    campfireActive = false,
    campfireElapsed = "0:00",
    // Sounds
    soundsEnabled = false,
    currentSound = "forest",
    onToggleSoundPanel = () => {},
  } = $props();
</script>

<div class="status-bar">
  <div class="status-left">
    <span class="status-item">
      Ln {cursorLine}, Col {cursorCol}
    </span>
    <span class="status-divider">|</span>
    <span class="status-item">{lineCount} lines</span>
    <span class="status-divider">|</span>
    <span class="status-item">{wordCount} words</span>
    <span class="status-divider">|</span>
    <span class="status-item">{readingTime}</span>
    {#if writingGoalEnabled}
      <span class="status-divider">|</span>
      <span class="status-goal">
        Goal: {goalProgress}%
      </span>
    {/if}
    {#if campfireActive}
      <span class="status-divider">|</span>
      <span class="status-campfire">
        ~ {campfireElapsed}
      </span>
    {/if}
  </div>
  <div class="status-right">
    <button
      type="button"
      class="status-sound-btn"
      class:playing={soundsEnabled}
      onclick={onToggleSoundPanel}
      title="Ambient sounds"
    >
      [{soundLibrary[currentSound]?.name || "snd"}]{#if soundsEnabled}<span class="sound-wave">~</span>{/if}
    </button>
    <span class="status-divider">|</span>
    {#if typewriterMode}
      <span class="status-mode">Typewriter</span>
      <span class="status-divider">|</span>
    {/if}
    {#if saving}
      <span class="status-saving">Saving...</span>
    {:else if hasDraft}
      <span class="status-draft">Draft saving...</span>
    {:else}
      <span class="status-item">Markdown</span>
    {/if}
  </div>
</div>

<style>
  .status-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.35rem 0.75rem;
    background: var(--editor-status-bg, rgba(45, 74, 45, 0.3));
    border-top: 1px solid var(--editor-status-border, #3d5a3d);
    font-size: 0.75rem;
    color: var(--editor-text-dim, #9d9d9d);
    font-family: "JetBrains Mono", "Fira Code", monospace;
  }

  .status-left,
  .status-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .status-divider {
    color: #4a4a4a;
  }

  .status-goal {
    color: var(--editor-accent, #8bc48b);
  }

  .status-campfire {
    color: #ffb347;
    animation: campfire-glow 2s ease-in-out infinite;
  }

  @keyframes campfire-glow {
    0%, 100% { opacity: 0.7; }
    50% { opacity: 1; }
  }

  .status-saving {
    color: var(--editor-accent, #8bc48b);
    animation: pulse 1s ease-in-out infinite;
  }

  .status-draft {
    color: var(--editor-accent-dim, #7a9a7a);
    font-style: italic;
  }

  .status-mode {
    color: var(--editor-accent, #8bc48b);
    font-style: italic;
  }

  .status-sound-btn {
    background: transparent;
    border: none;
    color: var(--editor-accent-dim, #7a9a7a);
    font-family: inherit;
    font-size: inherit;
    cursor: pointer;
    padding: 0;
    transition: color 0.15s ease;
  }

  .status-sound-btn:hover {
    color: var(--editor-accent, #8bc48b);
  }

  .status-sound-btn.playing {
    color: var(--editor-accent, #8bc48b);
  }

  .sound-wave {
    display: inline-block;
    animation: wave 0.8s ease-in-out infinite;
    margin-left: 2px;
  }

  @keyframes wave {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-2px); }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
</style>
