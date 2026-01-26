---
title: Scribe — Voice Transcription
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

# Scribe — Voice Transcription

```
                    ╭───────────────────╮
                    │                   │
                    │    🎤  →  📝      │
                    │                   │
                    │   You speak.      │
                    │   The grove       │
                    │   scribes.        │
                    │                   │
                    ╰───────────────────╯

            Before keyboards, there were scribes.
            You spoke; they wrote.
```

> _Speak. The grove scribes._

Voice transcription for Grove. Wanderers can speak their thoughts and watch them bloom into text. Integrated through Lumen—no local model downloads, no device requirements. Just talk.

**Public Name:** Scribe
**Internal Name:** GroveScribe
**Domain:** _(Lumen task type)_
**Last Updated:** January 2026

---

## Overview

Scribe adds voice-to-text transcription to Grove through Lumen's AI gateway. The primary use case is **Flow mode** (the markdown editor in Arbor), where Wanderers can press-and-hold a button to dictate their writing instead of typing.

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

Scribe offers two modes:

#### Raw Mode (1:1 Transcription)
```
Voice → Whisper → Text inserted at cursor
```
Fast, literal. What you say is what you get.

#### Draft Mode (AI-Assisted Structuring)
```
Voice → Whisper → Raw transcript
                       ↓
              Lumen (generation task)
                       ↓
         ┌─────────────────────────────┐
         │ • Clean up filler words     │
         │ • Add headers & structure   │
         │ • Detect asides → Vines     │
         └─────────────────────────────┘
                       ↓
         Structured markdown + auto-generated Vines
```

Draft mode transforms rambling speech into a polished blog post draft with automatic Vine creation for tangents and asides.

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

  /**
   * Scribe mode:
   * - "raw": 1:1 transcription, fast and literal
   * - "draft": AI-assisted structuring with auto-Vines
   */
  mode?: "raw" | "draft";
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

## Draft Mode: AI-Assisted Structuring

Draft mode transforms rambling spoken thoughts into polished blog post drafts with automatic Vine creation for tangents and asides. This is the magic that makes voice input feel like a writing superpower rather than just dictation.

### How Draft Mode Works

Draft mode is a two-step process:

```
┌──────────────────────────────────────────────────────────────────────┐
│                         DRAFT MODE FLOW                              │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Step 1: Transcription (Whisper)                                   │
│   ─────────────────────────────                                     │
│   Voice → Cloudflare Whisper → Raw transcript                       │
│                                                                      │
│   "So I've been thinking about how we handle auth and um            │
│    like the token refresh is a mess right now. Oh by the            │
│    way I should probably mention that Jake found a bug              │
│    yesterday which is kind of related. Anyway the main              │
│    thing is we need to implement proper token rotation..."          │
│                                                                      │
│   Step 2: Structuring (LLM via Lumen generation task)               │
│   ────────────────────────────────────────────────────              │
│   Raw transcript → Claude/LLM → Structured output                   │
│                                                                      │
│   Output:                                                           │
│   ├── Cleaned markdown (filler removed, headers added)              │
│   └── Vines array (detected asides as gutter content)               │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Extended Types for Draft Mode

```typescript
// Extended response type for draft mode
export interface LumenTranscriptionResponse {
  /** Transcribed/structured text */
  text: string;

  /** Word count */
  wordCount: number;

  /** Word-level timestamps (if requested, raw mode only) */
  words?: LumenTranscriptionWord[];

  /** VTT subtitle format (if timestamps requested) */
  vtt?: string;

  /** Model used for transcription */
  model: string;

  /** Provider used */
  provider: LumenProviderName;

  /** Estimated audio duration in seconds */
  duration: number;

  /** Total latency in milliseconds */
  latency: number;

  // ── Draft mode additions ──────────────────────────────────────────

  /** Auto-generated Vines from detected asides (draft mode only) */
  gutterContent?: GutterItem[];

  /** The raw transcript before structuring (draft mode only) */
  rawTranscript?: string;
}

