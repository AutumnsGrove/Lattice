---
title: Echo — Voice Transcription
description: Voice-to-text transcription via Lumen for Flow mode and beyond
category: specs
specCategory: features
icon: microphone
lastUpdated: '2026-01-25'
aliases: []
tags:
  - voice
  - transcription
  - lumen
  - flow-mode
  - accessibility
---

# Echo — Voice Transcription

```
                         ·  ·  ·
                      ·        ·
                   ·              ·
                ·                    ·
             ·  ╭──────────────────╮   ·
          ·    │                    │    ·
       ·       │   🎤 → ⟨ echo ⟩ → 📝 │       ·
          ·    │                    │    ·
             ·  ╰──────────────────╯   ·
                ·                    ·
                   ·              ·
                      ·        ·
                         ·  ·  ·

           Voice ripples outward,
           returns as text.
```

> _Speak, and let the grove remember._

Voice transcription for Grove. Wanderers can speak their thoughts and watch them bloom into text. Integrated through Lumen—no local model downloads, no device requirements. Just talk.

**Public Name:** Echo
**Internal Name:** GroveEcho
**Domain:** _(Lumen task type)_
**Last Updated:** January 2026

---

## Overview

Echo adds voice-to-text transcription to Grove through Lumen's AI gateway. The primary use case is **Flow mode** (the markdown editor in Arbor), where Wanderers can press-and-hold a button to dictate their writing instead of typing.

### The Problem

1. **Typing friction** — Some thoughts flow better when spoken
2. **Accessibility** — Not everyone can type comfortably
3. **Mobile experience** — Keyboards on phones are slow and awkward
4. **Tools like Hex** — Kit Langton's [Hex](https://hex.kitlangton.com/) shows how powerful voice input can be for productivity

### Why Not Local Models?

Tools like Hex use local models (Parakeet TDT, WhisperKit) that run on-device. This doesn't work for Grove because:

1. **Download size** — Parakeet is ~650MB, Whisper Large is ~1.5GB. Asking Wanderers to download this for a blog editor is unreasonable.
2. **Platform requirements** — Parakeet/FluidAudio requires Apple Silicon. Hex only runs on macOS.
3. **Browser limitations** — No WebAssembly-optimized versions of Parakeet exist.
4. **Ephemeral sessions** — Web users would re-download on every visit. Unacceptable.

### The Solution: Edge Transcription via Lumen

```
Browser (Flow mode)
       │
       │  MediaRecorder API → Audio blob
       │
       ▼
Lumen.transcribe({ audio, tenant })
       │
       │  PII scrubbing (on output text)
       │  Quota enforcement
       │  Usage logging
       │
       ▼
Cloudflare Workers AI Whisper
       │
       │  @cf/openai/whisper-large-v3-turbo
       │  (or fallback to whisper-tiny-en)
       │
       ▼
Transcribed text → inserted at cursor
```

**Why Cloudflare Workers AI?**

- **Already integrated** — Grove runs entirely on Cloudflare (Workers, D1, KV, R2)
- **Low latency** — Same edge location as the rest of the request
- **Cheap** — $0.00045/minute of audio
- **Multiple models** — whisper-large-v3-turbo for quality, whisper-tiny-en for speed
- **No API key management** — Uses existing AI binding

---

## Architecture

### New Lumen Task Type: `transcription`

```typescript
// types.ts
export type LumenTask =
  | "moderation"
  | "generation"
  | "summary"
  | "embedding"
  | "chat"
  | "image"
  | "code"
  | "transcription"; // NEW

// New request type for audio input
export interface LumenTranscriptionRequest {
  /** Audio data as Uint8Array (from MediaRecorder blob) */
  audio: Uint8Array;

  /** Tenant ID for quota tracking */
  tenant?: string;

  /** Optional configuration */
  options?: LumenTranscriptionOptions;
}

export interface LumenTranscriptionOptions {
  /** Override default model */
  model?: string;

  /** Target language (ISO 639-1 code, e.g., "en", "es", "fr") */
  language?: string;

  /** Task: "transcribe" (same language) or "translate" (to English) */
  task?: "transcribe" | "translate";

  /** Return word-level timestamps */
  timestamps?: boolean;

  /** Skip PII scrubbing on output */
  skipPiiScrub?: boolean;

  /** Skip quota enforcement */
  skipQuota?: boolean;
}

export interface LumenTranscriptionResponse {
  /** Transcribed text */
  text: string;

  /** Word count */
  wordCount: number;

  /** Word-level timestamps (if requested) */
  words?: LumenTranscriptionWord[];

  /** VTT subtitle format (if timestamps requested) */
  vtt?: string;

  /** Model used */
  model: string;

  /** Provider used */
  provider: LumenProviderName;

  /** Estimated audio duration in seconds */
  duration: number;

  /** Total latency in milliseconds */
  latency: number;
}

export interface LumenTranscriptionWord {
  word: string;
  start: number; // seconds
  end: number; // seconds
}
```

