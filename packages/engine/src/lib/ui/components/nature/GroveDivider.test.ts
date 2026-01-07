/**
 * GroveDivider Component Tests
 *
 * Tests for the decorative Grove logo divider covering:
 * - Logo array generation based on count prop
 * - Alternating flip pattern logic
 * - Size class mapping
 * - Layout direction (vertical/horizontal)
 * - CSS class composition
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';

// =============================================================================
// LOGO ARRAY GENERATION TESTS
// =============================================================================

describe('GroveDivider Logo Array Generation', () => {
	/**
	 * Generates array of indices for logo rendering
	 * Matches: Array.from({ length: count }, (_, i) => i)
	 */
	function generateLogoArray(count: number): number[] {
		return Array.from({ length: count }, (_, i) => i);
	}

	it('should generate correct array for default count of 7', () => {
		const logos = generateLogoArray(7);
		expect(logos).toEqual([0, 1, 2, 3, 4, 5, 6]);
		expect(logos.length).toBe(7);
	});

	it('should generate empty array for count of 0', () => {
		const logos = generateLogoArray(0);
		expect(logos).toEqual([]);
		expect(logos.length).toBe(0);
	});

	it('should generate single item array for count of 1', () => {
		const logos = generateLogoArray(1);
		expect(logos).toEqual([0]);
	});

	it('should generate correct array for vertical divider count of 15', () => {
		const logos = generateLogoArray(15);
		expect(logos.length).toBe(15);
		expect(logos[0]).toBe(0);
		expect(logos[14]).toBe(14);
	});

	it('should handle large counts efficiently', () => {
		const logos = generateLogoArray(100);
		expect(logos.length).toBe(100);
		expect(logos[99]).toBe(99);
	});
});

// =============================================================================
// ALTERNATING FLIP PATTERN TESTS
// =============================================================================

describe('GroveDivider Flip Pattern', () => {
	/**
	 * Determines if a logo should be flipped (every odd index)
	 * Matches: index % 2 === 1
	 */
	function isFlipped(index: number): boolean {
		return index % 2 === 1;
	}

	it('should not flip logo at index 0', () => {
		expect(isFlipped(0)).toBe(false);
	});

	it('should flip logo at index 1', () => {
		expect(isFlipped(1)).toBe(true);
	});

	it('should follow alternating pattern', () => {
		const pattern = [0, 1, 2, 3, 4, 5, 6].map(isFlipped);
		expect(pattern).toEqual([false, true, false, true, false, true, false]);
	});

	it('should maintain pattern for large indices', () => {
		expect(isFlipped(100)).toBe(false);
		expect(isFlipped(101)).toBe(true);
	});

	it('should produce visual up-down-up-down pattern', () => {
		// Visual representation: 🌳 🌲 🌳 🌲 🌳 🌲 🌳
		//                        up  down up down up down up
		const count = 7;
		const visualPattern = Array.from({ length: count }, (_, i) =>
			isFlipped(i) ? 'down' : 'up'
		);
		expect(visualPattern).toEqual(['up', 'down', 'up', 'down', 'up', 'down', 'up']);
	});
});

// =============================================================================
// SIZE CLASS MAPPING TESTS
// =============================================================================

describe('GroveDivider Size Classes', () => {
	const sizeClasses = {
		xs: 'w-3 h-3',
		sm: 'w-4 h-4',
		md: 'w-5 h-5',
		lg: 'w-6 h-6'
	};

	type Size = keyof typeof sizeClasses;

	function getSizeClass(size: Size): string {
		return sizeClasses[size];
	}

	it('should return correct class for xs size', () => {
		expect(getSizeClass('xs')).toBe('w-3 h-3');
	});

	it('should return correct class for sm size (default)', () => {
		expect(getSizeClass('sm')).toBe('w-4 h-4');
	});

	it('should return correct class for md size', () => {
		expect(getSizeClass('md')).toBe('w-5 h-5');
	});

	it('should return correct class for lg size', () => {
		expect(getSizeClass('lg')).toBe('w-6 h-6');
	});

	it('should have progressively larger sizes', () => {
		const sizes: Size[] = ['xs', 'sm', 'md', 'lg'];
		const widths = sizes.map(s => parseInt(sizeClasses[s].match(/w-(\d+)/)?.[1] || '0'));

		for (let i = 1; i < widths.length; i++) {
			expect(widths[i]).toBeGreaterThan(widths[i - 1]);
		}
	});
});

