<script>
  /**
   * AmbientSoundsPanel - Panel for ambient sound controls
   */
  import { soundLibrary } from "./EditorThemes.js";

  let {
    open = $bindable(false),
    enabled = $bindable(false),
    currentSound = $bindable("forest"),
    volume = $bindable(0.3),
    onPlaySound = (soundKey) => {},
    onStopSound = () => {},
    onSetVolume = (vol) => {},
  } = $props();

  function selectSound(soundKey) {
    if (enabled) {
      onPlaySound(soundKey);
    } else {
      currentSound = soundKey;
    }
  }

  function togglePlay() {
    if (enabled) {
      onStopSound();
    } else {
      onPlaySound(currentSound);
    }
  }
</script>

{#if open}
  <div class="sound-panel">
    <div class="sound-panel-header">
      <span class="sound-panel-title">:: ambient sounds</span>
      <button
        type="button"
        class="sound-panel-close"
        onclick={() => open = false}
      >[x]</button>
    </div>

    <div class="sound-options">
      {#each Object.entries(soundLibrary) as [key, sound]}
        <button
          type="button"
          class="sound-option"
          class:active={currentSound === key}
          class:playing={enabled && currentSound === key}
          onclick={() => selectSound(key)}
        >
          [<span class="key">{sound.key}</span>] {sound.name}
        </button>
      {/each}
    </div>

    <div class="sound-controls">
      <label class="volume-label">
        <span>vol:</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          oninput={(e) => onSetVolume(parseFloat(e.target.value))}
          class="volume-slider"
        />
      </label>

      <button
        type="button"
        class="sound-play-btn"
        class:playing={enabled}
        onclick={togglePlay}
      >
        {#if enabled}[<span class="key">s</span>top]{:else}[<span class="key">p</span>lay]{/if}
      </button>
    </div>

    <div class="sound-note">
      <span>; add audio to /static/sounds/</span>
    </div>
  </div>
{/if}

<style>
  .key {
    color: var(--editor-accent, #8bc48b);
    font-weight: bold;
    text-decoration: underline;
  }

  .sound-panel {
    position: absolute;
    bottom: 2.5rem;
    right: 1rem;
    background: var(--editor-bg-secondary, #252526);
    border: 1px solid var(--editor-border-accent, #4a7c4a);
    border-radius: 6px;
    width: 220px;
    z-index: 100;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    font-family: "JetBrains Mono", "Fira Code", monospace;
  }

  .sound-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--editor-border, #3a3a3a);
  }

  .sound-panel-title {
    font-size: 0.75rem;
    color: var(--editor-accent-dim, #7a9a7a);
  }

  .sound-panel-close {
    background: transparent;
    border: none;
    color: var(--editor-text-dim, #9d9d9d);
    font-family: inherit;
    font-size: 0.8rem;
    cursor: pointer;
    padding: 0;
  }

  .sound-panel-close:hover {
    color: var(--editor-text, #d4d4d4);
  }

  .sound-options {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.5rem;
  }

  .sound-option {
    background: transparent;
    border: none;
    color: var(--editor-text-dim, #9d9d9d);
    font-family: inherit;
    font-size: 0.8rem;
    cursor: pointer;
    text-align: left;
    padding: 0.35rem 0.5rem;
    border-radius: 3px;
    transition: all 0.1s ease;
  }

  .sound-option:hover {
    background: var(--editor-bg-tertiary, #1a1a1a);
    color: var(--editor-text, #d4d4d4);
  }

  .sound-option.active {
    color: var(--editor-accent, #8bc48b);
  }

  .sound-option.playing {
    background: var(--editor-bg-tertiary, #1a1a1a);
  }

  .sound-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    border-top: 1px solid var(--editor-border, #3a3a3a);
  }

  .volume-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--editor-text-dim, #9d9d9d);
    font-size: 0.75rem;
  }

  .volume-slider {
    width: 80px;
    height: 4px;
    -webkit-appearance: none;
    appearance: none;
    background: var(--editor-border, #3a3a3a);
    border-radius: 2px;
    outline: none;
  }

  .volume-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 12px;
    height: 12px;
    background: var(--editor-accent, #8bc48b);
    border-radius: 50%;
    cursor: pointer;
  }

  .volume-slider::-moz-range-thumb {
    width: 12px;
    height: 12px;
    background: var(--editor-accent, #8bc48b);
    border-radius: 50%;
    cursor: pointer;
    border: none;
  }

  .sound-play-btn {
    background: transparent;
    border: none;
    color: var(--editor-accent-dim, #7a9a7a);
    font-family: inherit;
    font-size: 0.8rem;
    cursor: pointer;
    transition: color 0.1s ease;
  }

  .sound-play-btn:hover {
    color: var(--editor-accent, #8bc48b);
  }

  .sound-play-btn.playing {
    color: var(--editor-accent, #8bc48b);
  }

  .sound-note {
    padding: 0.4rem 0.75rem;
    font-size: 0.65rem;
    color: var(--editor-text-dim, #9d9d9d);
    font-style: italic;
    border-top: 1px solid var(--editor-border, #3a3a3a);
  }
</style>
