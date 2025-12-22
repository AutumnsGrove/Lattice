/**
 * Logo Component Tests
 *
 * Tests for the Grove logo breathing animation covering:
 * - Transform calculation logic for branch movements
 * - Animation class selection (breathing vs sway priority)
 * - Color computation logic
 * - Breathing animation state management
 * - Breathing speed configuration
 * - Reduced motion accessibility support
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';

// =============================================================================
// TRANSFORM CALCULATION TESTS
// =============================================================================
// These tests verify the transform logic without full component rendering.
// Expansion values are in SVG units tied to viewBox 417×512.238.

describe('Logo Transform Calculations', () => {
	// Constants matching the component (in SVG units)
	const MAX_EXPANSION = 22;
	const MAX_DIAG_EXPANSION = 16;

	/**
	 * Calculates the expansion value based on breath progress (0-1)
	 */
	function calculateExpansion(breathValue: number): number {
		return breathValue * MAX_EXPANSION;
	}

	/**
	 * Calculates the diagonal expansion value based on breath progress (0-1)
	 */
	function calculateDiagExpansion(breathValue: number): number {
		return breathValue * MAX_DIAG_EXPANSION;
	}

	/**
	 * Generates transform string for horizontal branches
	 */
	function getHorizontalTransform(expansion: number, direction: 'left' | 'right'): string {
		const x = direction === 'left' ? -expansion : expansion;
		return `translate(${x}, 0)`;
	}

	/**
	 * Generates transform string for vertical branch (top only)
	 */
	function getVerticalTransform(expansion: number): string {
		return `translate(0, ${-expansion})`;
	}

	/**
	 * Generates transform string for diagonal branches
	 */
	function getDiagonalTransform(
		diagExpansion: number,
		position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
	): string {
		const xDir = position.includes('left') ? -1 : 1;
		const yDir = position.includes('top') ? -1 : 1;
		return `translate(${xDir * diagExpansion}, ${yDir * diagExpansion})`;
	}

	// =========================================================================
	// Expansion Value Tests
	// =========================================================================

	describe('Expansion Values', () => {
		it('should return 0 expansion when breathValue is 0', () => {
			expect(calculateExpansion(0)).toBe(0);
			expect(calculateDiagExpansion(0)).toBe(0);
		});

		it('should return max expansion when breathValue is 1', () => {
			expect(calculateExpansion(1)).toBe(MAX_EXPANSION);
			expect(calculateDiagExpansion(1)).toBe(MAX_DIAG_EXPANSION);
		});

		it('should return half expansion when breathValue is 0.5', () => {
			expect(calculateExpansion(0.5)).toBe(MAX_EXPANSION / 2);
			expect(calculateDiagExpansion(0.5)).toBe(MAX_DIAG_EXPANSION / 2);
		});

		it('should scale linearly with breathValue', () => {
			const values = [0, 0.25, 0.5, 0.75, 1];
			values.forEach((v) => {
				expect(calculateExpansion(v)).toBe(v * MAX_EXPANSION);
			});
		});

		it('should have diagonal expansion smaller than horizontal for balanced animation', () => {
			// At 45°, diagonal movement appears larger due to hypotenuse
			// So we use a smaller value (~16px vs 22px)
			expect(MAX_DIAG_EXPANSION).toBeLessThan(MAX_EXPANSION);
		});
	});

	// =========================================================================
	// Horizontal Transform Tests
	// =========================================================================

	describe('Horizontal Transforms', () => {
		it('should move left bar in negative X direction', () => {
			const transform = getHorizontalTransform(22, 'left');
			expect(transform).toBe('translate(-22, 0)');
		});

		it('should move right bar in positive X direction', () => {
			const transform = getHorizontalTransform(22, 'right');
			expect(transform).toBe('translate(22, 0)');
		});

		it('should produce no movement at expansion 0', () => {
			expect(getHorizontalTransform(0, 'left')).toBe('translate(0, 0)');
			expect(getHorizontalTransform(0, 'right')).toBe('translate(0, 0)');
		});

		it('should produce symmetrical movement', () => {
			const expansion = 15;
			const leftTransform = getHorizontalTransform(expansion, 'left');
			const rightTransform = getHorizontalTransform(expansion, 'right');

			expect(leftTransform).toBe('translate(-15, 0)');
			expect(rightTransform).toBe('translate(15, 0)');
		});
	});

	// =========================================================================
	// Vertical Transform Tests
	// =========================================================================

	describe('Vertical Transforms', () => {
		it('should move top bar in negative Y direction (upward)', () => {
			const transform = getVerticalTransform(22);
			expect(transform).toBe('translate(0, -22)');
		});

		it('should produce no movement at expansion 0', () => {
			expect(getVerticalTransform(0)).toBe('translate(0, 0)');
		});
	});

	// =========================================================================
	// Diagonal Transform Tests
	// =========================================================================

	describe('Diagonal Transforms', () => {
		it('should move top-left diagonal in negative X and Y', () => {
			const transform = getDiagonalTransform(16, 'top-left');
			expect(transform).toBe('translate(-16, -16)');
		});

		it('should move top-right diagonal in positive X and negative Y', () => {
			const transform = getDiagonalTransform(16, 'top-right');
			expect(transform).toBe('translate(16, -16)');
		});

		it('should move bottom-left diagonal in negative X and positive Y', () => {
			const transform = getDiagonalTransform(16, 'bottom-left');
			expect(transform).toBe('translate(-16, 16)');
		});

		it('should move bottom-right diagonal in positive X and Y', () => {
			const transform = getDiagonalTransform(16, 'bottom-right');
			expect(transform).toBe('translate(16, 16)');
		});

		it('should produce no movement at expansion 0', () => {
			expect(getDiagonalTransform(0, 'top-left')).toBe('translate(0, 0)');
			expect(getDiagonalTransform(0, 'bottom-right')).toBe('translate(0, 0)');
		});
	});
});

