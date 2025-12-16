/**
 * CN Utility Tests
 *
 * Tests for the Tailwind CSS class merging utility covering:
 * - Basic class merging
 * - Conditional classes
 * - Tailwind conflict resolution
 * - Array and object inputs
 */

import { describe, it, expect } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
	// ==========================================================================
	// Basic Merging
	// ==========================================================================

	describe('Basic Merging', () => {
		it('should merge multiple class strings', () => {
			expect(cn('foo', 'bar')).toBe('foo bar');
		});

		it('should handle single class', () => {
			expect(cn('foo')).toBe('foo');
		});

		it('should handle empty input', () => {
			expect(cn()).toBe('');
		});

		it('should handle undefined and null', () => {
			expect(cn('foo', undefined, 'bar', null)).toBe('foo bar');
		});

		it('should handle empty strings', () => {
			expect(cn('foo', '', 'bar')).toBe('foo bar');
		});
	});

	// ==========================================================================
	// Conditional Classes
	// ==========================================================================

	describe('Conditional Classes', () => {
		it('should include classes for truthy conditions', () => {
			expect(cn({ 'text-red': true, 'text-blue': false })).toBe('text-red');
		});

		it('should handle mixed string and object inputs', () => {
			expect(cn('base', { active: true, disabled: false })).toBe('base active');
		});

		it('should handle boolean expressions', () => {
			const isError = true;
			const isSuccess = false;
			expect(cn({ error: isError, success: isSuccess })).toBe('error');
		});

		it('should handle all false conditions', () => {
			expect(cn({ foo: false, bar: false })).toBe('');
		});
	});

	// ==========================================================================
	// Array Inputs
	// ==========================================================================

	describe('Array Inputs', () => {
		it('should flatten arrays', () => {
			expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz');
		});

		it('should handle nested arrays', () => {
			expect(cn(['foo', ['bar', 'baz']])).toBe('foo bar baz');
		});

		it('should handle arrays with conditionals', () => {
			expect(cn(['base', { active: true }])).toBe('base active');
		});
	});

	// ==========================================================================
	// Tailwind Class Conflict Resolution
	// ==========================================================================

	describe('Tailwind Conflict Resolution', () => {
		it('should resolve padding conflicts', () => {
			expect(cn('px-2', 'px-4')).toBe('px-4');
		});

		it('should resolve margin conflicts', () => {
			expect(cn('mt-2', 'mt-4')).toBe('mt-4');
		});

		it('should resolve text color conflicts', () => {
			expect(cn('text-blue-500', 'text-red-500')).toBe('text-red-500');
		});

		it('should resolve background color conflicts', () => {
			expect(cn('bg-white', 'bg-gray-100')).toBe('bg-gray-100');
		});

		it('should keep non-conflicting classes', () => {
			expect(cn('px-2', 'py-2', 'px-4')).toBe('py-2 px-4');
		});

		it('should resolve font-size conflicts', () => {
			expect(cn('text-sm', 'text-lg')).toBe('text-lg');
		});

		it('should resolve display conflicts', () => {
			expect(cn('flex', 'block')).toBe('block');
		});

		it('should resolve border-radius conflicts', () => {
			expect(cn('rounded', 'rounded-lg')).toBe('rounded-lg');
		});
	});

	// ==========================================================================
	// Complex Scenarios
	// ==========================================================================

	describe('Complex Scenarios', () => {
		it('should handle component-like patterns', () => {
			const baseClasses = 'px-4 py-2 rounded-md font-medium';
			const variantClasses = 'bg-blue-500 text-white';
			const userClasses = 'bg-red-500 px-6';

			// User classes should override base/variant where they conflict
			const result = cn(baseClasses, variantClasses, userClasses);

			expect(result).toContain('py-2');
			expect(result).toContain('rounded-md');
			expect(result).toContain('font-medium');
			expect(result).toContain('text-white');
			expect(result).toContain('bg-red-500');
			expect(result).toContain('px-6');
			// Should NOT contain overridden classes
			expect(result).not.toContain('bg-blue-500');
			expect(result).not.toContain('px-4');
		});

		it('should handle hover and focus states', () => {
			expect(cn('hover:bg-gray-100', 'hover:bg-gray-200')).toBe('hover:bg-gray-200');
		});

		it('should handle responsive prefixes', () => {
			expect(cn('md:px-4', 'md:px-6')).toBe('md:px-6');
		});

		it('should keep different responsive breakpoints', () => {
			expect(cn('px-2', 'md:px-4', 'lg:px-6')).toBe('px-2 md:px-4 lg:px-6');
		});

		it('should handle dark mode classes', () => {
			expect(cn('dark:bg-gray-800', 'dark:bg-gray-900')).toBe('dark:bg-gray-900');
		});

		it('should handle mixed modifiers', () => {
			expect(
				cn('bg-white', 'hover:bg-gray-100', 'dark:bg-gray-800', 'dark:hover:bg-gray-700')
			).toBe('bg-white hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700');
		});
	});

	// ==========================================================================
	// Edge Cases
	// ==========================================================================

	describe('Edge Cases', () => {
		it('should handle whitespace in strings', () => {
			expect(cn('  foo  ', 'bar  ')).toBe('foo bar');
		});

		it('should handle arbitrary values', () => {
			expect(cn('w-[100px]', 'w-[200px]')).toBe('w-[200px]');
		});

		it('should handle negative values', () => {
			expect(cn('-mt-2', '-mt-4')).toBe('-mt-4');
		});

		it('should handle opacity modifiers', () => {
			expect(cn('bg-black/50', 'bg-black/75')).toBe('bg-black/75');
		});

		it('should preserve custom classes', () => {
			expect(cn('my-custom-class', 'another-custom')).toBe(
				'my-custom-class another-custom'
			);
		});

		it('should handle important modifier', () => {
			expect(cn('!mt-0', 'mt-4')).toBe('!mt-0 mt-4');
		});
	});
});