### Model Configuration

```typescript
// config.ts additions
export const MODELS = {
  // ... existing models ...

  // ─────────────────────────────────────────────────────────────────────────────
  // Cloudflare Workers AI - Transcription
  // ─────────────────────────────────────────────────────────────────────────────

  /** Primary transcription - Whisper Large V3 Turbo (fast, accurate, multilingual) */
  CF_WHISPER_TURBO: "@cf/openai/whisper-large-v3-turbo",

  /** Fallback transcription - Whisper base (smaller, still good) */
  CF_WHISPER: "@cf/openai/whisper",

  /** Ultra-fast fallback - Whisper Tiny English (very small, English only) */
  CF_WHISPER_TINY: "@cf/openai/whisper-tiny-en",
};

export const TASK_REGISTRY: Record<LumenTask, TaskConfig> = {
  // ... existing tasks ...

  // ─────────────────────────────────────────────────────────────────────────────
  // Voice Transcription (Cloudflare Whisper)
  // ─────────────────────────────────────────────────────────────────────────────
  transcription: {
    primaryModel: MODELS.CF_WHISPER_TURBO,
    primaryProvider: "cloudflare-ai",
    fallbackChain: [
      { provider: "cloudflare-ai", model: MODELS.CF_WHISPER },
      { provider: "cloudflare-ai", model: MODELS.CF_WHISPER_TINY },
    ],
    defaultMaxTokens: 0, // Not applicable
    defaultTemperature: 0, // Not applicable
    description: "Voice-to-text transcription",
  },
};
```

### Quota Limits

Transcription quotas are based on **requests per day** (not audio minutes, to keep the system simple). Each request typically handles 10-60 seconds of audio.

```typescript
// quota/limits.ts additions
export const LUMEN_QUOTAS: Record<TierKey, Record<LumenTask, number>> = {
  free: {
    // ... existing ...
    transcription: 10, // ~10 minutes of voice input/day
  },

  seedling: {
    // ... existing ...
    transcription: 100, // ~100 minutes/day
  },

  sapling: {
    // ... existing ...
    transcription: 500, // Heavy voice users
  },

  oak: {
    // ... existing ...
    transcription: 2000, // Power users
  },

  evergreen: {
    // ... existing ...
    transcription: 10000, // Essentially unlimited
  },
};
```

### Provider Implementation

```typescript
// providers/cloudflare-ai.ts additions

// Whisper input/output types
type AiWhisperInput = {
  audio: number[]; // Uint8Array converted to number[]
  source_lang?: string;
  target_lang?: string;
};

type AiWhisperOutput = {
  text: string;
  word_count?: number;
  words?: Array<{ word: string; start: number; end: number }>;
  vtt?: string;
};

export class CloudflareAIProvider implements LumenProvider {
  // ... existing methods ...

  async transcribe(
    model: string,
    audio: Uint8Array,
    options: { language?: string; task?: "transcribe" | "translate" }
  ): Promise<{
    text: string;
    wordCount: number;
    words?: Array<{ word: string; start: number; end: number }>;
    vtt?: string;
    duration: number;
  }> {
    try {
      const startTime = Date.now();

      const result = (await this.ai.run(model as Parameters<Ai["run"]>[0], {
        audio: [...audio], // Convert Uint8Array to number[]
        source_lang: options.language,
        target_lang: options.task === "translate" ? "en" : undefined,
      } as AiWhisperInput)) as AiWhisperOutput;

      // Estimate duration from audio size (rough: 16kHz mono 16-bit = 32KB/sec)
      const estimatedDuration = audio.length / 32000;

      return {
        text: result.text ?? "",
        wordCount: result.word_count ?? result.text?.split(/\s+/).length ?? 0,
        words: result.words,
        vtt: result.vtt,
        duration: estimatedDuration,
      };
    } catch (err) {
      throw new ProviderError(
        this.name,
        err instanceof Error ? err.message : "Transcription failed",
        undefined,
        err
      );
    }
  }
}
```