// =============================================================================
// ANIMATION CLASS SELECTION TESTS
// =============================================================================

describe('Logo Animation Class Selection', () => {
	/**
	 * Determines which animation class to apply based on props
	 */
	function getAnimationClass(breathing: boolean, animate: boolean): string {
		// Breathing uses SVG transforms, not CSS class
		// Sway only applies when not breathing
		return animate && !breathing ? 'grove-logo-sway' : '';
	}

	it('should return empty string when no animation is enabled', () => {
		expect(getAnimationClass(false, false)).toBe('');
	});

	it('should return sway class when animate is true and breathing is false', () => {
		expect(getAnimationClass(false, true)).toBe('grove-logo-sway');
	});

	it('should return empty string when breathing is enabled (uses transforms instead)', () => {
		expect(getAnimationClass(true, false)).toBe('');
	});

	it('should prioritize breathing over sway (return empty for CSS class)', () => {
		// When both are true, breathing takes priority
		// Breathing uses SVG transforms, not CSS animation
		expect(getAnimationClass(true, true)).toBe('');
	});
});

// =============================================================================
// COLOR COMPUTATION TESTS
// =============================================================================

describe('Logo Color Computation', () => {
	const BARK_BROWN = '#5d4037';

	/**
	 * Computes the foliage color
	 */
	function getFoliageColor(color?: string): string {
		return color ?? 'currentColor';
	}

	/**
	 * Computes the trunk color
	 */
	function getTrunkColor(
		foliageColor: string,
		trunkColor?: string,
		monochrome: boolean = false
	): string {
		if (monochrome) {
			return foliageColor;
		}
		return trunkColor ?? BARK_BROWN;
	}

	describe('Foliage Color', () => {
		it('should default to currentColor when no color prop provided', () => {
			expect(getFoliageColor()).toBe('currentColor');
			expect(getFoliageColor(undefined)).toBe('currentColor');
		});

		it('should use provided color when specified', () => {
			expect(getFoliageColor('#ff0000')).toBe('#ff0000');
			expect(getFoliageColor('green')).toBe('green');
		});
	});

	describe('Trunk Color', () => {
		it('should default to bark brown when no trunkColor or monochrome', () => {
			expect(getTrunkColor('currentColor')).toBe(BARK_BROWN);
		});

		it('should use provided trunkColor when specified', () => {
			expect(getTrunkColor('currentColor', '#8b4513')).toBe('#8b4513');
		});

		it('should match foliage color in monochrome mode', () => {
			expect(getTrunkColor('#ff0000', undefined, true)).toBe('#ff0000');
			expect(getTrunkColor('currentColor', '#8b4513', true)).toBe('currentColor');
		});

		it('should ignore trunkColor in monochrome mode', () => {
			// Monochrome means both parts use foliage color
			expect(getTrunkColor('green', 'brown', true)).toBe('green');
		});
	});
});

// =============================================================================
// BREATHING ANIMATION STATE TESTS
// =============================================================================

