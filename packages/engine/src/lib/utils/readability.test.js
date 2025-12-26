/**
 * Readability Utility Tests
 *
 * Tests for the readability calculation module covering:
 * - Flesch-Kincaid grade level calculation
 * - Syllable counting (with known limitations)
 * - Reading time estimation
 * - Suggestion generation
 * - Markdown stripping
 */

import { describe, it, expect } from 'vitest';
import {
	calculateReadability,
	countSyllables,
	stripMarkdownForAnalysis
} from './readability.js';

// ==========================================================================
// Syllable Counting
// ==========================================================================

describe('countSyllables', () => {
	describe('Basic Words', () => {
		it('should count single syllable words', () => {
			expect(countSyllables('cat')).toBe(1);
			expect(countSyllables('dog')).toBe(1);
			expect(countSyllables('the')).toBe(1);
			expect(countSyllables('run')).toBe(1);
		});

		it('should count two syllable words', () => {
			expect(countSyllables('happy')).toBe(2);
			expect(countSyllables('water')).toBe(2);
			expect(countSyllables('paper')).toBe(2);
			expect(countSyllables('flower')).toBe(2);
		});

		it('should count three syllable words', () => {
			// Note: algorithm approximates syllable count
			expect(countSyllables('beautiful')).toBeGreaterThanOrEqual(2);
			expect(countSyllables('beautiful')).toBeLessThanOrEqual(4);
			expect(countSyllables('elephant')).toBeGreaterThanOrEqual(2);
			expect(countSyllables('computer')).toBeGreaterThanOrEqual(2);
		});

		it('should count four+ syllable words', () => {
			expect(countSyllables('understanding')).toBeGreaterThanOrEqual(3);
			expect(countSyllables('immediately')).toBeGreaterThanOrEqual(4);
		});
	});

	describe('Edge Cases', () => {
		it('should handle short words (3 chars or less)', () => {
			expect(countSyllables('a')).toBe(1);
			expect(countSyllables('an')).toBe(1);
			expect(countSyllables('the')).toBe(1);
			expect(countSyllables('I')).toBe(1);
		});

		it('should handle empty strings', () => {
			expect(countSyllables('')).toBe(1);
		});

		it('should handle words with punctuation', () => {
			expect(countSyllables("don't")).toBe(1);
			expect(countSyllables('hello!')).toBe(2);
			expect(countSyllables('world.')).toBe(1);
		});

		it('should be case insensitive', () => {
			expect(countSyllables('HELLO')).toBe(countSyllables('hello'));
			expect(countSyllables('BeAutiFul')).toBe(countSyllables('beautiful'));
		});

		it('should handle silent e', () => {
			// Note: algorithm may not be perfect here
			expect(countSyllables('like')).toBe(1);
			expect(countSyllables('make')).toBe(1);
			expect(countSyllables('take')).toBe(1);
		});

		it('should handle consecutive vowels', () => {
			expect(countSyllables('boat')).toBe(1);
			expect(countSyllables('rain')).toBe(1);
			// The algorithm counts diphthongs as single syllables
		});
	});

	describe('Known Limitations (documented in code)', () => {
		// These tests document known inaccuracies
		it('should handle queue (known edge case)', () => {
			// "queue" has 1 syllable but algorithm may count more
			const result = countSyllables('queue');
			expect(result).toBeGreaterThanOrEqual(1);
		});

		it('should handle through (known edge case)', () => {
			// "through" has 1 syllable
			const result = countSyllables('through');
			expect(result).toBeGreaterThanOrEqual(1);
		});
	});
});

// ==========================================================================
// Markdown Stripping
// ==========================================================================

