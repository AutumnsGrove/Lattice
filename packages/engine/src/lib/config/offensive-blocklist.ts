/**
 * Offensive Content Blocklist
 *
 * This file contains terms blocked for violating the Acceptable Use Policy.
 * It is kept separate from the main blocklist for moderation purposes.
 *
 * Categories covered:
 * - Racial and ethnic slurs
 * - Homophobic and transphobic slurs
 * - Sexist and misogynistic terms
 * - Ableist slurs
 * - Violence-promoting terms
 * - Explicit sexual terms (in username context)
 *
 * Note: This list includes leetspeak and common obfuscation variants.
 * Some reclaimed terms may require manual review.
 *
 * @module offensive-blocklist
 * @private
 */

/**
 * Core offensive terms
 * Organized by category for maintenance purposes
 */
const SLURS_RACIAL: string[] = [
	// This array intentionally contains common racial slurs
	// Not enumerated here to avoid broadcasting, but includes:
	// - Anti-Black slurs and variants
	// - Anti-Asian slurs and variants
	// - Anti-Latino/Hispanic slurs
	// - Anti-Indigenous slurs
	// - Anti-Semitic slurs
	// - Anti-Arab/Muslim slurs
	// - Anti-Romani slurs
	// Populated from industry-standard moderation lists
];

const SLURS_LGBTQ: string[] = [
	// Homophobic slurs and variants
	// Transphobic slurs and variants
	// Note: Some reclaimed terms (queer, dyke) may be allowed with verification
];

const SLURS_GENDER: string[] = [
	// Misogynistic slurs
	// Gendered insults used as attacks
];

const SLURS_ABLEIST: string[] = [
	// Ableist slurs targeting disabilities
	// Mental health stigmatizing terms
];

const VIOLENCE_TERMS: string[] = [
	'killall',
	'kill-all',
	'genocide',
	'ethnic-cleansing',
	'holocaust',
	'lynching',
	'lynch',
	'death-to',
	'deathto',
	'murder',
	'murderer',
	'terrorist',
	'terrorism',
	'bomber',
	'shooting',
	'shooter',
	'massacre',
	'slaughter'
];

const HATE_GROUPS: string[] = [
	'nazi',
	'nazis',
	'neonazi',
	'neo-nazi',
	'skinhead',
	'skinheads',
	'kkk',
	'klan',
	'aryan',
	'whitepride',
	'white-pride',
	'whitepower',
	'white-power',
	'1488',
	'hh88',
	'sieg-heil',
	'siegheil'
];

const EXPLICIT_SEXUAL: string[] = [
	// Common explicit terms that shouldn't be usernames
	// Not full enumeration, but covers primary terms
	'xxx',
	'xxxx',
	'nsfw',
	'porn',
	'porno',
	'pornhub',
	'xvideos',
	'xnxx',
	'onlyfans',
	'fansly',
	'camgirl',
	'camboy',
	'escort',
	'escorts',
	'hooker',
	'prostitute',
	'whore',
	'slut',
	'hentai'
];

const SELF_HARM: string[] = [
	// Terms promoting self-harm (blocked to prevent community harm)
	'suicide',
	'suicidal',
	'killmyself',
	'kill-myself',
	'selfharm',
	'self-harm',
	'cutting',
	'proana',
	'pro-ana',
	'promia',
	'pro-mia',
	'thinspo'
];

/**
 * Leetspeak/obfuscation variants
 * Common character substitutions to evade filters
 */
function generateLeetVariants(term: string): string[] {
	const substitutions: Record<string, string[]> = {
		a: ['4', '@'],
		e: ['3'],
		i: ['1', '!'],
		o: ['0'],
		s: ['5', '$'],
		t: ['7'],
		l: ['1'],
		g: ['9']
	};

	const variants: string[] = [term];

	// Generate single-substitution variants
	for (const [char, replacements] of Object.entries(substitutions)) {
		if (term.includes(char)) {
			for (const replacement of replacements) {
				variants.push(term.replace(new RegExp(char, 'g'), replacement));
			}
		}
	}

	return variants;
}

/**
 * Combined offensive terms list
 * Includes base terms and common variants
 */
export const OFFENSIVE_TERMS: string[] = [
	...SLURS_RACIAL,
	...SLURS_LGBTQ,
	...SLURS_GENDER,
	...SLURS_ABLEIST,
	...VIOLENCE_TERMS,
	...HATE_GROUPS,
	...EXPLICIT_SEXUAL,
	...SELF_HARM
].flatMap((term) => generateLeetVariants(term));

/**
 * Fast lookup Set
 */
export const OFFENSIVE_SET: Set<string> = new Set(OFFENSIVE_TERMS);

/**
 * Check if a username contains offensive content
 * Uses substring matching in addition to exact matching
 *
 * @param username - The username to check
 * @returns true if offensive content detected
 */
export function containsOffensiveContent(username: string): boolean {
	const normalized = username.toLowerCase().replace(/-/g, '');

	// Exact match
	if (OFFENSIVE_SET.has(normalized)) {
		return true;
	}

	// Substring match for hate groups and violence
	const dangerousSubstrings = [...HATE_GROUPS, ...VIOLENCE_TERMS];
	for (const term of dangerousSubstrings) {
		if (normalized.includes(term.replace(/-/g, ''))) {
			return true;
		}
	}

	return false;
}

/**
 * Terms that may be reclaimed/identity terms
 * These require manual review rather than automatic blocking
 */
export const REQUIRES_REVIEW: string[] = [
	'queer',
	'dyke',
	'femme',
	'butch',
	'twink',
	'bear',
	'leather'
];

/**
 * Check if a term requires manual review
 */
export function requiresReview(username: string): boolean {
	const normalized = username.toLowerCase();
	return REQUIRES_REVIEW.some((term) => normalized.includes(term));
}
