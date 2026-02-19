/**
 * ScribeRecorder - Browser Audio Recording for Voice Transcription
 *
 * Handles the complexity of cross-browser audio recording:
 * - Chrome/Firefox: webm/opus (preferred)
 * - Safari/iOS: mp4 (fallback)
 *
 * Features:
 * - Warm-up phase to reduce first-record latency
 * - Audio level metering for visual feedback
 * - Proper cleanup to prevent memory leaks
 */

export type ScribeRecorderState =
  | "idle"
  | "warming"
  | "ready"
  | "recording"
  | "error";

export interface ScribeRecorderOptions {
  /** Callback when audio level changes (0-1, for visualization) */
  onAudioLevel?: (level: number) => void;

  /** Callback when recording state changes */
  onStateChange?: (state: ScribeRecorderState) => void;

  /** Callback when an error occurs */
  onError?: (error: Error) => void;
}

export interface ScribeRecordingResult {
  /** Audio data as Blob */
  blob: Blob;

  /** Audio data as Uint8Array (for sending to API) */
  data: Uint8Array;

  /** MIME type of the audio */
  mimeType: string;

  /** Duration in seconds */
  duration: number;
}

/**
 * Detect the best supported audio MIME type for this browser.
 * Prefers webm/opus (smaller, better quality) but falls back to mp4 for Safari.
 */
function getPreferredMimeType(): string {
  if (typeof MediaRecorder === "undefined") {
    return "audio/webm";
  }

  // Preferred formats in order
  const formats = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];

  for (const format of formats) {
    if (MediaRecorder.isTypeSupported(format)) {
      return format;
    }
  }

  // Fallback (let the browser decide)
  return "";
}

export class ScribeRecorder {
  private state: ScribeRecorderState = "idle";
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private mimeType: string = "";
  private startTime: number = 0;
  private levelAnimationFrame: number | null = null;

  private readonly options: ScribeRecorderOptions;

  constructor(options: ScribeRecorderOptions = {}) {
    this.options = options;
  }

  /**
   * Get the current recorder state.
   */
  getState(): ScribeRecorderState {
    return this.state;
  }

  /**
   * Check if the recorder is currently recording.
   */
  isRecording(): boolean {
    return this.state === "recording";
  }

  /**
   * Check if microphone is available.
   */
  static async checkMicrophonePermission(): Promise<boolean> {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Warm up the recorder by requesting microphone access.
   * Call this early (e.g., when toolbar opens) to reduce latency on first record.
   */
  async warm(): Promise<void> {
    if (this.state !== "idle") {
      return;
    }

    this.setState("warming");

    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Detect MIME type
      this.mimeType = getPreferredMimeType();

      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: this.mimeType || undefined,
      });

      // Set up audio level metering
      this.setupAudioMeter();

      this.setState("ready");
    } catch (err) {
      this.setState("error");
      this.options.onError?.(
        err instanceof Error ? err : new Error("Microphone access denied"),
      );
    }
  }

  /**
   * Start recording.
   * If not warmed up, will warm up first (with additional latency).
   */
  async start(): Promise<void> {
    // Warm up if needed
    if (this.state === "idle") {
      await this.warm();
    }

    if (this.state !== "ready") {
      throw new Error(`Cannot start recording in state: ${this.state}`);
    }

    if (!this.mediaRecorder) {
      throw new Error("MediaRecorder not initialized");
    }

    // Reset chunks
    this.chunks = [];
    this.startTime = Date.now();

    // Set up event handlers
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };

    // Start recording with timeslice for regular data chunks
    this.mediaRecorder.start(100);
    this.setState("recording");

    // Start audio level monitoring
    this.startLevelMonitoring();
  }

  /**
   * Stop recording and return the audio data.
   */
  async stop(): Promise<ScribeRecordingResult> {
    if (this.state !== "recording" || !this.mediaRecorder) {
      throw new Error(`Cannot stop recording in state: ${this.state}`);
    }

    // Stop level monitoring
    this.stopLevelMonitoring();

    // Stop the recorder
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error("MediaRecorder not available"));
        return;
      }

      this.mediaRecorder.onstop = async () => {
        try {
          const duration = (Date.now() - this.startTime) / 1000;
          const blob = new Blob(this.chunks, { type: this.mimeType });
          const arrayBuffer = await blob.arrayBuffer();
          const data = new Uint8Array(arrayBuffer);

          this.setState("ready");

          resolve({
            blob,
            data,
            mimeType: this.mimeType,
            duration,
          });
        } catch (err) {
          reject(err);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Cancel recording without returning data.
   */
  cancel(): void {
    if (this.state === "recording" && this.mediaRecorder) {
      this.stopLevelMonitoring();
      this.mediaRecorder.stop();
      this.chunks = [];
      this.setState("ready");
    }
  }

  /**
   * Dispose of all resources.
   * Call this when done with the recorder.
   */
  dispose(): void {
    this.stopLevelMonitoring();

    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.mediaRecorder = null;
    this.analyser = null;
    this.chunks = [];
    this.setState("idle");
  }

  /**
   * Set up audio level metering using Web Audio API.
   */
  private setupAudioMeter(): void {
    if (!this.stream || !this.options.onAudioLevel) {
      return;
    }

    try {
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;

      const source = this.audioContext.createMediaStreamSource(this.stream);
      source.connect(this.analyser);
    } catch {
      // Audio metering is optional, fail silently
    }
  }

  /**
   * Start monitoring audio levels and calling the callback.
   */
  private startLevelMonitoring(): void {
    if (!this.analyser || !this.options.onAudioLevel) {
      return;
    }

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const updateLevel = () => {
      if (!this.analyser || this.state !== "recording") {
        return;
      }

      this.analyser.getByteFrequencyData(dataArray);

      // Calculate RMS level (0-1)
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);
      const level = Math.min(1, rms / 128);

      this.options.onAudioLevel?.(level);

      this.levelAnimationFrame = requestAnimationFrame(updateLevel);
    };

    updateLevel();
  }

  /**
   * Stop audio level monitoring.
   */
  private stopLevelMonitoring(): void {
    if (this.levelAnimationFrame !== null) {
      cancelAnimationFrame(this.levelAnimationFrame);
      this.levelAnimationFrame = null;
    }

    // Reset level to 0
    this.options.onAudioLevel?.(0);
  }

  /**
   * Update state and notify callback.
   */
  private setState(state: ScribeRecorderState): void {
    this.state = state;
    this.options.onStateChange?.(state);
  }
}

/**
 * Create a new ScribeRecorder instance.
 */
export function createScribeRecorder(
  options?: ScribeRecorderOptions,
): ScribeRecorder {
  return new ScribeRecorder(options);
}
