/**
 * Offensive Blocklist Tests
 *
 * Tests for Loam offensive content detection covering:
 * - Exact match detection
 * - Substring matching for dangerous terms
 * - Leetspeak variant detection
 * - Review-required terms
 *
 * Note: These tests use sanitized examples to avoid spreading actual slurs.
 *
 * @see docs/specs/loam-spec.md
 */

import { describe, it, expect } from 'vitest';
import {
	containsOffensiveContent,
	requiresReview,
	OFFENSIVE_TERMS,
	OFFENSIVE_SET,
	REQUIRES_REVIEW
} from './offensive-blocklist';

// =============================================================================
// Data Structure Tests
// =============================================================================

describe('Data Structures', () => {
	it('should have OFFENSIVE_TERMS populated', () => {
		expect(OFFENSIVE_TERMS.length).toBeGreaterThan(100);
	});

	it('should have OFFENSIVE_SET with same count as unique terms', () => {
		// Set removes duplicates that might occur from leetspeak generation
		expect(OFFENSIVE_SET.size).toBeLessThanOrEqual(OFFENSIVE_TERMS.length);
		expect(OFFENSIVE_SET.size).toBeGreaterThan(100);
	});

	it('should have REQUIRES_REVIEW populated', () => {
		expect(REQUIRES_REVIEW.length).toBeGreaterThan(0);
		expect(REQUIRES_REVIEW).toContain('queer');
		expect(REQUIRES_REVIEW).toContain('dyke');
	});
});

// =============================================================================
// containsOffensiveContent - Exact Matches
// =============================================================================

describe('containsOffensiveContent - Exact Matches', () => {
	it('should detect known offensive terms', () => {
		// Using terms that are unambiguously offensive
		expect(containsOffensiveContent('nazi')).toBe(true);
		expect(containsOffensiveContent('kkk')).toBe(true);
	});

	it('should be case-insensitive', () => {
		expect(containsOffensiveContent('NAZI')).toBe(true);
		expect(containsOffensiveContent('Nazi')).toBe(true);
		expect(containsOffensiveContent('NaZi')).toBe(true);
	});

	it('should handle hyphens in terms', () => {
		expect(containsOffensiveContent('neo-nazi')).toBe(true);
		expect(containsOffensiveContent('neonazi')).toBe(true);
	});
});

// =============================================================================
// containsOffensiveContent - Substring Matching
// =============================================================================

describe('containsOffensiveContent - Substring Matching', () => {
	it('should detect hate group terms as substrings', () => {
		expect(containsOffensiveContent('naziuser')).toBe(true);
		expect(containsOffensiveContent('usernaziname')).toBe(true);
		expect(containsOffensiveContent('my-nazi-blog')).toBe(true);
	});

	it('should detect violence terms as substrings', () => {
		expect(containsOffensiveContent('killallhumans')).toBe(true);
		expect(containsOffensiveContent('user-genocide-2024')).toBe(true);
	});

	it('should detect severe slurs as substrings', () => {
		// Tests that severe slurs embedded in usernames are caught
		expect(containsOffensiveContent('user-retarded-name')).toBe(true);
	});
});

// =============================================================================
// containsOffensiveContent - Word Boundary Checking
// =============================================================================

describe('containsOffensiveContent - Word Boundary Checking', () => {
	it('should NOT flag legitimate words containing boundary-checked terms', () => {
		// "retardant" contains "retard" but is a legitimate word
		expect(containsOffensiveContent('fire-retardant')).toBe(false);
		expect(containsOffensiveContent('fireretardant')).toBe(false);
		expect(containsOffensiveContent('flameretardant')).toBe(false);
	});

	it('should flag offensive terms with word boundaries', () => {
		// "retard" as standalone or with numbers should be caught
		expect(containsOffensiveContent('retard')).toBe(true);
		expect(containsOffensiveContent('retard123')).toBe(true);
		expect(containsOffensiveContent('123retard')).toBe(true);
	});

	it('should catch terms at word boundaries', () => {
		// Numbers don't count as letters, so these should be caught
		expect(containsOffensiveContent('my-pedo-blog')).toBe(true);
		expect(containsOffensiveContent('pedo42')).toBe(true);
	});

	it('should NOT flag pedometer (legitimate word)', () => {
		// "pedometer" contains "pedo" but is a legitimate word (step counter)
		expect(containsOffensiveContent('pedometer')).toBe(false);
		expect(containsOffensiveContent('mypedometer')).toBe(false);
	});
});

// =============================================================================
// containsOffensiveContent - Leetspeak Variants
// =============================================================================

describe('containsOffensiveContent - Leetspeak Variants', () => {
	it('should detect leetspeak variants', () => {
		expect(containsOffensiveContent('n4zi')).toBe(true);
		expect(containsOffensiveContent('n4zis')).toBe(true);
	});

	it('should detect number-substituted variants', () => {
		// Various numeric substitutions
		expect(containsOffensiveContent('n30nazi')).toBe(true);
	});
});