// GutterItem type (from gutter.ts)
export interface GutterItem {
  /** Vine type */
  type: "comment" | "photo" | "gallery" | "emoji";

  /**
   * Anchor for positioning. Formats:
   * - "## Header Text" — attach to header
   * - "paragraph:N" — attach to Nth paragraph
   * - "anchor:tagname" — attach to custom anchor tag
   */
  anchor?: string;

  /** Content (markdown for comments, URL for photos) */
  content?: string;
}
```

### LLM Prompt Design

The structuring prompt is carefully designed to:
1. Clean up filler words without losing the author's voice
2. Add structure (headers, paragraphs) where natural breaks occur
3. Detect asides and convert them to Vine comments

```typescript
// prompts/scribe-draft.ts

export const SCRIBE_DRAFT_SYSTEM_PROMPT = `You are a skilled editor helping transform spoken thoughts into a blog post draft.

Your job is to:
1. CLEAN the transcript: Remove filler words (um, uh, like, you know, so, basically) but preserve the author's authentic voice and tone
2. STRUCTURE the content: Add markdown headers where topic shifts occur, break into logical paragraphs
3. DETECT ASIDES: Identify tangents, parenthetical thoughts, and side notes—these become Vines (sidebar annotations)

## Aside Detection

Look for phrases like:
- "by the way", "btw", "speaking of which"
- "oh, I should mention", "quick tangent", "side note"
- "this reminds me", "unrelated but", "on a different note"
- "actually, let me back up", "I forgot to say"
- Parenthetical thoughts that interrupt the main flow
- Personal anecdotes that aren't core to the argument

When you detect an aside:
1. Remove it from the main text
2. Add it as a Vine comment in the gutterContent array
3. Anchor it to the nearest relevant header or paragraph

## Output Format

You MUST respond with valid JSON in this exact format:
{
  "text": "The cleaned, structured markdown content",
  "gutterContent": [
    {
      "type": "comment",
      "anchor": "## Header or paragraph:N",
      "content": "The aside content as a Vine"
    }
  ]
}

## Guidelines

- Keep the author's voice—don't make it sound generic or corporate
- Structure should feel natural, not imposed
- Headers should be ## level (h2) for main sections
- Asides in Vines should feel like margin notes, not deleted content
- If there are no clear asides, return an empty gutterContent array
- Preserve technical terms, names, and specific details exactly
`;

export function buildScribeDraftPrompt(rawTranscript: string): string {
  return `Transform this spoken transcript into a structured blog post draft:

<transcript>
${rawTranscript}
</transcript>

Remember: Clean up filler, add structure, extract asides as Vines. Return JSON.`;
}
```

### Example Transformation

**Raw transcript from Whisper:**
```
So I've been thinking about how we handle authentication in the app
and um like the token refresh is kind of a mess right now. The thing
is when a token expires we're just showing an error which is terrible
UX. Oh by the way I should probably mention that Jake found a bug
yesterday where expired tokens were causing a crash on iOS which is
kind of related to this whole thing. Anyway the main thing is we need
to implement proper token rotation so that users never see an auth
error during normal use. I think the approach should be um basically
we check the token expiry before each request and if it's within like
five minutes of expiring we refresh it proactively.
```

**Draft mode output:**
```json
{
  "text": "## Authentication Token Handling\n\nI've been thinking about how we handle authentication in the app. The token refresh is a mess right now—when a token expires, we're just showing an error, which is terrible UX.\n\nWe need to implement proper token rotation so users never see an auth error during normal use.\n\n## Proposed Approach\n\nCheck the token expiry before each request. If it's within five minutes of expiring, refresh it proactively.",
  "gutterContent": [
    {
      "type": "comment",
      "anchor": "## Authentication Token Handling",
      "content": "Jake found a bug yesterday where expired tokens were causing a crash on iOS—related to this whole token handling issue."
    }
  ]
}
```

### Implementation: Draft Mode Handler

```typescript
// client.ts additions

