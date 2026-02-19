/**
 * ScribeRecorder - Browser Audio Recording Tests
 *
 * Tests the ScribeRecorder class behavior, not MediaRecorder implementation details.
 * Focus: Does recording work? Are callbacks fired correctly? Is cleanup handled?
 *
 * @see /grove-testing for testing philosophy
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ScribeRecorder, createScribeRecorder } from "./recorder.js";

// =============================================================================
// MOCK SETUP
// =============================================================================

// Mock MediaRecorder
class MockMediaRecorder {
  state: "inactive" | "recording" | "paused" = "inactive";
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: ((event: { error: Error }) => void) | null = null;

  private stream: MediaStream;

  constructor(stream: MediaStream, _options?: MediaRecorderOptions) {
    this.stream = stream;
  }

  start(_timeslice?: number) {
    this.state = "recording";
    // Simulate some data being available
    setTimeout(() => {
      this.ondataavailable?.({ data: new Blob(["test audio"]) });
    }, 10);
  }

  stop() {
    this.state = "inactive";
    setTimeout(() => {
      this.onstop?.();
    }, 10);
  }

  static isTypeSupported(type: string): boolean {
    return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].includes(type);
  }
}

// Mock MediaStream
class MockMediaStream {
  private tracks: MockMediaStreamTrack[] = [];

  constructor() {
    this.tracks = [new MockMediaStreamTrack()];
  }

  getTracks() {
    return this.tracks;
  }
}

class MockMediaStreamTrack {
  enabled = true;
  stop() {
    this.enabled = false;
  }
}

// Mock AudioContext
class MockAudioContext {
  state: "running" | "closed" = "running";
  private analyser: MockAnalyserNode;

  constructor() {
    this.analyser = new MockAnalyserNode();
  }

  createAnalyser() {
    return this.analyser;
  }

  createMediaStreamSource(_stream: MediaStream) {
    return {
      connect: vi.fn(),
    };
  }

  close() {
    this.state = "closed";
    return Promise.resolve();
  }
}

class MockAnalyserNode {
  fftSize = 256;
  frequencyBinCount = 128;

  getByteFrequencyData(array: Uint8Array) {
    // Simulate some audio levels
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 128);
    }
  }
}

// Install mocks
beforeEach(() => {
  vi.stubGlobal("MediaRecorder", MockMediaRecorder);
  vi.stubGlobal("MediaStream", MockMediaStream);
  vi.stubGlobal("AudioContext", MockAudioContext);

  // Mock navigator.mediaDevices
  vi.stubGlobal("navigator", {
    mediaDevices: {
      getUserMedia: vi.fn().mockResolvedValue(new MockMediaStream()),
    },
  });

  // Mock requestAnimationFrame for audio level monitoring
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn((cb) => {
      return setTimeout(cb, 16) as unknown as number;
    }),
  );
  vi.stubGlobal(
    "cancelAnimationFrame",
    vi.fn((id) => clearTimeout(id)),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// =============================================================================
// FACTORY FUNCTION TESTS
// =============================================================================

describe("createScribeRecorder()", () => {
  it("should create a ScribeRecorder instance", () => {
    const recorder = createScribeRecorder();

    expect(recorder).toBeInstanceOf(ScribeRecorder);
  });

  it("should pass options to the recorder", () => {
    const onStateChange = vi.fn();
    const recorder = createScribeRecorder({ onStateChange });

    // Warming up should trigger state change
    recorder.warm();
    expect(onStateChange).toHaveBeenCalledWith("warming");
  });
});

// =============================================================================
// STATE MANAGEMENT TESTS
// =============================================================================

describe("ScribeRecorder State", () => {
  it("should start in idle state", () => {
    const recorder = new ScribeRecorder();

    expect(recorder.getState()).toBe("idle");
    expect(recorder.isRecording()).toBe(false);
  });

  it("should transition to warming when warm() is called", async () => {
    const onStateChange = vi.fn();
    const recorder = new ScribeRecorder({ onStateChange });

    recorder.warm();

    expect(onStateChange).toHaveBeenCalledWith("warming");
  });

  it("should transition to ready after warming completes", async () => {
    const onStateChange = vi.fn();
    const recorder = new ScribeRecorder({ onStateChange });

    await recorder.warm();

    expect(recorder.getState()).toBe("ready");
    expect(onStateChange).toHaveBeenCalledWith("ready");
  });

  it("should only warm once even if called multiple times", async () => {
    const recorder = new ScribeRecorder();

    await recorder.warm();
    await recorder.warm();
    await recorder.warm();

    // Should still be in ready state, not warming again
    expect(recorder.getState()).toBe("ready");
  });
});

// =============================================================================
// RECORDING LIFECYCLE TESTS
// =============================================================================

describe("ScribeRecorder Recording", () => {
  it("should auto-warm if start() is called before warm()", async () => {
    const onStateChange = vi.fn();
    const recorder = new ScribeRecorder({ onStateChange });

    await recorder.start();

    // Should have gone through warming -> ready -> recording
    expect(onStateChange).toHaveBeenCalledWith("warming");
    expect(onStateChange).toHaveBeenCalledWith("ready");
    expect(onStateChange).toHaveBeenCalledWith("recording");
  });

  it("should start recording when start() is called", async () => {
    const recorder = new ScribeRecorder();
    await recorder.warm();

    await recorder.start();

    expect(recorder.getState()).toBe("recording");
    expect(recorder.isRecording()).toBe(true);
  });

  it("should stop recording and return audio data", async () => {
    const recorder = new ScribeRecorder();
    await recorder.warm();
    await recorder.start();

    const result = await recorder.stop();

    expect(result).toHaveProperty("blob");
    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("mimeType");
    expect(result).toHaveProperty("duration");
    expect(result.data).toBeInstanceOf(Uint8Array);
    expect(recorder.getState()).toBe("ready");
  });

  it("should throw if stop() is called when not recording", async () => {
    const recorder = new ScribeRecorder();
    await recorder.warm();

    await expect(recorder.stop()).rejects.toThrow(/Cannot stop/);
  });

  it("should throw if start() is called while recording", async () => {
    const recorder = new ScribeRecorder();
    await recorder.warm();
    await recorder.start();

    await expect(recorder.start()).rejects.toThrow(/Cannot start/);
  });
});

// =============================================================================
// CANCEL TESTS
// =============================================================================

describe("ScribeRecorder Cancel", () => {
  it("should cancel recording without returning data", async () => {
    const recorder = new ScribeRecorder();
    await recorder.warm();
    await recorder.start();

    recorder.cancel();

    expect(recorder.getState()).toBe("ready");
    expect(recorder.isRecording()).toBe(false);
  });

  it("should be safe to call cancel when not recording", () => {
    const recorder = new ScribeRecorder();

    // Should not throw
    expect(() => recorder.cancel()).not.toThrow();
  });
});

// =============================================================================
// DISPOSE TESTS
// =============================================================================

describe("ScribeRecorder Dispose", () => {
  it("should clean up all resources when disposed", async () => {
    const recorder = new ScribeRecorder();
    await recorder.warm();

    recorder.dispose();

    expect(recorder.getState()).toBe("idle");
  });

  it("should stop recording before disposing", async () => {
    const recorder = new ScribeRecorder();
    await recorder.warm();
    await recorder.start();

    recorder.dispose();

    expect(recorder.getState()).toBe("idle");
    expect(recorder.isRecording()).toBe(false);
  });

  it("should be safe to call dispose multiple times", async () => {
    const recorder = new ScribeRecorder();
    await recorder.warm();

    recorder.dispose();
    recorder.dispose();
    recorder.dispose();

    expect(recorder.getState()).toBe("idle");
  });
});

// =============================================================================
// AUDIO LEVEL CALLBACK TESTS
// =============================================================================

describe("ScribeRecorder Audio Level", () => {
  it("should call onAudioLevel callback while recording", async () => {
    const onAudioLevel = vi.fn();
    const recorder = new ScribeRecorder({ onAudioLevel });
    await recorder.warm();

    await recorder.start();

    // Wait for requestAnimationFrame to fire
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(onAudioLevel).toHaveBeenCalled();
    // Level should be between 0 and 1
    const level = onAudioLevel.mock.calls[0][0];
    expect(level).toBeGreaterThanOrEqual(0);
    expect(level).toBeLessThanOrEqual(1);
  });

  it("should reset audio level to 0 when recording stops", async () => {
    const onAudioLevel = vi.fn();
    const recorder = new ScribeRecorder({ onAudioLevel });
    await recorder.warm();
    await recorder.start();

    await recorder.stop();

    // Last call should be 0 (reset)
    const lastCall =
      onAudioLevel.mock.calls[onAudioLevel.mock.calls.length - 1];
    expect(lastCall[0]).toBe(0);
  });
});

// =============================================================================
// ERROR HANDLING TESTS
// =============================================================================

describe("ScribeRecorder Error Handling", () => {
  it("should call onError when microphone access is denied", async () => {
    // Override getUserMedia to reject
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockRejectedValue(new Error("Permission denied")),
      },
    });

    const onError = vi.fn();
    const recorder = new ScribeRecorder({ onError });

    await recorder.warm();

    expect(onError).toHaveBeenCalled();
    expect(recorder.getState()).toBe("error");
  });

  it("should call onError with descriptive message", async () => {
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockRejectedValue(new Error("NotAllowedError")),
      },
    });

    const onError = vi.fn();
    const recorder = new ScribeRecorder({ onError });

    await recorder.warm();

    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    const error = onError.mock.calls[0][0];
    expect(error.message).toBeTruthy();
  });
});

// =============================================================================
// STATIC METHOD TESTS
// =============================================================================

describe("ScribeRecorder.checkMicrophonePermission()", () => {
  it("should return true when microphone access is granted", async () => {
    const result = await ScribeRecorder.checkMicrophonePermission();

    expect(result).toBe(true);
  });

  it("should return false when microphone access is denied", async () => {
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockRejectedValue(new Error("Permission denied")),
      },
    });

    const result = await ScribeRecorder.checkMicrophonePermission();

    expect(result).toBe(false);
  });

  it("should return false when mediaDevices is not available", async () => {
    vi.stubGlobal("navigator", {});

    const result = await ScribeRecorder.checkMicrophonePermission();

    expect(result).toBe(false);
  });
});
