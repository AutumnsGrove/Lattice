/**
 * Performance Utilities
 *
 * Visibility detection, resource management, and optimization helpers.
 */

/**
 * Visibility observer callback type
 */
export type VisibilityCallback = (isVisible: boolean, entry: IntersectionObserverEntry) => void;

/**
 * Create an IntersectionObserver for visibility-based animation control
 *
 * @param element - Element to observe
 * @param callback - Called when visibility changes
 * @param threshold - Visibility threshold (0-1, default: 0.1)
 * @returns Cleanup function to disconnect observer
 */
export function createVisibilityObserver(
	element: Element,
	callback: VisibilityCallback,
	threshold: number = 0.1,
): () => void {
	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				callback(entry.isIntersecting, entry);
			}
		},
		{ threshold },
	);

	observer.observe(element);

	return () => {
		observer.disconnect();
	};
}

/**
 * Create a ResizeObserver for responsive canvas sizing
 *
 * @param element - Element to observe
 * @param callback - Called on resize with new dimensions
 * @param debounceMs - Debounce delay in ms (default: 100)
 * @returns Cleanup function to disconnect observer
 */
export function createResizeObserver(
	element: Element,
	callback: (width: number, height: number, entry: ResizeObserverEntry) => void,
	debounceMs: number = 100,
): () => void {
	let timeout: ReturnType<typeof setTimeout> | null = null;

	const observer = new ResizeObserver((entries) => {
		if (timeout) {
			clearTimeout(timeout);
		}

		timeout = setTimeout(() => {
			const entry = entries[0];
			if (entry) {
				const { width, height } = entry.contentRect;
				callback(width, height, entry);
			}
		}, debounceMs);
	});

	observer.observe(element);

	return () => {
		if (timeout) {
			clearTimeout(timeout);
		}
		observer.disconnect();
	};
}

/**
 * Check if the user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
	if (typeof window === "undefined") return false;
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Create a listener for reduced motion preference changes
 *
 * @param callback - Called when preference changes
 * @returns Cleanup function to remove listener
 */
export function onReducedMotionChange(callback: (prefersReduced: boolean) => void): () => void {
	if (typeof window === "undefined") {
		return () => {};
	}

	const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

	const handler = (event: MediaQueryListEvent) => {
		callback(event.matches);
	};

	mediaQuery.addEventListener("change", handler);

	// Call immediately with current value
	callback(mediaQuery.matches);

	return () => {
		mediaQuery.removeEventListener("change", handler);
	};
}

/**
 * Check if the browser is in a low-power mode or has reduced capabilities
 */
export function isLowPowerMode(): boolean {
	// Check for battery API (if available)
	if (typeof navigator !== "undefined" && "getBattery" in navigator) {
		// Battery API is async, so this is a simplified check
		// Real implementation would need to be async
		return false;
	}

	// Fallback: check for hardware concurrency
	if (typeof navigator !== "undefined" && navigator.hardwareConcurrency) {
		return navigator.hardwareConcurrency <= 2;
	}

	return false;
}

/**
 * Get recommended FPS based on device capabilities
 */
export function getRecommendedFPS(): number {
	if (prefersReducedMotion()) {
		return 0; // No animation
	}

	if (isLowPowerMode()) {
		return 15; // Low power mode
	}

	// Default for capable devices
	return 30;
}

/**
 * Performance monitoring for debugging
 */
export interface PerformanceMetrics {
	fps: number;
	frameTime: number;
	droppedFrames: number;
}

/**
 * Create a simple FPS counter
 */
export function createFPSCounter(): {
	tick: () => void;
	getFPS: () => number;
	getMetrics: () => PerformanceMetrics;
	reset: () => void;
} {
	const frameTimes: number[] = [];
	const maxSamples = 60;
	let droppedFrames = 0;
	let lastFrameTime = performance.now();

	function tick(): void {
		const now = performance.now();
		const delta = now - lastFrameTime;
		lastFrameTime = now;

		frameTimes.push(now);

		if (frameTimes.length > maxSamples) {
			frameTimes.shift();
		}

		// Count dropped frames (assuming 60fps target, frames taking >20ms are "dropped")
		if (delta > 20) {
			droppedFrames += Math.floor(delta / 16.67) - 1;
		}
	}

	function getFPS(): number {
		if (frameTimes.length < 2) return 0;

		const oldest = frameTimes[0];
		const newest = frameTimes[frameTimes.length - 1];
		const elapsed = newest - oldest;

		if (elapsed === 0) return 0;

		return ((frameTimes.length - 1) / elapsed) * 1000;
	}

	function getMetrics(): PerformanceMetrics {
		const fps = getFPS();
		const frameTime = fps > 0 ? 1000 / fps : 0;

		return {
			fps: Math.round(fps * 10) / 10,
			frameTime: Math.round(frameTime * 100) / 100,
			droppedFrames,
		};
	}

	function reset(): void {
		frameTimes.length = 0;
		droppedFrames = 0;
		lastFrameTime = performance.now();
	}

	return { tick, getFPS, getMetrics, reset };
}

/**
 * Request idle callback with fallback
 */
export function requestIdleCallback(callback: () => void, options?: { timeout?: number }): number {
	// Use globalThis for cross-environment compatibility
	const global = globalThis as typeof globalThis & {
		requestIdleCallback?: typeof window.requestIdleCallback;
		setTimeout: typeof setTimeout;
	};

	if (typeof global.requestIdleCallback === "function") {
		return global.requestIdleCallback(callback, options);
	}

	// Fallback using setTimeout
	return global.setTimeout(callback, options?.timeout ?? 1) as unknown as number;
}

/**
 * Cancel idle callback with fallback
 */
export function cancelIdleCallback(id: number): void {
	// Use globalThis for cross-environment compatibility
	const global = globalThis as typeof globalThis & {
		cancelIdleCallback?: typeof window.cancelIdleCallback;
		clearTimeout: typeof clearTimeout;
	};

	if (typeof global.cancelIdleCallback === "function") {
		global.cancelIdleCallback(id);
	} else {
		global.clearTimeout(id);
	}
}

/**
 * Check if we're running in a browser environment
 */
export function isBrowser(): boolean {
	return typeof window !== "undefined" && typeof document !== "undefined";
}

/**
 * Check if Canvas is supported
 */
export function isCanvasSupported(): boolean {
	if (!isBrowser()) return false;

	const canvas = document.createElement("canvas");
	return !!(canvas.getContext && canvas.getContext("2d"));
}

/**
 * Check if OffscreenCanvas is supported
 */
export function isOffscreenCanvasSupported(): boolean {
	return typeof OffscreenCanvas !== "undefined";
}