export class LumenClient {
  async transcribe(
    request: LumenTranscriptionRequest,
    tier: TierKey
  ): Promise<LumenTranscriptionResponse> {
    // ... quota check, routing setup ...

    // Step 1: Always transcribe first
    const transcriptionResult = await this.executeTranscription(
      config,
      request.audio,
      request.options ?? {}
    );

    // Step 2: If draft mode, structure with LLM
    if (request.options?.mode === "draft") {
      return this.structureDraftTranscript(
        transcriptionResult,
        request,
        tier
      );
    }

    // Raw mode: return transcription as-is
    return {
      text: this.maybeScrubPii(transcriptionResult.text, request.options),
      wordCount: transcriptionResult.wordCount,
      words: transcriptionResult.words,
      vtt: transcriptionResult.vtt,
      model: transcriptionResult.model,
      provider: transcriptionResult.provider,
      duration: transcriptionResult.duration,
      latency: Date.now() - startTime,
    };
  }

  private async structureDraftTranscript(
    transcription: TranscriptionResult,
    request: LumenTranscriptionRequest,
    tier: TierKey
  ): Promise<LumenTranscriptionResponse> {
    const startTime = Date.now();

    // Use generation task for structuring
    const structureResult = await this.generate({
      prompt: buildScribeDraftPrompt(transcription.text),
      systemPrompt: SCRIBE_DRAFT_SYSTEM_PROMPT,
      tenant: request.tenant,
      options: {
        // Use a capable model for good structuring
        temperature: 0.3, // Low temp for consistency
        maxTokens: 4000,
        skipQuota: false, // Draft mode uses a generation quota too
      },
    }, tier);

    // Parse the JSON response
    let structured: { text: string; gutterContent: GutterItem[] };
    try {
      structured = JSON.parse(structureResult.text);
    } catch {
      // Fallback: return raw transcript if JSON parsing fails
      console.error("[Scribe] Failed to parse draft mode JSON, falling back to raw");
      return {
        text: transcription.text,
        wordCount: transcription.wordCount,
        model: transcription.model,
        provider: transcription.provider,
        duration: transcription.duration,
        latency: Date.now() - startTime,
        rawTranscript: transcription.text,
        gutterContent: [],
      };
    }

    // Validate and clean gutterContent
    const validatedGutter = this.validateGutterContent(structured.gutterContent);

    return {
      text: this.maybeScrubPii(structured.text, request.options),
      wordCount: structured.text.split(/\s+/).length,
      model: transcription.model,
      provider: transcription.provider,
      duration: transcription.duration,
      latency: Date.now() - startTime,
      rawTranscript: transcription.text,
      gutterContent: validatedGutter,
    };
  }

  private validateGutterContent(items: unknown): GutterItem[] {
    if (!Array.isArray(items)) return [];

    return items.filter((item): item is GutterItem => {
      if (typeof item !== "object" || item === null) return false;
      const { type, content } = item as Record<string, unknown>;

      // Must have valid type and content
      if (!["comment", "photo", "gallery", "emoji"].includes(type as string)) return false;
      if (typeof content !== "string" || !content.trim()) return false;

      return true;
    }).map(item => ({
      type: item.type,
      anchor: typeof item.anchor === "string" ? item.anchor : undefined,
      content: item.content,
    }));
  }
}
```

### Quota Considerations for Draft Mode

Draft mode consumes **two** quotas:
1. **transcription** — for the Whisper step
2. **generation** — for the LLM structuring step

This is transparent to users but important for tier planning:

```typescript
// Draft mode quota check
async function checkDraftModeQuota(
  tenant: string,
  tier: TierKey,
  quotaTracker: QuotaTracker
): Promise<{ allowed: boolean; reason?: string }> {
  const transcriptionQuota = await quotaTracker.checkQuota(tenant, "transcription", tier);
  const generationQuota = await quotaTracker.checkQuota(tenant, "generation", tier);

  if (!transcriptionQuota.allowed) {
    return { allowed: false, reason: "transcription quota exceeded" };
  }
  if (!generationQuota.allowed) {
    return { allowed: false, reason: "generation quota exceeded (needed for draft mode)" };
  }

  return { allowed: true };
}
```

### API Endpoint Updates for Draft Mode

```typescript
// routes/api/lumen/transcribe/+server.ts

