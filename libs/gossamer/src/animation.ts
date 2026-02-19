/**
 * Gossamer Animation Utilities
 *
 * FPS limiting, animation loop management, and timing utilities.
 */

/**
 * Animation state for tracking loop execution
 */
export interface AnimationState {
	/** Whether animation is currently running */
	isRunning: boolean;
	/** Current animation frame ID */
	frameId: number | null;
	/** Timestamp of last frame */
	lastFrameTime: number;
	/** Frame interval in ms (derived from FPS) */
	frameInterval: number;
	/** Total elapsed time in ms */
	elapsedTime: number;
	/** Current frame count */
	frameCount: number;
}

/**
 * Options for creating an animation loop
 */
export interface AnimationOptions {
	/** Target frames per second (default: 30) */
	fps?: number;
	/** Callback when animation starts */
	onStart?: () => void;
	/** Callback when animation stops */
	onStop?: () => void;
	/** Callback for each frame - return false to stop */
	onFrame: (time: number, deltaTime: number, frameCount: number) => boolean | void;
}

/**
 * Create a managed animation loop with FPS limiting
 */
export function createAnimationLoop(options: AnimationOptions): {
	start: () => void;
	stop: () => void;
	pause: () => void;
	resume: () => void;
	getState: () => AnimationState;
} {
	const { fps = 30, onStart, onStop, onFrame } = options;

	const state: AnimationState = {
		isRunning: false,
		frameId: null,
		lastFrameTime: 0,
		frameInterval: 1000 / fps,
		elapsedTime: 0,
		frameCount: 0,
	};

	let pausedTime = 0;
	let isPaused = false;

	function animate(currentTime: number): void {
		if (!state.isRunning || isPaused) return;

		const deltaTime = currentTime - state.lastFrameTime;

		if (deltaTime >= state.frameInterval) {
			state.elapsedTime += deltaTime;
			state.frameCount++;

			const continueAnimation = onFrame(currentTime, deltaTime, state.frameCount);

			if (continueAnimation === false) {
				stop();
				return;
			}

			// Adjust for frame timing drift
			state.lastFrameTime = currentTime - (deltaTime % state.frameInterval);
		}

		state.frameId = requestAnimationFrame(animate);
	}

	function start(): void {
		if (state.isRunning) return;

		state.isRunning = true;
		state.lastFrameTime = performance.now();
		state.elapsedTime = 0;
		state.frameCount = 0;
		isPaused = false;

		onStart?.();
		state.frameId = requestAnimationFrame(animate);
	}

	function stop(): void {
		state.isRunning = false;
		isPaused = false;

		if (state.frameId !== null) {
			cancelAnimationFrame(state.frameId);
			state.frameId = null;
		}

		onStop?.();
	}

	function pause(): void {
		if (!state.isRunning || isPaused) return;

		isPaused = true;
		pausedTime = performance.now();

		if (state.frameId !== null) {
			cancelAnimationFrame(state.frameId);
			state.frameId = null;
		}
	}

	function resume(): void {
		if (!state.isRunning || !isPaused) return;

		isPaused = false;
		// Adjust lastFrameTime to account for paused duration
		state.lastFrameTime += performance.now() - pausedTime;
		state.frameId = requestAnimationFrame(animate);
	}

	function getState(): AnimationState {
		return { ...state };
	}

	return { start, stop, pause, resume, getState };
}

/**
 * Simple throttle function for limiting function execution
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
	fn: T,
	limit: number,
): (...args: Parameters<T>) => void {
	let lastCall = 0;
	let timeout: ReturnType<typeof setTimeout> | null = null;

	return (...args: Parameters<T>): void => {
		const now = Date.now();

		if (now - lastCall >= limit) {
			lastCall = now;
			fn(...args);
		} else if (!timeout) {
			timeout = setTimeout(
				() => {
					lastCall = Date.now();
					timeout = null;
					fn(...args);
				},
				limit - (now - lastCall),
			);
		}
	};
}

/**
 * Debounce function for delaying execution until activity stops
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
	fn: T,
	delay: number,
): (...args: Parameters<T>) => void {
	let timeout: ReturnType<typeof setTimeout> | null = null;

	return (...args: Parameters<T>): void => {
		if (timeout) {
			clearTimeout(timeout);
		}

		timeout = setTimeout(() => {
			timeout = null;
			fn(...args);
		}, delay);
	};
}

/**
 * Calculate actual FPS from frame times
 */
export function calculateFPS(frameTimes: number[], sampleSize: number = 60): number {
	if (frameTimes.length < 2) return 0;

	const samples = frameTimes.slice(-sampleSize);
	const totalTime = samples[samples.length - 1] - samples[0];
	const frameCount = samples.length - 1;

	if (totalTime <= 0) return 0;

	return (frameCount / totalTime) * 1000;
}

/**
 * Easing functions for smooth animations
 */
export const easings = {
	/** Linear - no easing */
	linear: (t: number): number => t,

	/** Ease in - slow start */
	easeIn: (t: number): number => t * t,

	/** Ease out - slow end */
	easeOut: (t: number): number => t * (2 - t),

	/** Ease in/out - slow start and end */
	easeInOut: (t: number): number => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

	/** Sine ease in */
	sineIn: (t: number): number => 1 - Math.cos((t * Math.PI) / 2),

	/** Sine ease out */
	sineOut: (t: number): number => Math.sin((t * Math.PI) / 2),

	/** Sine ease in/out */
	sineInOut: (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2,

	/** Bounce at end */
	bounceOut: (t: number): number => {
		const n1 = 7.5625;
		const d1 = 2.75;

		if (t < 1 / d1) {
			return n1 * t * t;
		} else if (t < 2 / d1) {
			return n1 * (t -= 1.5 / d1) * t + 0.75;
		} else if (t < 2.5 / d1) {
			return n1 * (t -= 2.25 / d1) * t + 0.9375;
		} else {
			return n1 * (t -= 2.625 / d1) * t + 0.984375;
		}
	},
};

export type EasingFunction = (t: number) => number;