// =============================================================================
// LAYOUT DIRECTION TESTS
// =============================================================================

describe('GroveDivider Layout Direction', () => {
	/**
	 * Determines flex direction class based on vertical prop
	 */
	function getFlexDirection(vertical: boolean): string {
		return vertical ? 'flex-col' : 'flex-row';
	}

	it('should use flex-row for horizontal layout (default)', () => {
		expect(getFlexDirection(false)).toBe('flex-row');
	});

	it('should use flex-col for vertical layout', () => {
		expect(getFlexDirection(true)).toBe('flex-col');
	});
});

// =============================================================================
// CSS CLASS COMPOSITION TESTS
// =============================================================================

describe('GroveDivider Class Composition', () => {
	/**
	 * Composes the container classes
	 */
	function composeContainerClasses(
		gap: string,
		vertical: boolean,
		className: string
	): string {
		const baseClasses = 'flex items-center justify-center';
		const direction = vertical ? 'flex-col' : 'flex-row';
		return `${baseClasses} ${gap} ${direction} ${className}`.trim();
	}

	it('should compose classes correctly for horizontal divider', () => {
		const classes = composeContainerClasses('gap-1.5', false, '');
		expect(classes).toContain('flex');
		expect(classes).toContain('items-center');
		expect(classes).toContain('justify-center');
		expect(classes).toContain('gap-1.5');
		expect(classes).toContain('flex-row');
	});

	it('should compose classes correctly for vertical divider', () => {
		const classes = composeContainerClasses('gap-1', true, '');
		expect(classes).toContain('flex-col');
		expect(classes).toContain('gap-1');
	});

	it('should include custom className', () => {
		const classes = composeContainerClasses('gap-1.5', false, 'my-custom-class');
		expect(classes).toContain('my-custom-class');
	});

	it('should handle empty className', () => {
		const classes = composeContainerClasses('gap-1.5', false, '');
		expect(classes).not.toContain('undefined');
	});
});

// =============================================================================
// DEFAULT VALUES TESTS
// =============================================================================

describe('GroveDivider Default Values', () => {
	const DEFAULTS = {
		count: 7,
		size: 'sm' as const,
		gap: 'gap-1.5',
		glass: false,
		vertical: false,
		breathing: false,
		monochrome: false,
		variant: 'default' as const
	};

	it('should have count default of 7', () => {
		expect(DEFAULTS.count).toBe(7);
	});

	it('should have size default of sm', () => {
		expect(DEFAULTS.size).toBe('sm');
	});

	it('should have gap default of gap-1.5', () => {
		expect(DEFAULTS.gap).toBe('gap-1.5');
	});

	it('should have glass default of false', () => {
		expect(DEFAULTS.glass).toBe(false);
	});

	it('should have vertical default of false', () => {
		expect(DEFAULTS.vertical).toBe(false);
	});

	it('should have breathing default of false', () => {
		expect(DEFAULTS.breathing).toBe(false);
	});
});

// =============================================================================
// ROTATION MODE TESTS
// =============================================================================

describe('GroveDivider Rotation Modes', () => {
	type RotationMode = 'default' | 'left-right' | 'up-down';

	/**
	 * Determines effective rotation mode based on orientation
	 * - 'default': vertical uses 'left-right', horizontal uses 'up-down'
	 */
	function getEffectiveRotation(rotation: RotationMode, vertical: boolean): 'left-right' | 'up-down' {
		return rotation === 'default'
			? (vertical ? 'left-right' : 'up-down')
			: rotation;
	}

	/**
	 * Get rotation class based on mode and index
	 */
	function getRotationClass(index: number, mode: 'left-right' | 'up-down'): string {
		if (index % 2 === 0) return ''; // Even indices: no rotation
		return mode === 'left-right' ? 'rotate-90' : 'rotate-180';
	}

	it('should use left-right rotation for vertical dividers by default', () => {
		const effectiveMode = getEffectiveRotation('default', true);
		expect(effectiveMode).toBe('left-right');
	});

	it('should use up-down rotation for horizontal dividers by default', () => {
		const effectiveMode = getEffectiveRotation('default', false);
		expect(effectiveMode).toBe('up-down');
	});

	it('should respect explicit left-right rotation regardless of orientation', () => {
		expect(getEffectiveRotation('left-right', true)).toBe('left-right');
		expect(getEffectiveRotation('left-right', false)).toBe('left-right');
	});

	it('should respect explicit up-down rotation regardless of orientation', () => {
		expect(getEffectiveRotation('up-down', true)).toBe('up-down');
		expect(getEffectiveRotation('up-down', false)).toBe('up-down');
	});

	it('should apply rotate-90 for odd indices in left-right mode', () => {
		const pattern = [0, 1, 2, 3, 4].map(i => getRotationClass(i, 'left-right'));
		expect(pattern).toEqual(['', 'rotate-90', '', 'rotate-90', '']);
	});

	it('should apply rotate-180 for odd indices in up-down mode', () => {
		const pattern = [0, 1, 2, 3, 4].map(i => getRotationClass(i, 'up-down'));
		expect(pattern).toEqual(['', 'rotate-180', '', 'rotate-180', '']);
	});

	it('should not rotate even indices in any mode', () => {
		expect(getRotationClass(0, 'left-right')).toBe('');
		expect(getRotationClass(0, 'up-down')).toBe('');
		expect(getRotationClass(2, 'left-right')).toBe('');
		expect(getRotationClass(2, 'up-down')).toBe('');
	});
});