// =============================================================================
// containsOffensiveContent - Valid Usernames
// =============================================================================

describe('containsOffensiveContent - Valid Usernames', () => {
	it('should allow normal usernames', () => {
		expect(containsOffensiveContent('autumn-writes')).toBe(false);
		expect(containsOffensiveContent('coolblogger')).toBe(false);
		expect(containsOffensiveContent('my-garden')).toBe(false);
		expect(containsOffensiveContent('coffee-lover')).toBe(false);
	});

	it('should allow usernames with numbers', () => {
		expect(containsOffensiveContent('user123')).toBe(false);
		expect(containsOffensiveContent('blog2024')).toBe(false);
		expect(containsOffensiveContent('my-blog-42')).toBe(false);
	});

	it('should not have false positives for common words', () => {
		// These might contain letter sequences that could false-positive
		expect(containsOffensiveContent('assistant')).toBe(false);
		expect(containsOffensiveContent('classic')).toBe(false);
		expect(containsOffensiveContent('analysis')).toBe(false);
		expect(containsOffensiveContent('expressions')).toBe(false);
	});

	it('should allow short usernames', () => {
		expect(containsOffensiveContent('abc')).toBe(false);
		expect(containsOffensiveContent('xyz')).toBe(false);
		expect(containsOffensiveContent('cat')).toBe(false);
		expect(containsOffensiveContent('dog')).toBe(false);
	});
});

// =============================================================================
// requiresReview
// =============================================================================

describe('requiresReview', () => {
	it('should flag reclaimed identity terms for review', () => {
		expect(requiresReview('queer')).toBe(true);
		expect(requiresReview('dyke')).toBe(true);
		expect(requiresReview('femme')).toBe(true);
		expect(requiresReview('butch')).toBe(true);
	});

	it('should flag terms containing reclaimed words', () => {
		expect(requiresReview('queerwriter')).toBe(true);
		expect(requiresReview('prouddyke')).toBe(true);
	});

	it('should be case-insensitive', () => {
		expect(requiresReview('QUEER')).toBe(true);
		expect(requiresReview('Queer')).toBe(true);
	});

	it('should not flag normal usernames', () => {
		expect(requiresReview('autumn')).toBe(false);
		expect(requiresReview('coolblogger')).toBe(false);
		expect(requiresReview('my-garden')).toBe(false);
	});
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge Cases', () => {
	it('should handle empty strings', () => {
		expect(containsOffensiveContent('')).toBe(false);
		expect(requiresReview('')).toBe(false);
	});

	it('should handle very long usernames', () => {
		const longUsername = 'a'.repeat(100);
		expect(containsOffensiveContent(longUsername)).toBe(false);
	});

	it('should handle whitespace', () => {
		expect(containsOffensiveContent('  ')).toBe(false);
		expect(containsOffensiveContent('\t\n')).toBe(false);
	});

	it('should handle special characters', () => {
		expect(containsOffensiveContent('user@name')).toBe(false);
		expect(containsOffensiveContent('user_name')).toBe(false);
	});
});

// =============================================================================
// Performance Tests
// =============================================================================

describe('Performance', () => {
	it('should be fast for multiple lookups', () => {
		const usernames = [
			'autumn-writes',
			'coolblogger',
			'nazi-bad', // offensive
			'my-garden',
			'coffee-lover',
			'valid-user',
			'normal-blog',
			'another-valid'
		];

		const start = performance.now();
		for (let i = 0; i < 1000; i++) {
			for (const username of usernames) {
				containsOffensiveContent(username);
			}
		}
		const duration = performance.now() - start;

		// Should complete 8000 lookups in under 200ms
		// (substring matching is slower than exact match)
		expect(duration).toBeLessThan(200);
	});
});

// =============================================================================
// Category Coverage Tests
// =============================================================================

describe('Category Coverage', () => {
	it('should include terms from all categories', () => {
		// Verify that terms from each category are present
		// Using generic examples that don't propagate specific slurs

		// Hate groups
		expect(OFFENSIVE_SET.has('nazi')).toBe(true);
		expect(OFFENSIVE_SET.has('kkk')).toBe(true);

		// Violence terms
		expect(OFFENSIVE_SET.has('genocide')).toBe(true);
		expect(OFFENSIVE_SET.has('massacre')).toBe(true);

		// Exploitation
		expect(OFFENSIVE_SET.has('pedo')).toBe(true);

		// Self-harm
		expect(OFFENSIVE_SET.has('proana')).toBe(true);

		// Incel terminology
		expect(OFFENSIVE_SET.has('incel')).toBe(true);
	});
});
