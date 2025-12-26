/**
 * Readability Analysis - Local Calculations
 *
 * Readability scoring using Flesch-Kincaid and other metrics.
 * No AI needed - purely algorithmic analysis.
 *
 * @see docs/specs/writing-assistant-unified-spec.md
 */

/**
 * @typedef {Object} ReadabilityResult
 * @property {number} fleschKincaid - Grade level (e.g., 8.5)
 * @property {string} readingTime - Human-readable time (e.g., "5 min read")
 * @property {number} wordCount - Total words
 * @property {number} sentenceCount - Total sentences
 * @property {Object} sentenceStats - Sentence statistics
 * @property {number} sentenceStats.average - Average words per sentence
 * @property {number} sentenceStats.longest - Longest sentence word count
 * @property {number} sentenceStats.shortest - Shortest sentence word count
 * @property {string[]} suggestions - Improvement suggestions
 */

/**
 * Calculate readability metrics for content
 *
 * @param {string} content - The text to analyze (can include markdown)
 * @returns {ReadabilityResult}
 */
export function calculateReadability(content) {
	// Strip markdown syntax for clean text analysis
	const text = stripMarkdownForAnalysis(content);

	const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
	const words = text.split(/\s+/).filter((w) => w.length > 0);
	const syllables = words.reduce((sum, word) => sum + countSyllables(word), 0);

	const sentenceCount = Math.max(sentences.length, 1);
	const wordCount = Math.max(words.length, 1);

	const wordsPerSentence = wordCount / sentenceCount;
	const syllablesPerWord = syllables / wordCount;

	// Flesch-Kincaid Grade Level
	const fleschKincaid = Math.max(
		0,
		0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59
	);

	// Reading time (~200 words per minute for focused reading)
	const minutes = Math.ceil(wordCount / 200);

	// Sentence length stats
	const sentenceLengths = sentences.map(
		(s) => s.split(/\s+/).filter((w) => w.length > 0).length
	);

	return {
		fleschKincaid: Math.round(fleschKincaid * 10) / 10,
		readingTime: `${minutes} min read`,
		wordCount,
		sentenceCount,
		sentenceStats: {
			average: Math.round(wordsPerSentence),
			longest: sentenceLengths.length > 0 ? Math.max(...sentenceLengths) : 0,
			shortest: sentenceLengths.length > 0 ? Math.min(...sentenceLengths) : 0
		},
		suggestions: generateSuggestions(fleschKincaid, wordsPerSentence, sentenceLengths)
	};
}

/**
 * Strip markdown syntax for cleaner readability analysis
 *
 * @param {string} content - Markdown content
 * @returns {string} Plain text
 */
export function stripMarkdownForAnalysis(content) {
	return content
		.replace(/```[\s\S]*?```/g, '') // Remove code blocks
		.replace(/`[^`]+`/g, '') // Remove inline code
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Replace links with text
		.replace(/[#*_~>]/g, '') // Remove markdown chars
		.replace(/^\s*[-+*]\s+/gm, '') // Remove list markers
		.replace(/^\s*\d+\.\s+/gm, '') // Remove numbered list markers
		.trim();
}

/**
 * Count syllables in a word (approximate)
 *
 * NOTE: This is a regex-based approximation that works reasonably well for
 * common English words but will be inaccurate for:
 * - Words with silent vowels (e.g., "subtle", "queue")
 * - Compound words and contractions
 * - Words borrowed from other languages
 * - Proper nouns and technical terms
 *
 * For readability scoring purposes, this approximation is sufficient since
 * Flesch-Kincaid is already an estimate and small syllable miscounts don't
 * significantly impact the final grade level calculation.
 *
 * @param {string} word - The word to count syllables for
 * @returns {number} Estimated syllable count
 */
export function countSyllables(word) {
	word = word.toLowerCase().replace(/[^a-z]/g, '');
	if (word.length <= 3) return 1;

	word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
	word = word.replace(/^y/, '');

	const matches = word.match(/[aeiouy]{1,2}/g);
	return matches ? Math.max(matches.length, 1) : 1;
}

/**
 * Generate readability improvement suggestions
 *
 * @param {number} grade - Flesch-Kincaid grade level
 * @param {number} avgSentence - Average words per sentence
 * @param {number[]} sentenceLengths - Array of sentence lengths
 * @returns {string[]} Suggestions (max 4)
 */
function generateSuggestions(grade, avgSentence, sentenceLengths) {
	const suggestions = [];

	// Grade level suggestions
	if (grade > 14) {
		suggestions.push(
			'Your writing is quite complex. Consider simplifying for broader accessibility.'
		);
	} else if (grade > 12) {
		suggestions.push(
			'College-level reading. Consider if this matches your audience.'
		);
	}

	// Sentence length suggestions
	if (avgSentence > 30) {
		suggestions.push(
			'Many sentences are quite long. Breaking them up could improve clarity.'
		);
	} else if (avgSentence > 25) {
		suggestions.push(
			'Some sentences are on the longer side. Variety in length can improve flow.'
		);
	}

	// Very long sentences
	const veryLong = sentenceLengths.filter((l) => l > 40);
	if (veryLong.length > 0) {
		suggestions.push(
			`Found ${veryLong.length} sentence${veryLong.length > 1 ? 's' : ''} over 40 words.`
		);
	}

	// Very simple
	if (grade < 6 && avgSentence < 10) {
		suggestions.push(
			'Very simple sentences. This works well for accessibility or quick reads.'
		);
	}

	// Sentence variety
	if (sentenceLengths.length > 5) {
		const variance = calculateVariance(sentenceLengths);
		if (variance < 10) {
			suggestions.push(
				'Sentence lengths are very uniform. Varying rhythm can make writing more engaging.'
			);
		}
	}

	return suggestions.slice(0, 4); // Max 4 suggestions
}

/**
 * Calculate variance for sentence length variety
 *
 * @param {number[]} numbers - Array of numbers
 * @returns {number} Variance
 */
function calculateVariance(numbers) {
	if (numbers.length === 0) return 0;
	const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
	return (
		numbers.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / numbers.length
	);
}

/**
 * Get a human-readable description of the grade level
 *
 * @param {number} grade - Flesch-Kincaid grade level
 * @returns {string} Description
 */
export function getGradeDescription(grade) {
	if (grade <= 5) return 'Elementary school level - very easy to read';
	if (grade <= 8) return 'Middle school level - easy to read';
	if (grade <= 10) return 'High school level - fairly easy to read';
	if (grade <= 12) return 'High school senior level - moderately difficult';
	if (grade <= 14) return 'College level - difficult';
	return 'Graduate level - very difficult';
}