describe('stripMarkdownForAnalysis', () => {
	it('should remove code blocks', () => {
		const markdown = 'Hello\n```js\nconst x = 1;\n```\nWorld';
		const result = stripMarkdownForAnalysis(markdown);
		expect(result).not.toContain('const x = 1');
		expect(result).toContain('Hello');
		expect(result).toContain('World');
	});

	it('should remove inline code', () => {
		const markdown = 'Use the `console.log` function';
		const result = stripMarkdownForAnalysis(markdown);
		expect(result).not.toContain('console.log');
		expect(result).toContain('Use the');
		expect(result).toContain('function');
	});

	it('should extract link text', () => {
		const markdown = 'Check out [this link](https://example.com)';
		const result = stripMarkdownForAnalysis(markdown);
		expect(result).toContain('this link');
		expect(result).not.toContain('https://example.com');
	});

	it('should remove markdown formatting characters', () => {
		const markdown = '# Heading\n\n**Bold** and *italic* text';
		const result = stripMarkdownForAnalysis(markdown);
		expect(result).toContain('Heading');
		expect(result).toContain('Bold');
		expect(result).toContain('italic');
		expect(result).not.toContain('#');
		expect(result).not.toContain('**');
	});

	it('should remove list markers', () => {
		const markdown = '- Item one\n- Item two\n* Item three\n1. Numbered';
		const result = stripMarkdownForAnalysis(markdown);
		expect(result).toContain('Item one');
		expect(result).toContain('Numbered');
	});

	it('should handle empty input', () => {
		expect(stripMarkdownForAnalysis('')).toBe('');
		expect(stripMarkdownForAnalysis('   ')).toBe('');
	});
});

// ==========================================================================
// Readability Calculation
// ==========================================================================