### Client Method

```typescript
// client.ts additions
export class LumenClient {
  // ... existing methods ...

  /**
   * Transcribe audio to text
   *
   * @example
   * ```typescript
   * const result = await lumen.transcribe({
   *   audio: new Uint8Array(audioBuffer),
   *   tenant: 'tenant_123',
   * }, 'seedling');
   *
   * console.log(result.text);
   * ```
   */
  async transcribe(
    request: LumenTranscriptionRequest,
    tier: TierKey
  ): Promise<LumenTranscriptionResponse> {
    // 1. Check quota
    if (!request.options?.skipQuota && request.tenant) {
      const quotaCheck = await this.quotaTracker.checkQuota(
        request.tenant,
        "transcription",
        tier
      );
      if (!quotaCheck.allowed) {
        throw new QuotaExceededError("transcription", quotaCheck);
      }
    }

    // 2. Route to provider
    const config = getTaskConfig("transcription");
    const startTime = Date.now();

    // 3. Execute transcription with fallback
    const result = await this.executeTranscription(
      config,
      request.audio,
      request.options ?? {}
    );

    // 4. Post-process: PII scrubbing on output text
    let finalText = result.text;
    if (!request.options?.skipPiiScrub) {
      const scrubbed = scrubPii(result.text);
      finalText = scrubbed.scrubbed;
      // Log if PII was found (but don't fail)
      if (scrubbed.piiFound.length > 0) {
        console.log(
          `[Lumen] PII scrubbed from transcription: ${scrubbed.piiFound.join(", ")}`
        );
      }
    }

    // 5. Log usage
    if (request.tenant && this.db) {
      await this.logTranscriptionUsage(request.tenant, result, tier);
    }

    return {
      text: finalText,
      wordCount: result.wordCount,
      words: result.words,
      vtt: result.vtt,
      model: result.model,
      provider: result.provider,
      duration: result.duration,
      latency: Date.now() - startTime,
    };
  }
}
```

---

## Client Integration: Flow Mode

### Browser-Side Recording

```typescript
// lib/echo/recorder.ts

export interface EchoRecorderOptions {
  /** Callback when recording starts */
  onStart?: () => void;

  /** Callback with audio level (0-1) for visualization */
  onLevel?: (level: number) => void;

  /** Callback when recording stops with audio blob */
  onStop?: (blob: Blob) => void;

  /** Callback on error */
  onError?: (error: Error) => void;

  /** Maximum recording duration in seconds (default: 60) */
  maxDuration?: number;

  /** Audio sample rate (default: 16000 for Whisper) */
  sampleRate?: number;
}

export class EchoRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private chunks: Blob[] = [];
  private levelInterval: number | null = null;

  constructor(private options: EchoRecorderOptions = {}) {}

  /**
   * Request microphone permission and prepare recorder
   * Call this on page load for faster startup
   */
  async warm(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.options.sampleRate ?? 16000,
          channelCount: 1, // Mono
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Set up audio context for level metering
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      // Prepare MediaRecorder
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: this.getSupportedMimeType(),
      });

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.chunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: "audio/webm" });
        this.chunks = [];
        this.options.onStop?.(blob);
      };

      return true;
    } catch (err) {
      this.options.onError?.(
        err instanceof Error ? err : new Error("Microphone access denied")
      );
      return false;
    }
  }

  /**
   * Start recording
   */
  start(): void {
    if (!this.mediaRecorder) {
      this.options.onError?.(
        new Error("Recorder not initialized. Call warm() first.")
      );
      return;
    }

    this.chunks = [];
    this.mediaRecorder.start(100); // Collect data every 100ms
    this.options.onStart?.();

    // Start level metering
    if (this.analyser && this.options.onLevel) {
      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.levelInterval = window.setInterval(() => {
        this.analyser!.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        this.options.onLevel!(average / 255);
      }, 50);
    }

    // Auto-stop at max duration
    const maxDuration = this.options.maxDuration ?? 60;
    setTimeout(() => this.stop(), maxDuration * 1000);
  }

  /**
   * Stop recording
   */
  stop(): void {
    if (this.levelInterval) {
      clearInterval(this.levelInterval);
      this.levelInterval = null;
    }

    if (this.mediaRecorder?.state === "recording") {
      this.mediaRecorder.stop();
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stop();
    this.mediaRecorder?.stream.getTracks().forEach((t) => t.stop());
    this.audioContext?.close();
    this.mediaRecorder = null;
    this.audioContext = null;
    this.analyser = null;
  }

  private getSupportedMimeType(): string {
    const types = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg", "audio/mp4"];
    return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? "audio/webm";
  }
}
```