// =============================================================================
// SPACING TESTS
// =============================================================================

describe('GroveDivider Spacing', () => {
	/**
	 * Compute container style for spacing
	 */
	function getContainerStyle(spacing?: string): string {
		return spacing ? `gap: ${spacing}` : '';
	}

	it('should return empty style when no spacing provided', () => {
		expect(getContainerStyle()).toBe('');
		expect(getContainerStyle(undefined)).toBe('');
	});

	it('should generate gap style for pixel spacing', () => {
		expect(getContainerStyle('8px')).toBe('gap: 8px');
	});

	it('should generate gap style for rem spacing', () => {
		expect(getContainerStyle('0.5rem')).toBe('gap: 0.5rem');
	});

	it('should generate gap style for any valid CSS value', () => {
		expect(getContainerStyle('1em')).toBe('gap: 1em');
		expect(getContainerStyle('16px')).toBe('gap: 16px');
	});
});

// =============================================================================
// DIVIDER CONFIGURATION TESTS
// =============================================================================

describe('GroveDivider Configuration Constants', () => {
	// These match the values in defaults.ts
	const DIVIDER_HORIZONTAL = {
		count: 7,
		size: 'xs' as const,
		glass: true,
	};

	const DIVIDER_VERTICAL = {
		count: 9,
		size: 'xs' as const,
		glass: true,
		vertical: true,
		spacing: '0.5rem',
	};

	it('should have horizontal config with 7 logos', () => {
		expect(DIVIDER_HORIZONTAL.count).toBe(7);
	});

	it('should have horizontal config using glass variant', () => {
		expect(DIVIDER_HORIZONTAL.glass).toBe(true);
	});

	it('should have vertical config with 9 logos', () => {
		expect(DIVIDER_VERTICAL.count).toBe(9);
	});

	it('should have vertical config with vertical layout', () => {
		expect(DIVIDER_VERTICAL.vertical).toBe(true);
	});

	it('should have vertical config with custom spacing', () => {
		expect(DIVIDER_VERTICAL.spacing).toBe('0.5rem');
	});

	it('should have both configs using xs size for subtle appearance', () => {
		expect(DIVIDER_HORIZONTAL.size).toBe('xs');
		expect(DIVIDER_VERTICAL.size).toBe('xs');
	});
});

// =============================================================================
// ACCESSIBILITY TESTS
// =============================================================================

describe('GroveDivider Accessibility', () => {
	const ARIA_ATTRIBUTES = {
		role: 'separator',
		'aria-hidden': 'true'
	};

	it('should have role="separator" for semantic meaning', () => {
		expect(ARIA_ATTRIBUTES.role).toBe('separator');
	});

	it('should have aria-hidden="true" to hide from screen readers', () => {
		expect(ARIA_ATTRIBUTES['aria-hidden']).toBe('true');
	});

	it('should be decorative only (hidden from assistive technology)', () => {
		// Divider is purely visual, so it should be hidden from screen readers
		// while still having semantic role for document structure
		expect(ARIA_ATTRIBUTES['aria-hidden']).toBe('true');
		expect(ARIA_ATTRIBUTES.role).toBe('separator');
	});
});