export const POST: RequestHandler = async ({ request, locals, platform }) => {
  // ... auth, validation ...

  const mode = formData.get("mode") as "raw" | "draft" | null;

  const result = await lumen.transcribe(
    {
      audio,
      tenant: locals.user.tenantId,
      options: {
        language: language ?? undefined,
        task: task ?? "transcribe",
        mode: mode ?? "raw",
      },
    },
    locals.user.tier
  );

  // Return appropriate fields based on mode
  if (mode === "draft") {
    return json({
      text: result.text,
      wordCount: result.wordCount,
      duration: result.duration,
      latency: result.latency,
      gutterContent: result.gutterContent ?? [],
      rawTranscript: result.rawTranscript,
    });
  }

  return json({
    text: result.text,
    wordCount: result.wordCount,
    duration: result.duration,
    latency: result.latency,
  });
};
```

### Flow Mode: Mode Toggle UI

```svelte
<!-- components/flow/VoiceInput.svelte (updated) -->
<script lang="ts">
  // ... existing code ...

  let mode = $state<"raw" | "draft">("raw");

  async function transcribe(blob: Blob) {
    isTranscribing = true;

    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');
      formData.append('mode', mode);

      const response = await fetch('/api/lumen/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Transcription failed');
      }

      const result = await response.json();

      if (mode === "draft" && result.gutterContent?.length > 0) {
        // Insert text and attach Vines
        onTranscription(result.text, result.gutterContent);
      } else {
        onTranscription(result.text);
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Transcription failed';
    } finally {
      isTranscribing = false;
    }
  }
</script>

<!-- Mode toggle -->
<div class="mode-toggle">
  <button
    class:active={mode === "raw"}
    onclick={() => mode = "raw"}
  >
    Raw
  </button>
  <button
    class:active={mode === "draft"}
    onclick={() => mode = "draft"}
  >
    Draft ✨
  </button>
</div>

<style>
  .mode-toggle {
    @apply flex gap-1 rounded-lg bg-grove-glass/30 p-1;
  }

  .mode-toggle button {
    @apply px-3 py-1 rounded-md text-sm transition-all;
    @apply text-grove-text/70 hover:text-grove-text;
  }

  .mode-toggle button.active {
    @apply bg-grove-glass text-grove-text;
  }
</style>
```

---

## Client Integration: Flow Mode

### Browser-Side Recording

```typescript
// lib/scribe/recorder.ts

export interface ScribeRecorderOptions {
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

export class ScribeRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private chunks: Blob[] = [];
  private levelInterval: number | null = null;

  constructor(private options: ScribeRecorderOptions = {}) {}

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
  import { ScribeRecorder } from '$lib/scribe/recorder';
  import { onMount, onDestroy } from 'svelte';

  export let onTranscription: (text: string) => void;

  let recorder: ScribeRecorder;
  let isRecording = $state(false);
  let isTranscribing = $state(false);
  let audioLevel = $state(0);
  let error = $state<string | null>(null);