### API Endpoint

```typescript
// routes/api/lumen/transcribe/+server.ts

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { createLumenClient } from "$lib/lumen";

export const POST: RequestHandler = async ({ request, locals, platform }) => {
  // 1. Auth check
  if (!locals.user) {
    throw error(401, "Authentication required");
  }

  // 2. Get audio from request
  const formData = await request.formData();
  const audioFile = formData.get("audio") as File | null;

  if (!audioFile) {
    throw error(400, "No audio file provided");
  }

  // 3. Validate file size (max 25MB, ~10 min at 128kbps)
  if (audioFile.size > 25 * 1024 * 1024) {
    throw error(400, "Audio file too large (max 25MB)");
  }

  // 4. Convert to Uint8Array
  const arrayBuffer = await audioFile.arrayBuffer();
  const audio = new Uint8Array(arrayBuffer);

  // 5. Get options from form data
  const language = formData.get("language") as string | null;
  const task = formData.get("task") as "transcribe" | "translate" | null;

  // 6. Create Lumen client and transcribe
  const lumen = createLumenClient({
    openrouterApiKey: platform?.env.OPENROUTER_API_KEY ?? "",
    ai: platform?.env.AI,
    db: platform?.env.DB,
  });

  try {
    const result = await lumen.transcribe(
      {
        audio,
        tenant: locals.user.tenantId,
        options: {
          language: language ?? undefined,
          task: task ?? "transcribe",
        },
      },
      locals.user.tier
    );

    return json({
      text: result.text,
      wordCount: result.wordCount,
      duration: result.duration,
      latency: result.latency,
    });
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      throw error(429, "Daily transcription quota exceeded");
    }
    throw error(500, "Transcription failed");
  }
};
```

### Flow Mode Integration

```svelte
<!-- components/flow/VoiceInput.svelte -->
<script lang="ts">
  import { EchoRecorder } from '$lib/echo/recorder';
  import { onMount, onDestroy } from 'svelte';

  export let onTranscription: (text: string) => void;

  let recorder: EchoRecorder;
  let isRecording = $state(false);
  let isTranscribing = $state(false);
  let audioLevel = $state(0);
  let error = $state<string | null>(null);

  onMount(async () => {
    recorder = new EchoRecorder({
      onStart: () => {
        isRecording = true;
        error = null;
      },
      onLevel: (level) => {
        audioLevel = level;
      },
      onStop: async (blob) => {
        isRecording = false;
        await transcribe(blob);
      },
      onError: (err) => {
        error = err.message;
        isRecording = false;
      },
      maxDuration: 60, // 1 minute max
    });

    // Pre-warm for faster startup
    await recorder.warm();
  });

  onDestroy(() => {
    recorder?.dispose();
  });

  async function transcribe(blob: Blob) {
    isTranscribing = true;

    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');

      const response = await fetch('/api/lumen/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Transcription failed');
      }

      const { text } = await response.json();
      onTranscription(text);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Transcription failed';
    } finally {
      isTranscribing = false;
    }
  }

  function handlePointerDown() {
    recorder.start();
  }

  function handlePointerUp() {
    recorder.stop();
  }
</script>

<button
  class="voice-button"
  class:recording={isRecording}
  class:transcribing={isTranscribing}
  onpointerdown={handlePointerDown}
  onpointerup={handlePointerUp}
  onpointerleave={handlePointerUp}
  disabled={isTranscribing}
  aria-label={isRecording ? 'Recording... release to stop' : 'Hold to record'}
>
  {#if isTranscribing}
    <span class="spinner" />
  {:else}
    <svg class="mic-icon" viewBox="0 0 24 24" style="--level: {audioLevel}">
      <!-- Microphone icon with level indicator -->
    </svg>
  {/if}
</button>

{#if error}
  <p class="error">{error}</p>
{/if}

<style>
  .voice-button {
    /* Grove glassmorphism styling */
    @apply rounded-full p-4 transition-all;
    @apply bg-grove-glass/50 backdrop-blur-sm;
    @apply border border-grove-glass-border;
    @apply hover:bg-grove-glass/70;
    @apply active:scale-95;
  }

  .voice-button.recording {
    @apply bg-grove-accent/20 border-grove-accent;
    @apply animate-pulse;
  }

  .voice-button.transcribing {
    @apply opacity-50 cursor-wait;
  }
</style>
```