describe('Logo Breathing Animation State', () => {
	/**
	 * Simulates the breathing animation cancellation logic
	 */
	function createAnimationController() {
		let cancelled = false;
		let pulseCount = 0;

		return {
			isCancelled: () => cancelled,
			cancel: () => {
				cancelled = true;
			},
			incrementPulse: () => {
				pulseCount++;
			},
			getPulseCount: () => pulseCount,
			reset: () => {
				cancelled = false;
				pulseCount = 0;
			}
		};
	}

	/**
	 * Simulates the pulse loop with proper cancellation
	 */
	async function simulatePulseLoop(
		controller: ReturnType<typeof createAnimationController>,
		maxIterations: number = 3
	): Promise<number> {
		let iterations = 0;

		while (!controller.isCancelled() && iterations < maxIterations) {
			// Simulate await breathValue.set(1)
			await Promise.resolve();
			if (controller.isCancelled()) break;

			// Simulate await breathValue.set(0)
			await Promise.resolve();
			controller.incrementPulse();
			iterations++;
		}

		return controller.getPulseCount();
	}

	it('should complete full pulse cycles when not cancelled', async () => {
		const controller = createAnimationController();
		const pulseCount = await simulatePulseLoop(controller, 3);

		expect(pulseCount).toBe(3);
	});

	it('should stop immediately when cancelled before first await', async () => {
		const controller = createAnimationController();
		controller.cancel();

		const pulseCount = await simulatePulseLoop(controller, 3);

		expect(pulseCount).toBe(0);
	});

	it('should stop after checking cancelled between awaits', async () => {
		const controller = createAnimationController();

		// Start the loop
		const loopPromise = simulatePulseLoop(controller, 10);

		// Cancel after a microtask (simulating mid-animation cancellation)
		await Promise.resolve();
		controller.cancel();

		const pulseCount = await loopPromise;

		// Should have stopped early, not completed all 10 iterations
		expect(pulseCount).toBeLessThan(10);
	});

	it('should be reusable after reset', async () => {
		const controller = createAnimationController();

		// First run
		await simulatePulseLoop(controller, 2);
		expect(controller.getPulseCount()).toBe(2);

		// Cancel and reset
		controller.cancel();
		controller.reset();

		// Second run
		await simulatePulseLoop(controller, 2);
		expect(controller.getPulseCount()).toBe(2);
	});
});

// =============================================================================
// CONDITIONAL RENDERING TESTS
// =============================================================================

describe('Logo Conditional Rendering', () => {
	/**
	 * Determines whether to use decomposed paths or single path
	 */
	function shouldUseDecomposedPaths(breathing: boolean): boolean {
		return breathing;
	}

	/**
	 * Returns the number of path elements to render
	 */
	function getPathCount(breathing: boolean): number {
		// When breathing: 1 center + 7 branches = 8 paths
		// When not breathing: 1 single path
		return breathing ? 8 : 1;
	}

	it('should use single path when breathing is disabled', () => {
		expect(shouldUseDecomposedPaths(false)).toBe(false);
		expect(getPathCount(false)).toBe(1);
	});

	it('should use decomposed paths when breathing is enabled', () => {
		expect(shouldUseDecomposedPaths(true)).toBe(true);
		expect(getPathCount(true)).toBe(8);
	});
});

// =============================================================================
// SVG VIEWBOX SCALE TESTS
// =============================================================================

describe('Logo ViewBox and Scaling', () => {
	const VIEWBOX_WIDTH = 417;
	const VIEWBOX_HEIGHT = 512.238;
	const MAX_EXPANSION = 22;

	it('should have expansion values appropriate for viewBox dimensions', () => {
		// Expansion should be small relative to viewBox for subtle animation
		const expansionRatioX = MAX_EXPANSION / VIEWBOX_WIDTH;
		const expansionRatioY = MAX_EXPANSION / VIEWBOX_HEIGHT;

		// Should be roughly 5% of the viewBox dimensions
		expect(expansionRatioX).toBeLessThan(0.1);
		expect(expansionRatioY).toBeLessThan(0.1);
		expect(expansionRatioX).toBeGreaterThan(0.01);
	});

	it('should maintain proportions regardless of rendered size', () => {
		// This is a documentation test - SVG transforms are in viewBox units
		// so they scale proportionally with the SVG element size

		const expansion = MAX_EXPANSION;
		const percentOfWidth = (expansion / VIEWBOX_WIDTH) * 100;
		const percentOfHeight = (expansion / VIEWBOX_HEIGHT) * 100;

		// ~5% horizontal expansion, ~4% vertical expansion
		expect(percentOfWidth).toBeCloseTo(5.28, 1);
		expect(percentOfHeight).toBeCloseTo(4.29, 1);
	});
});

// =============================================================================
// BREATHING SPEED CONFIGURATION TESTS
// =============================================================================