  onMount(async () => {
    recorder = new ScribeRecorder({
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

1. **Keyboard support** — `Cmd+Shift+U` (Mac) or `Ctrl+Shift+U` (Windows/Linux) to record. "U" for utterance. Avoids conflicts with paste-without-formatting (`Cmd+Shift+V`) and hard reload (`Ctrl+Shift+R`).
2. **Toggle mode** — For users who find holding keys/buttons difficult, offer click-to-start/click-to-stop as an alternative to hold-to-record. Essential for motor accessibility.
3. **Screen reader** — Announce recording state changes ("Recording started", "Recording stopped, transcribing...")
4. **Visual feedback** — Audio level meter, recording indicator, transcription spinner
5. **Reduced motion** — Respect `prefers-reduced-motion`, simplify animations

### Error Handling

| Error | User Message |
|-------|--------------|
| Microphone denied | "Microphone access is needed for voice input. Check your browser settings." |
| Quota exceeded | "You've used your daily transcription requests. Upgrade for more, or try again tomorrow." |
| Network error | "Couldn't reach the server. Check your connection and try again." |
| Transcription failed | "Couldn't understand that recording. Try speaking more clearly." |

### Privacy

1. **No audio storage** — Audio is transcribed and immediately discarded
2. **PII scrubbing** — Emails, phone numbers, SSNs are redacted from transcription
3. **Usage logging** — Only metadata (duration, tenant, tier) logged, never content
4. **Transparent** — Help article explaining how voice data is handled

### PII Scrubbing Implementation

Scribe uses Lumen's existing `scrubPii()` function to redact sensitive information from transcribed text before returning it to the client.

#### Detected Patterns

| PII Type | Pattern | Replacement |
|----------|---------|-------------|
| Email | `\b[\w.-]+@[\w.-]+\.\w{2,}\b` | `[EMAIL]` |
| Phone (US) | `\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b` | `[PHONE]` |
| SSN | `\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b` | `[SSN]` |
| Credit Card | `\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b` | `[CARD]` |
| IP Address | `\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b` | `[IP]` |

#### Scrubbing Strategy

```typescript
// lib/lumen/pii.ts

export interface PiiScrubResult {
  /** Text with PII replaced */
  scrubbed: string;
  /** Types of PII found */
  piiFound: PiiType[];
  /** Count of each type */
  counts: Record<PiiType, number>;
}

export type PiiType = "email" | "phone" | "ssn" | "card" | "ip";

const PII_PATTERNS: Record<PiiType, { regex: RegExp; replacement: string }> = {
  email: {
    regex: /\b[\w.-]+@[\w.-]+\.\w{2,}\b/gi,
    replacement: "[EMAIL]",
  },
  phone: {
    regex: /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    replacement: "[PHONE]",
  },
  ssn: {
    regex: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
    replacement: "[SSN]",
  },
  card: {
    regex: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    replacement: "[CARD]",
  },
  ip: {
    regex: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
    replacement: "[IP]",
  },
};

export function scrubPii(text: string): PiiScrubResult {
  let scrubbed = text;
  const piiFound: PiiType[] = [];
  const counts: Record<PiiType, number> = {
    email: 0, phone: 0, ssn: 0, card: 0, ip: 0,
  };

  for (const [type, { regex, replacement }] of Object.entries(PII_PATTERNS)) {
    const matches = scrubbed.match(regex);
    if (matches) {
      piiFound.push(type as PiiType);
      counts[type as PiiType] = matches.length;
      scrubbed = scrubbed.replace(regex, replacement);
    }
  }

  return { scrubbed, piiFound, counts };
}
```

#### False Positive Handling

Some patterns may match non-PII content:
- **IP addresses**: Version numbers like `1.2.3.4` may match. Accept this as conservative scrubbing.
- **Phone numbers**: Some numeric sequences may match. User can re-dictate if needed.
- **SSN pattern**: Date formats like `123-45-6789` may match. Better to over-scrub.

**Philosophy**: Over-scrubbing is preferred. Users can re-speak the content; leaked PII cannot be unshared.

#### Logging & Alerting

When PII is detected:

```typescript
// Log PII detection (never log the actual content)
if (scrubbed.piiFound.length > 0) {
  console.log(`[Scribe] PII scrubbed from transcription`, {
    tenant: request.tenant,
    types: scrubbed.piiFound,
    counts: scrubbed.counts,
    // Never log: the actual text, the PII values, or audio data
  });
}
```

No user notification for scrubbing—it happens silently. Users see `[EMAIL]` etc. in their text and can choose to re-type the actual value if intended.

#### Skip Option

For trusted internal tools (e.g., admin transcription of support calls with consent), PII scrubbing can be bypassed:

```typescript
options: {
  skipPiiScrub: true, // Requires elevated permissions
}
```

This flag is only honored for `oak` tier and above, and is logged for audit purposes.

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

- [ ] Create `ScribeRecorder` class for browser recording
- [ ] Create `VoiceInput.svelte` component
- [ ] Integrate into Flow mode editor toolbar
- [ ] Add keyboard shortcut (`Cmd+Shift+U` / `Ctrl+Shift+U`)
- [ ] Handle cursor position and text insertion

### Phase 3: Polish

- [ ] Add audio level visualization
- [ ] Add recording time indicator
- [ ] Create help article for voice input
- [ ] Add to onboarding flow
- [ ] Analytics for voice vs typed input ratio

### Phase 4: Advanced Features (Future)

- [ ] Real-time streaming transcription (requires OpenRouter—see constraints below)
- [ ] Voice commands ("new paragraph", "delete that")
- [ ] Multi-language auto-detection
- [ ] Integration with Wisp for voice-powered writing assistance

---

## Technical Constraints

### Streaming Limitation

**Cloudflare Workers AI Whisper does not support streaming.** Audio must be fully uploaded before transcription begins. This means:

- Users speak → recording completes → upload → transcription → response
- Typical latency: 1-3 seconds for short recordings (under 30s)
- For longer recordings, latency scales with audio length

If streaming becomes a requirement (showing words as user speaks), the fallback would be OpenRouter's Whisper endpoint, which supports chunked streaming. This would be a Phase 4 enhancement.

### Mobile UX

**Recommendation: Floating Action Button (FAB)**

On mobile, the microphone should be a floating button above the keyboard, not embedded in the keyboard area. Reasons:

- Easier thumb reach
- Visible regardless of keyboard state
- Consistent with mobile voice input patterns (iOS dictation, Gboard)
- 44×44px minimum touch target per accessibility guidelines

### Browser Compatibility

MediaRecorder API support varies across browsers. Key considerations:

| Browser | Supported Codecs | Notes |
|---------|------------------|-------|
| Chrome 49+ | `audio/webm;codecs=opus`, `audio/webm` | Best support, preferred |
| Firefox 25+ | `audio/webm;codecs=opus`, `audio/ogg` | Good support |
| Safari 14.1+ | `audio/mp4`, `audio/webm` | No Opus in older versions |
| Edge 79+ | Same as Chrome | Chromium-based |
| iOS Safari 14.5+ | `audio/mp4` | **No WebM support** |

#### Codec Detection Strategy

```typescript
function getSupportedMimeType(): string {
  const types = [
    "audio/webm;codecs=opus", // Best quality/size ratio
    "audio/webm",             // Fallback WebM
    "audio/ogg;codecs=opus",  // Firefox fallback
    "audio/mp4",              // Safari/iOS fallback
  ];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? "audio/webm";
}
```

#### iOS Safari Considerations

- Uses `audio/mp4` container (larger files than WebM)
- Requires user gesture to start recording
- May need explicit `getUserMedia` permission prompt
- Test thoroughly—iOS audio APIs are notoriously finicky

### Error Recovery Flows

#### Draft Mode Failures

Draft mode has multiple failure points. Each needs graceful degradation:

```typescript
async function transcribeWithRecovery(
  request: LumenTranscriptionRequest,
  tier: TierKey
): Promise<LumenTranscriptionResponse> {
  // 1. Pre-flight quota check for draft mode
  if (request.options?.mode === "draft") {
    const quotaCheck = await checkDraftModeQuota(request.tenant, tier);
    if (!quotaCheck.allowed) {
      // Offer to fall back to raw mode
      throw new QuotaError(
        `Draft mode unavailable: ${quotaCheck.reason}. ` +
        `Switch to Raw mode to continue.`
      );
    }
  }

  // 2. Transcription step
  let transcription: TranscriptionResult;
  try {
    transcription = await this.executeTranscription(config, request.audio, request.options);
  } catch (err) {
    // Transcription failed—no recovery possible
    throw new TranscriptionError("Could not transcribe audio. Try speaking more clearly.");
  }

  // 3. Draft mode structuring (with fallback)
  if (request.options?.mode === "draft") {
    try {
      return await this.structureDraftTranscript(transcription, request, tier);
    } catch (err) {
      // LLM failed—fall back to raw transcript
      console.error("[Scribe] Draft mode structuring failed, returning raw", err);
      return {
        text: transcription.text,
        wordCount: transcription.wordCount,
        model: transcription.model,
        provider: transcription.provider,
        duration: transcription.duration,
        latency: Date.now() - startTime,
        rawTranscript: transcription.text,
        gutterContent: [],
        // Signal to UI that draft mode failed
        _draftFallback: true,
      };
    }
  }

  return rawModeResponse(transcription);
}
```

#### Error States & User Messages

| Failure Point | Recovery | User Message |
|---------------|----------|--------------|
| Mic permission denied | None | "Microphone access needed. Check browser settings." |
| Transcription quota exceeded | Suggest upgrade | "Daily limit reached. Upgrade for more, or try tomorrow." |
| Generation quota exceeded (draft) | Fall back to raw | "Draft mode unavailable. Switching to Raw mode." |
| Transcription timeout | Retry once | "Taking longer than usual. Trying again..." |
| LLM structuring failed | Return raw text | "Couldn't structure draft. Here's the raw transcription." |
| Invalid JSON from LLM | Return raw text | (Same as above, silent fallback) |
| Network error | Retry with backoff | "Connection lost. Retrying..." |
| Audio too short (<1s) | Prompt re-record | "Recording too short. Hold longer to capture your thoughts." |
| Audio too long (>5min) | Truncate warning | "Recording truncated at 5 minutes. Consider shorter segments." |

#### Vine Validation Failures

If LLM returns malformed gutterContent:

```typescript
private validateGutterContent(items: unknown): GutterItem[] {
  if (!Array.isArray(items)) {
    console.warn("[Scribe] gutterContent not an array, ignoring");
    return [];
  }

  return items
    .filter((item): item is GutterItem => {
      if (typeof item !== "object" || item === null) {
        console.warn("[Scribe] Invalid gutter item (not object)", item);
        return false;
      }

      const { type, content, anchor } = item as Record<string, unknown>;

      // Type must be valid
      if (!["comment", "photo", "gallery", "emoji"].includes(type as string)) {
        console.warn("[Scribe] Invalid gutter type", type);
        return false;
      }

      // Content required for comments
      if (type === "comment" && (typeof content !== "string" || !content.trim())) {
        console.warn("[Scribe] Comment missing content");
        return false;
      }

      // Anchor validation (if present)
      if (anchor !== undefined && typeof anchor !== "string") {
        console.warn("[Scribe] Invalid anchor type", anchor);
        return false;
      }

      return true;
    })
    .map((item) => ({
      type: item.type,
      anchor: item.anchor,
      content: item.content,
    }));
}
```

Invalid Vines are silently dropped—better to return clean content than fail entirely.

---

## Open Questions

1. ~~**Streaming vs batch**~~ — **Decided:** Start with batch. CF Whisper doesn't support streaming. Add OpenRouter streaming in Phase 4 if needed.
2. **Voice commands** — Should "delete that" work? Or is that scope creep?
3. ~~**Mobile UX**~~ — **Decided:** Floating action button (FAB) above keyboard.
4. **Fallback to OpenAI** — Should we add OpenRouter Whisper as a fallback for redundancy? (Also enables future streaming.)

---

## References

- [Hex by Kit Langton](https://hex.kitlangton.com/) — Inspiration for UX
- [Cloudflare Workers AI Whisper](https://developers.cloudflare.com/workers-ai/models/whisper/)
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [Lumen Spec](./lumen-spec.md) — Grove's AI gateway
