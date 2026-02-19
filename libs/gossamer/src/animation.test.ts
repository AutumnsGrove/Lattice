/**
 * Tests for animation utilities
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { throttle, debounce, calculateFPS, easings, createAnimationLoop } from "./animation";

describe("throttle", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("should call function immediately on first call", () => {
		const fn = vi.fn();
		const throttled = throttle(fn, 100);

		throttled();
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it("should throttle subsequent calls within limit", () => {
		const fn = vi.fn();
		const throttled = throttle(fn, 100);

		throttled();
		throttled();
		throttled();

		expect(fn).toHaveBeenCalledTimes(1);
	});

	it("should call function again after limit expires", () => {
		const fn = vi.fn();
		const throttled = throttle(fn, 100);

		throttled();
		expect(fn).toHaveBeenCalledTimes(1);

		vi.advanceTimersByTime(150);
		throttled();
		expect(fn).toHaveBeenCalledTimes(2);
	});

	it("should pass arguments to throttled function", () => {
		const fn = vi.fn();
		const throttled = throttle(fn, 100);

		throttled("arg1", "arg2");
		expect(fn).toHaveBeenCalledWith("arg1", "arg2");
	});
});

describe("debounce", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("should not call function immediately", () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 100);

		debounced();
		expect(fn).not.toHaveBeenCalled();
	});

	it("should call function after delay", () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 100);

		debounced();
		vi.advanceTimersByTime(100);

		expect(fn).toHaveBeenCalledTimes(1);
	});

	it("should reset timer on subsequent calls", () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 100);

		debounced();
		vi.advanceTimersByTime(50);
		debounced();
		vi.advanceTimersByTime(50);

		expect(fn).not.toHaveBeenCalled();

		vi.advanceTimersByTime(50);
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it("should pass arguments to debounced function", () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 100);

		debounced("test", 123);
		vi.advanceTimersByTime(100);

		expect(fn).toHaveBeenCalledWith("test", 123);
	});
});

describe("calculateFPS", () => {
	it("should return 0 for empty array", () => {
		expect(calculateFPS([])).toBe(0);
	});

	it("should return 0 for single frame time", () => {
		expect(calculateFPS([1000])).toBe(0);
	});

	it("should calculate FPS correctly", () => {
		// 60 frames over 1 second = 60 FPS
		const frameTimes = Array.from({ length: 61 }, (_, i) => i * (1000 / 60));
		const fps = calculateFPS(frameTimes);

		expect(fps).toBeCloseTo(60, 0);
	});

	it("should handle 30 FPS", () => {
		// 30 frames over 1 second = 30 FPS
		const frameTimes = Array.from({ length: 31 }, (_, i) => i * (1000 / 30));
		const fps = calculateFPS(frameTimes);

		expect(fps).toBeCloseTo(30, 0);
	});

	it("should use sample size parameter", () => {
		// Create 100 frame times
		const frameTimes = Array.from({ length: 100 }, (_, i) => i * 16.67);

		// Should only use last 10 samples
		const fps = calculateFPS(frameTimes, 10);
		expect(fps).toBeCloseTo(60, 0);
	});
});

describe("easings", () => {
	describe("linear", () => {
		it("should return input unchanged", () => {
			expect(easings.linear(0)).toBe(0);
			expect(easings.linear(0.5)).toBe(0.5);
			expect(easings.linear(1)).toBe(1);
		});
	});

	describe("easeIn", () => {
		it("should start slow", () => {
			expect(easings.easeIn(0)).toBe(0);
			expect(easings.easeIn(0.5)).toBe(0.25);
			expect(easings.easeIn(1)).toBe(1);
		});
	});

	describe("easeOut", () => {
		it("should end slow", () => {
			expect(easings.easeOut(0)).toBe(0);
			expect(easings.easeOut(0.5)).toBe(0.75);
			expect(easings.easeOut(1)).toBe(1);
		});
	});

	describe("easeInOut", () => {
		it("should start and end slow", () => {
			expect(easings.easeInOut(0)).toBe(0);
			expect(easings.easeInOut(0.5)).toBe(0.5);
			expect(easings.easeInOut(1)).toBe(1);
		});

		it("should be symmetric around 0.5", () => {
			const val1 = easings.easeInOut(0.25);
			const val2 = 1 - easings.easeInOut(0.75);
			expect(val1).toBeCloseTo(val2, 5);
		});
	});

	describe("sineIn", () => {
		it("should return 0 at start and 1 at end", () => {
			expect(easings.sineIn(0)).toBe(0);
			expect(easings.sineIn(1)).toBeCloseTo(1, 5);
		});
	});

	describe("sineOut", () => {
		it("should return 0 at start and 1 at end", () => {
			expect(easings.sineOut(0)).toBe(0);
			expect(easings.sineOut(1)).toBeCloseTo(1, 5);
		});
	});

	describe("sineInOut", () => {
		it("should return 0 at start, 0.5 at middle, 1 at end", () => {
			expect(easings.sineInOut(0)).toBeCloseTo(0, 5);
			expect(easings.sineInOut(0.5)).toBeCloseTo(0.5, 5);
			expect(easings.sineInOut(1)).toBeCloseTo(1, 5);
		});
	});

	describe("bounceOut", () => {
		it("should return 0 at start and 1 at end", () => {
			expect(easings.bounceOut(0)).toBe(0);
			expect(easings.bounceOut(1)).toBeCloseTo(1, 5);
		});

		it("should overshoot intermediate values", () => {
			// bounceOut creates bouncing effect with values close to 1
			const val = easings.bounceOut(0.9);
			expect(val).toBeGreaterThan(0.9);
		});
	});
});

describe("createAnimationLoop", () => {
	it("should return control functions", () => {
		const loop = createAnimationLoop({
			onFrame: () => {},
		});

		expect(typeof loop.start).toBe("function");
		expect(typeof loop.stop).toBe("function");
		expect(typeof loop.pause).toBe("function");
		expect(typeof loop.resume).toBe("function");
		expect(typeof loop.getState).toBe("function");
	});

	it("should initialize with correct default state", () => {
		const loop = createAnimationLoop({
			fps: 60,
			onFrame: () => {},
		});

		const state = loop.getState();
		expect(state.isRunning).toBe(false);
		expect(state.frameId).toBeNull();
		expect(state.frameInterval).toBeCloseTo(1000 / 60, 1);
		expect(state.elapsedTime).toBe(0);
		expect(state.frameCount).toBe(0);
	});

	it("should use default FPS of 30", () => {
		const loop = createAnimationLoop({
			onFrame: () => {},
		});

		const state = loop.getState();
		expect(state.frameInterval).toBeCloseTo(1000 / 30, 1);
	});
});