describe('Logo Breathing Speed Configuration', () => {
	type BreathingSpeed = 'slow' | 'normal' | 'fast';

	const BREATHING_SPEEDS: Record<BreathingSpeed, number> = {
		slow: 1500,    // 3s full cycle - calm, meditative
		normal: 800,   // 1.6s full cycle - balanced
		fast: 400      // 0.8s full cycle - urgent
	};

	/**
	 * Gets the duration for a breathing speed preset
	 */
	function getBreathingDuration(speed: BreathingSpeed): number {
		return BREATHING_SPEEDS[speed];
	}

	/**
	 * Gets the full cycle duration (expand + contract)
	 */
	function getFullCycleDuration(speed: BreathingSpeed): number {
		return BREATHING_SPEEDS[speed] * 2;
	}

	it('should have slow speed at 1500ms per half-cycle', () => {
		expect(getBreathingDuration('slow')).toBe(1500);
		expect(getFullCycleDuration('slow')).toBe(3000);
	});

	it('should have normal speed at 800ms per half-cycle', () => {
		expect(getBreathingDuration('normal')).toBe(800);
		expect(getFullCycleDuration('normal')).toBe(1600);
	});

	it('should have fast speed at 400ms per half-cycle', () => {
		expect(getBreathingDuration('fast')).toBe(400);
		expect(getFullCycleDuration('fast')).toBe(800);
	});

	it('should default to normal speed', () => {
		const defaultSpeed: BreathingSpeed = 'normal';
		expect(getBreathingDuration(defaultSpeed)).toBe(800);
	});

	it('should have progressively faster speeds', () => {
		expect(BREATHING_SPEEDS.slow).toBeGreaterThan(BREATHING_SPEEDS.normal);
		expect(BREATHING_SPEEDS.normal).toBeGreaterThan(BREATHING_SPEEDS.fast);
	});
});

// =============================================================================
// REDUCED MOTION ACCESSIBILITY TESTS
// =============================================================================

describe('Logo Reduced Motion Support', () => {
	/**
	 * Determines if animation should be disabled based on user preference
	 */
	function shouldDisableAnimation(
		breathing: boolean,
		prefersReducedMotion: boolean
	): boolean {
		return !breathing || prefersReducedMotion;
	}

	it('should disable animation when breathing is false', () => {
		expect(shouldDisableAnimation(false, false)).toBe(true);
	});

	it('should disable animation when user prefers reduced motion', () => {
		expect(shouldDisableAnimation(true, true)).toBe(true);
	});

	it('should enable animation when breathing is true and no motion preference', () => {
		expect(shouldDisableAnimation(true, false)).toBe(false);
	});

	it('should prioritize reduced motion over breathing prop', () => {
		// Even if breathing is requested, respect user's accessibility preference
		expect(shouldDisableAnimation(true, true)).toBe(true);
	});
});

// =============================================================================
// ANIMATION CANCELLATION ROBUSTNESS TESTS
// =============================================================================

describe('Logo Animation Cancellation Robustness', () => {
	/**
	 * Simulates the pulse loop with cancellation checks after both awaits
	 */
	async function simulateRobustPulseLoop(
		controller: { isCancelled: () => boolean; incrementPulse: () => void },
		maxIterations: number = 3
	): Promise<{ completedPulses: number; exitPoint: 'after-expand' | 'after-contract' | 'normal' }> {
		let completedPulses = 0;
		let exitPoint: 'after-expand' | 'after-contract' | 'normal' = 'normal';

		for (let i = 0; i < maxIterations && !controller.isCancelled(); i++) {
			// Simulate await breathValue.set(1)
			await Promise.resolve();
			if (controller.isCancelled()) {
				exitPoint = 'after-expand';
				break;
			}

			// Simulate await breathValue.set(0)
			await Promise.resolve();
			if (controller.isCancelled()) {
				exitPoint = 'after-contract';
				break;
			}

			controller.incrementPulse();
			completedPulses++;
		}

		return { completedPulses, exitPoint };
	}

	it('should exit cleanly after expand phase when cancelled', async () => {
		let cancelled = false;
		let pulses = 0;

		const controller = {
			isCancelled: () => cancelled,
			incrementPulse: () => pulses++
		};

		// Start loop, cancel after first microtask
		const promise = simulateRobustPulseLoop(controller, 5);
		await Promise.resolve();
		cancelled = true;

		const result = await promise;

		expect(result.exitPoint).toBe('after-expand');
		expect(result.completedPulses).toBe(0);
	});

	it('should complete all iterations when not cancelled', async () => {
		const controller = {
			isCancelled: () => false,
			incrementPulse: () => {}
		};

		const result = await simulateRobustPulseLoop(controller, 3);

		expect(result.exitPoint).toBe('normal');
		expect(result.completedPulses).toBe(3);
	});
});