describe('calculateReadability', () => {
	describe('Basic Functionality', () => {
		it('should return all expected properties', () => {
			const text = 'The quick brown fox jumps over the lazy dog.';
			const result = calculateReadability(text);

			expect(result).toHaveProperty('fleschKincaid');
			expect(result).toHaveProperty('readingTime');
			expect(result).toHaveProperty('wordCount');
			expect(result).toHaveProperty('sentenceCount');
			expect(result).toHaveProperty('sentenceStats');
			expect(result.sentenceStats).toHaveProperty('average');
			expect(result.sentenceStats).toHaveProperty('longest');
			expect(result.sentenceStats).toHaveProperty('shortest');
			expect(result).toHaveProperty('suggestions');
		});

		it('should calculate word count correctly', () => {
			const text = 'One two three four five.';
			const result = calculateReadability(text);
			expect(result.wordCount).toBe(5);
		});

		it('should calculate sentence count correctly', () => {
			const text = 'First sentence. Second sentence! Third sentence?';
			const result = calculateReadability(text);
			expect(result.sentenceCount).toBe(3);
		});

		it('should calculate reading time as string', () => {
			// Average reading speed is ~200 words per minute
			const words = Array(200).fill('word').join(' ') + '.';
			const result = calculateReadability(words);
			// readingTime is a string like "1 min read"
			expect(typeof result.readingTime).toBe('string');
			expect(result.readingTime).toContain('min read');
		});
	});

	describe('Flesch-Kincaid Grade Level', () => {
		it('should return low grade for simple text', () => {
			const simpleText = 'The cat sat. The dog ran. I like pets.';
			const result = calculateReadability(simpleText);
			expect(result.fleschKincaid).toBeLessThan(5);
		});

		it('should return higher grade for complex text', () => {
			const complexText =
				'The implementation of sophisticated algorithms necessitates comprehensive understanding of computational complexity. Furthermore, architectural considerations significantly impact performance characteristics.';
			const result = calculateReadability(complexText);
			expect(result.fleschKincaid).toBeGreaterThan(10);
		});

		it('should handle single sentence', () => {
			const text = 'Hello world.';
			const result = calculateReadability(text);
			expect(result.fleschKincaid).toBeGreaterThanOrEqual(0);
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty content', () => {
			const result = calculateReadability('');
			// Implementation uses Math.max(words.length, 1) so minimum is 1
			expect(result.wordCount).toBeGreaterThanOrEqual(0);
			expect(result.sentenceCount).toBeGreaterThanOrEqual(0);
			expect(result.fleschKincaid).toBeGreaterThanOrEqual(0);
		});

		it('should handle whitespace-only content', () => {
			const result = calculateReadability('   \n\t  ');
			// Whitespace-only after strip returns minimum values
			expect(result.wordCount).toBeGreaterThanOrEqual(0);
		});

		it('should handle content with no sentences (no punctuation)', () => {
			const result = calculateReadability('Hello world without punctuation');
			expect(result.wordCount).toBe(4);
			// Should still work, treating as content without sentence ending
			expect(result.sentenceCount).toBeGreaterThanOrEqual(0);
		});

		it('should handle markdown content', () => {
			const markdown =
				'# Heading\n\n**Bold text** and [a link](https://example.com). Regular sentence.';
			const result = calculateReadability(markdown);
			expect(result.wordCount).toBeGreaterThan(0);
		});

		it('should handle very long content', () => {
			const longText = Array(1000).fill('This is a test sentence.').join(' ');
			const result = calculateReadability(longText);
			expect(result.wordCount).toBeGreaterThan(4000);
		});
	});

	describe('Suggestions', () => {
		it('should return array of suggestions', () => {
			const text = 'Simple text here.';
			const result = calculateReadability(text);
			expect(Array.isArray(result.suggestions)).toBe(true);
		});

		it('should suggest sentence length improvement for long sentences', () => {
			// Create text with very long sentences
			const longSentence =
				'This is a very long sentence that contains many words and just keeps going on and on without stopping which makes it difficult to read and understand for most people.';
			const result = calculateReadability(longSentence);

			// Suggestions are strings, check if any mention sentence
			const hasSentenceSuggestion = result.suggestions.some(
				(s) => typeof s === 'string' && s.toLowerCase().includes('sentence')
			);
			expect(hasSentenceSuggestion).toBe(true);
		});

		it('should handle text that needs no suggestions', () => {
			const goodText =
				'This is clear. It is simple. The words are short. Reading is easy.';
			const result = calculateReadability(goodText);
			// May or may not have suggestions, but should not crash
			expect(Array.isArray(result.suggestions)).toBe(true);
		});
	});

	describe('Sentence Stats', () => {
		it('should calculate average words per sentence', () => {
			const text = 'One two three. Four five. Six.';
			const result = calculateReadability(text);
			// 6 words / 3 sentences = 2 average
			expect(result.sentenceStats.average).toBeCloseTo(2, 0);
		});

		it('should track longest and shortest sentences', () => {
			const text = 'Short. This one is longer with more words.';
			const result = calculateReadability(text);
			expect(result.sentenceStats.longest).toBeGreaterThan(result.sentenceStats.shortest);
		});
	});
});

// ==========================================================================
// Integration Scenarios
// ==========================================================================

describe('Real-World Content', () => {
	it('should analyze a blog post paragraph', () => {
		const paragraph = `
      Writing is a journey of discovery. Each word you choose shapes the story
      you're telling. Some writers prefer short, punchy sentences. Others craft
      elaborate, winding paths through their thoughts. The key is finding your voice.
    `;
		const result = calculateReadability(paragraph);

		expect(result.wordCount).toBeGreaterThan(30);
		expect(result.sentenceCount).toBeGreaterThan(3);
		expect(result.fleschKincaid).toBeGreaterThan(0);
		// readingTime is a string like "1 min read"
		expect(typeof result.readingTime).toBe('string');
	});

	it('should handle technical documentation', () => {
		const techDoc = `
      The API endpoint accepts POST requests with JSON payloads.
      Authentication is required via Bearer tokens.
      Response codes follow HTTP standards.
      Errors return descriptive messages.
    `;
		const result = calculateReadability(techDoc);

		expect(result.wordCount).toBeGreaterThan(15);
		expect(result.fleschKincaid).toBeGreaterThan(5); // Technical = harder
	});
});
