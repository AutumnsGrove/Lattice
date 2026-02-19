<script lang="ts">
  /**
   * VoiceInput - Voice Recording for Scribe Transcription
   *
   * A microphone button that records audio and sends it for transcription.
   * Supports press-and-hold or toggle mode for accessibility.
   *
   * @fires transcription - When transcription completes { text: string, gutterContent?: GutterItem[] }
   * @fires error - When an error occurs { message: string }
   */

  import { Mic, MicOff, Loader2 } from "lucide-svelte";
  import {
    createScribeRecorder,
    type ScribeRecorder,
    type ScribeRecorderState,
  } from "$lib/scribe/recorder.js";
  import type { GutterItem, ScribeMode } from "$lib/lumen/types.js";
  import { getCSRFToken } from "$lib/utils/api.js";

  // ============================================================================
  // Props & Events
  // ============================================================================

  interface Props {
    /** Transcription mode: "raw" for 1:1, "draft" for AI-structured */
    mode?: ScribeMode;
    /** Called when transcription completes */
    onTranscription?: (result: {
      text: string;
      gutterContent?: GutterItem[];
      rawTranscript?: string;
    }) => void;
    /** Called when an error occurs */
    onError?: (error: { message: string }) => void;
    /** Whether the component is disabled */
    disabled?: boolean;
    /** Use toggle mode instead of press-and-hold (accessibility) */
    toggleMode?: boolean;
  }

  let {
    mode = "raw",
    onTranscription,
    onError,
    disabled = false,
    toggleMode = false,
  }: Props = $props();

  // ============================================================================
  // State
  // ============================================================================

  let recorder: ScribeRecorder | null = $state(null);
  let recorderState = $state<ScribeRecorderState>("idle");
  let audioLevel = $state(0);
  let isTranscribing = $state(false);
  let error = $state<string | null>(null);

  // For toggle mode
  let isToggled = $state(false);

  // Computed states
  let isRecording = $derived(recorderState === "recording");
  let isReady = $derived(recorderState === "ready");
  let isWarming = $derived(recorderState === "warming");
  let isError = $derived(recorderState === "error");
  let isBusy = $derived(isWarming || isRecording || isTranscribing);

  // ============================================================================
  // Recorder Lifecycle
  // ============================================================================

  $effect(() => {
    // Initialize recorder when component mounts
    // Note: We intentionally do NOT call recorder.warm() here!
    // Requesting microphone permission should only happen on user interaction,
    // not on page load. The start() method handles warming on-demand.
    // This fixes #751 (mic prompt on load), #752 (frozen editor), #757 (disabled state)
    recorder = createScribeRecorder({
      onAudioLevel: (level) => {
        audioLevel = level;
      },
      onStateChange: (state) => {
        recorderState = state;
      },
      onError: (err) => {
        error = err.message;
        onError?.({ message: err.message });
      },
    });

    // Cleanup on unmount
    return () => {
      recorder?.dispose();
    };
  });

  // ============================================================================
  // Recording Control
  // ============================================================================

  async function startRecording() {
    if (!recorder || isBusy || disabled) return;

    error = null;

    try {
      await recorder.start();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start recording";
      error = message;
      onError?.({ message });
    }
  }

  async function stopRecording() {
    if (!recorder || !isRecording) return;

    try {
      const result = await recorder.stop();
      await transcribe(result.data, result.mimeType);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to stop recording";
      error = message;
      onError?.({ message });
    }
  }

  function cancelRecording() {
    if (recorder && isRecording) {
      recorder.cancel();
    }
    isToggled = false;
  }

  // ============================================================================
  // Transcription
  // ============================================================================

  interface TranscriptionResponse {
    success: boolean;
    text: string;
    wordCount: number;
    duration: number;
    latency: number;
    model: string;
    mode: ScribeMode;
    gutterContent?: GutterItem[];
    rawTranscript?: string;
    message?: string;
  }

  async function transcribe(audioData: Uint8Array, mimeType: string) {
    isTranscribing = true;
    error = null;

    try {
      const formData = new FormData();
      // Create Blob from audio data (type assertion needed for strict TS)
      const audioBlob = new Blob([audioData as BlobPart], { type: mimeType });
      formData.append("audio", audioBlob);
      formData.append("mode", mode);

      // Get CSRF token for state-changing request
      const csrfToken = getCSRFToken();

      const response = await fetch("/api/lumen/transcribe", {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: csrfToken
          ? { "X-CSRF-Token": csrfToken, "csrf-token": csrfToken }
          : {},
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(errorData.message || `Transcription failed (${response.status})`);
      }

      const data = (await response.json()) as TranscriptionResponse;

      onTranscription?.({
        text: data.text,
        gutterContent: data.gutterContent,
        rawTranscript: data.rawTranscript,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Transcription failed";
      error = message;
      onError?.({ message });
    } finally {
      isTranscribing = false;
      isToggled = false;
    }
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  function handleClick() {
    if (toggleMode) {
      if (isToggled) {
        stopRecording();
        isToggled = false;
      } else {
        startRecording();
        isToggled = true;
      }
    }
  }

  function handleMouseDown() {
    if (!toggleMode) {
      startRecording();
    }
  }

  function handleMouseUp() {
    if (!toggleMode && isRecording) {
      stopRecording();
    }
  }

  function handleMouseLeave() {
    if (!toggleMode && isRecording) {
      // Cancel if user drags away
      cancelRecording();
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape" && isRecording) {
      cancelRecording();
    }
  }

  // ============================================================================
  // Accessibility
  // ============================================================================

  // Check for reduced motion preference
  let prefersReducedMotion = $state(false);
  $effect(() => {
    if (typeof window !== "undefined") {
      prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
    }
  });

  // Announce state changes to screen readers
  let announcement = $derived.by(() => {
    if (isTranscribing) return "Transcribing audio";
    if (isRecording) return "Recording";
    if (isWarming) return "Preparing microphone";
    if (error) return `Error: ${error}`;
    return "";
  });
</script>

<svelte:window onkeydown={handleKeyDown} />

<div class="voice-input" class:recording={isRecording} class:error={!!error}>
  <!-- Microphone Button -->
  <button
    type="button"
    class="mic-button"
    class:recording={isRecording}
    class:transcribing={isTranscribing}
    class:error={!!error}
    disabled={disabled || isWarming || isTranscribing}
    onclick={handleClick}
    onmousedown={handleMouseDown}
    onmouseup={handleMouseUp}
    onmouseleave={handleMouseLeave}
    ontouchstart={handleMouseDown}
    ontouchend={handleMouseUp}
    aria-label={isRecording
      ? "Stop recording"
      : isTranscribing
        ? "Transcribing..."
        : "Start voice recording"}
    aria-pressed={isRecording}
  >
    {#if isTranscribing}
      <Loader2 class="icon spinning" size={20} />
    {:else if isRecording}
      <div class="recording-indicator" style="--level: {audioLevel}">
        <Mic class="icon pulse" size={20} />
      </div>
    {:else if error}
      <MicOff class="icon" size={20} />
    {:else}
      <Mic class="icon" size={20} />
    {/if}
  </button>

  <!-- Audio Level Visualization (when recording) -->
  {#if isRecording && !prefersReducedMotion}
    <div class="level-bars" aria-hidden="true">
      {#each { length: 5 } as _, i}
        <div
          class="bar"
          style="height: {Math.max(4, audioLevel * 100 * ((i + 1) / 5))}%"
        ></div>
      {/each}
    </div>
  {/if}

  <!-- Error Tooltip -->
  {#if error}
    <div class="error-tooltip" role="alert">
      {error}
    </div>
  {/if}

  <!-- Screen Reader Announcements -->
  <div class="sr-only" role="status" aria-live="polite">
    {announcement}
  </div>
</div>

<style>
  .voice-input {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .mic-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: var(--grove-surface-elevated, #2a2a2a);
    color: var(--grove-text-secondary, #a0a0a0);
    cursor: pointer;
    transition:
      background 0.15s ease,
      transform 0.1s ease,
      box-shadow 0.15s ease;
  }

  .mic-button:hover:not(:disabled) {
    background: var(--grove-surface-highlight, #3a3a3a);
    color: var(--grove-text-primary, #ffffff);
  }

  .mic-button:active:not(:disabled) {
    transform: scale(0.95);
  }

  .mic-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .mic-button.recording {
    background: var(--grove-accent-red, #ef4444);
    color: white;
    animation: pulse-glow 1.5s ease-in-out infinite;
  }

  .mic-button.transcribing {
    background: var(--grove-accent-green, #22c55e);
    color: white;
  }

  .mic-button.error {
    background: var(--grove-error, #dc2626);
    color: white;
  }

  @keyframes pulse-glow {
    0%,
    100% {
      box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
    }
    50% {
      box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
    }
  }

  :global(.icon) {
    width: 20px;
    height: 20px;
  }

  :global(.icon.spinning) {
    animation: spin 1s linear infinite;
  }

  :global(.icon.pulse) {
    animation: icon-pulse 0.8s ease-in-out infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes icon-pulse {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.1);
    }
  }

  .recording-indicator {
    position: relative;
  }

  .level-bars {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 1.5rem;
    padding: 0 0.25rem;
  }

  .bar {
    width: 3px;
    min-height: 4px;
    max-height: 100%;
    background: var(--grove-accent-red, #ef4444);
    border-radius: 2px;
    transition: height 0.05s ease;
  }

  .error-tooltip {
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-bottom: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: var(--grove-error, #dc2626);
    color: white;
    font-size: 0.75rem;
    border-radius: 0.25rem;
    white-space: nowrap;
    z-index: 10;
    animation: fade-in 0.15s ease;
  }

  .error-tooltip::after {
    content: "";
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: var(--grove-error, #dc2626);
  }

  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .mic-button.recording {
      animation: none;
    }

    :global(.icon.spinning),
    :global(.icon.pulse) {
      animation: none;
    }

    .bar {
      transition: none;
    }
  }
</style>