---

## UX Considerations

### Accessibility

1. **Keyboard support** — Hold Space or Enter to record (matches Hex pattern)
2. **Screen reader** — Announce recording state changes
3. **Visual feedback** — Audio level meter, recording indicator, transcription spinner
4. **Reduced motion** — Respect `prefers-reduced-motion`, simplify animations

### Error Handling

| Error | User Message |
|-------|--------------|
| Microphone denied | "Microphone access is needed for voice input. Check your browser settings." |
| Quota exceeded | "You've used your daily voice minutes. Upgrade for more, or try again tomorrow." |
| Network error | "Couldn't reach the server. Check your connection and try again." |
| Transcription failed | "Couldn't understand that recording. Try speaking more clearly." |

### Privacy

1. **No audio storage** — Audio is transcribed and immediately discarded
2. **PII scrubbing** — Emails, phone numbers, SSNs are redacted from transcription
3. **Usage logging** — Only metadata (duration, tenant, tier) logged, never content
4. **Transparent** — Help article explaining how voice data is handled

---

## Cost Analysis

### Cloudflare Workers AI Pricing

| Model | Cost | Speed | Quality |
|-------|------|-------|---------|
| whisper-large-v3-turbo | $0.00045/min | Fast | Excellent |
| whisper | $0.00045/min | Medium | Good |
| whisper-tiny-en | $0.00045/min | Very Fast | Basic (English only) |

### Estimated Monthly Costs

Assuming average recording length of 30 seconds:

| Tier | Daily Quota | Max Minutes/Month | Max Cost/Month |
|------|-------------|-------------------|----------------|
| Free | 10 | 150 min | $0.07 |
| Seedling | 100 | 1,500 min | $0.68 |
| Sapling | 500 | 7,500 min | $3.38 |
| Oak | 2,000 | 30,000 min | $13.50 |
| Evergreen | 10,000 | 150,000 min | $67.50 |

**Cost is negligible** — even heavy usage costs less than a few dollars per month per tenant.

---

## Implementation Phases

### Phase 1: Core Infrastructure

- [ ] Add `transcription` task type to Lumen
- [ ] Implement `CloudflareAIProvider.transcribe()` method
- [ ] Add `LumenClient.transcribe()` method
- [ ] Add quota limits for transcription task
- [ ] Create `/api/lumen/transcribe` endpoint
- [ ] Write tests for transcription flow

### Phase 2: Flow Mode Integration

- [ ] Create `EchoRecorder` class for browser recording
- [ ] Create `VoiceInput.svelte` component
- [ ] Integrate into Flow mode editor toolbar
- [ ] Add keyboard shortcut (Cmd+Shift+V or similar)
- [ ] Handle cursor position and text insertion

### Phase 3: Polish

- [ ] Add audio level visualization
- [ ] Add recording time indicator
- [ ] Create help article for voice input
- [ ] Add to onboarding flow
- [ ] Analytics for voice vs typed input ratio

### Phase 4: Advanced Features (Future)

- [ ] Real-time streaming transcription (as user speaks)
- [ ] Voice commands ("new paragraph", "delete that")
- [ ] Multi-language auto-detection
- [ ] Integration with Wisp for voice-powered writing assistance

---

## Open Questions

1. **Streaming vs batch** — Start with batch (simpler), add streaming later if latency is an issue?
2. **Voice commands** — Should "delete that" work? Or is that scope creep?
3. **Mobile UX** — Should the button be in the keyboard area or floating?
4. **Fallback to OpenAI** — Should we add OpenRouter Whisper as a fallback for redundancy?

---

## References

- [Hex by Kit Langton](https://hex.kitlangton.com/) — Inspiration for UX
- [Cloudflare Workers AI Whisper](https://developers.cloudflare.com/workers-ai/models/whisper/)
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [Lumen Spec](./lumen-spec.md) — Grove's AI gateway
