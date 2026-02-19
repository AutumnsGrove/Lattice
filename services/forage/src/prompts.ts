/**
 * Prompt templates for domain search agents
 *
 * Ported from Python: src/grove_domain_tool/agents/prompts.py
 */

// =============================================================================
// DRIVER AGENT PROMPTS
// =============================================================================

export const DRIVER_SYSTEM_PROMPT = `You are a domain name expert helping find the perfect domain for a client's business or project.

Your role is to generate creative, memorable, and available domain name candidates that are DIRECTLY RELATED to the client's business name.

CRITICAL: Every domain you suggest MUST be based on or inspired by the client's business name. Do NOT generate generic domains unrelated to their business.

Key principles:
1. **Business name focus**: ALL domains must relate to the client's business name - use the name directly, abbreviations, variations, or creative wordplay based on the name.
2. **Availability awareness**: Many obvious names are taken. Get creative with prefixes, suffixes, word combinations, and alternative TLDs.
3. **Brand fit**: Names should match the client's stated vibe (professional, creative, minimal, bold, personal).
4. **Practical**: Names should be easy to spell, pronounce, and remember. Avoid hyphens and numbers.
5. **Diverse**: Suggest a mix of direct names, creative variations, and unexpected options - BUT all related to the business name.
6. **TLD strategy**: .com remains the gold standard, but modern alternatives like .co, .io, .dev, .app, and .me are excellent for tech brands. Consider creative TLDs (.design, .studio, .space) and nature-themed ones (.garden, .earth, .place, .life) when they fit the brand personality.

When given previous results, learn from them:
- Avoid repeating domains already checked
- If a pattern is taken (e.g., [name].com), try variations ([name]hq.com, get[name].com)
- If short names are taken, try slightly longer descriptive names
- Note which TLDs had availability and lean into those

Output format: JSON with a "domains" array containing domain name strings.
Example for "Sunrise Bakery": {"domains": ["sunrisebakery.com", "sunrisebakes.co", "getsunrise.io", "sunrisebaking.com", "thesunrisebakery.co"]}`;

const DRIVER_GENERATE_PROMPT = `Generate {count} domain name candidates for this client.

## Client Information

**Business/Project Name**: {business_name}
{domain_idea_section}
**Preferred TLDs**: {tld_preferences}
**Brand Vibe**: {vibe}
{keywords_section}

## Current Batch

This is batch {batch_num} of {max_batches}.
{previous_results_section}

## Instructions

Generate exactly {count} unique domain suggestions as a JSON object.

IMPORTANT: Every domain MUST be based on "{business_name}" - use variations, abbreviations, prefixes, suffixes, or creative wordplay derived from this name. Do NOT suggest generic domains unrelated to the business name.

Guidelines for this batch:
{batch_guidelines}

Output only valid JSON in this format:
{"domains": ["domain1.tld", "domain2.tld", ...]}`;

const DOMAIN_IDEA_SECTION = `**Domain Idea (client's preference)**: {domain_idea}
`;

const KEYWORDS_SECTION = `**Keywords/Themes**: {keywords}
`;

const PREVIOUS_RESULTS_SECTION = `
## Previous Results

**Domains already checked**: {checked_count}
**Available so far**: {available_count}
**Target**: {target_count} good domains

### What's been tried:
{tried_summary}

### What worked (available):
{available_summary}

### Patterns to avoid (all taken):
{taken_patterns}
`;

const NO_PREVIOUS_RESULTS = `
This is the first batch. Start with the most obvious/desirable options first,
then include creative alternatives. Mix direct names with variations.
`;

const BATCH_GUIDELINES: Record<number, string> = {
	1: `- Start with the most obvious and desirable names
- Include the exact business name with top TLDs (.com, .co, .io)
- Add common prefix/suffix variations (get, try, my, hq, app, studio)
- Mix short catchy names with descriptive alternatives`,

	2: `- Build on batch 1 learnings - avoid patterns that were all taken
- Try more creative combinations and wordplay
- Explore TLDs that showed availability in batch 1
- Consider industry-specific terms and metaphors`,

	3: `- Get more creative - simple names are likely exhausted
- Try compound words, phrases, and action-oriented names
- Look for synonyms and related concepts
- Explore niche TLDs if mainstream ones are saturated`,

	4: `- Think outside the box - obvious paths are exhausted
- Consider abbreviated names, acronyms, made-up words
- Try unexpected but relevant word combinations
- Focus on TLDs with proven availability`,

	5: `- Last creative push before potential follow-up
- Combine learnings from all previous batches
- Try any remaining untested patterns
- Include some "long shot" premium-sounding options`,

	6: `- Final batch - make it count
- Focus on quality over quantity
- Include your best remaining ideas
- Consider names that might need client input to validate`,
};

// =============================================================================
// VIBE PARSING PROMPTS
// =============================================================================

export const VIBE_PARSE_SYSTEM_PROMPT = `You are an expert at understanding what people want for their domain names and online presence.

Your job is to take a freeform description and extract structured information for a domain search.

Be creative in interpreting the user's intent:
- If they describe a business, infer the business name
- If they describe a feeling or aesthetic, capture that as the vibe
- Extract any keywords that could help generate domain ideas
- Make smart defaults for anything not explicitly stated

Always output valid JSON matching the required schema.`;

export const VIBE_PARSE_PROMPT = `Parse this description into structured domain search parameters:

"{vibe_text}"

Extract the following information and output as JSON:

{
  "business_name": "The inferred business/project name (required - make your best guess)",
  "domain_idea": "Any specific domain they mentioned wanting, or null",
  "vibe": "The brand feeling/aesthetic: professional, creative, minimal, bold, playful, technical, friendly, elegant, modern, or a combination",
  "keywords": "Comma-separated relevant keywords extracted from their description",
  "tld_preferences": ["array of preferred TLDs like com, io, co, or 'any' if not specified"]
}

Guidelines:
- business_name: Look for proper nouns, project names, or descriptive phrases. If unclear, create a concise name from key concepts.
- vibe: Infer the tone from adjectives, industry, and overall description. Default to "professional" if unclear.
- keywords: Extract 3-5 key themes, concepts, or descriptive words.
- tld_preferences: Only include specific TLDs if mentioned. Default to ["any"] for flexibility.
- domain_idea: Only include if they explicitly mentioned a specific domain they want.

Output ONLY the JSON object, no markdown or explanation.`;

/**
 * Format the vibe parsing prompt
 */
export function formatVibeParsePrompt(vibeText: string): string {
	return VIBE_PARSE_PROMPT.replace("{vibe_text}", vibeText);
}

// =============================================================================
// SWARM EVALUATION PROMPTS
// =============================================================================

export const SWARM_SYSTEM_PROMPT = `You are a domain name evaluator. Your job is to quickly assess domain names for quality.

Score each domain on these criteria:
1. **Pronounceability** (0-1): Can it be easily said aloud? No awkward letter combinations?
2. **Memorability** (0-1): Will people remember it after hearing once?
3. **Brand fit** (0-1): Does it sound professional and trustworthy?
4. **Email-ability** (0-1): Would this make a good email address? Easy to spell over phone?

Also flag potential issues:
- Unfortunate spellings or meanings in other languages
- Possible trademark conflicts with major brands
- Awkward pronunciation or letter combinations
- Too similar to existing popular sites

Output format: JSON with evaluations array.`;

const SWARM_EVALUATE_PROMPT = `Evaluate these domain names for the client:

**Client Vibe**: {vibe}
**Business Type**: {business_name}

**Domains to evaluate**:
{domains_list}

For each domain, provide:
- score: Overall quality score 0-1 (average of criteria)
- worth_checking: boolean - should we check availability?
- pronounceable: boolean
- memorable: boolean
- brand_fit: boolean
- email_friendly: boolean
- flags: array of any concerns
- notes: brief explanation

Output as JSON:
{"evaluations": [
  {"domain": "example.com", "score": 0.85, "worth_checking": true, "pronounceable": true, "memorable": true, "brand_fit": true, "email_friendly": true, "flags": [], "notes": "Short, classic .com"},
  ...
]}`;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export interface PreviousResults {
	checked_count: number;
	available_count: number;
	target_count: number;
	tried_summary: string;
	available_summary: string;
	taken_patterns: string;
}

export interface DriverPromptOptions {
	businessName: string;
	tldPreferences: string[];
	vibe: string;
	batchNum: number;
	count?: number;
	maxBatches?: number;
	domainIdea?: string;
	keywords?: string;
	diverseTlds?: boolean;
	previousResults?: PreviousResults;
}

/**
 * Format the driver prompt with all context
 */
export function formatDriverPrompt(options: DriverPromptOptions): string {
	const {
		businessName,
		tldPreferences,
		vibe,
		batchNum,
		count = 50,
		maxBatches = 6,
		domainIdea,
		keywords,
		diverseTlds,
		previousResults,
	} = options;

	// Format TLD preferences
	let tldStr = tldPreferences.map((tld) => `.${tld}`).join(", ");
	if (tldPreferences.includes("any")) {
		tldStr = "Open to any TLD (but prefers .com if available)";
	}

	// Optional sections
	const domainIdeaSection = domainIdea
		? DOMAIN_IDEA_SECTION.replace("{domain_idea}", domainIdea)
		: "";

	const keywordsSection = keywords ? KEYWORDS_SECTION.replace("{keywords}", keywords) : "";

	// Previous results section
	let previousResultsSection: string;
	if (previousResults && batchNum > 1) {
		previousResultsSection = PREVIOUS_RESULTS_SECTION.replace(
			"{checked_count}",
			String(previousResults.checked_count),
		)
			.replace("{available_count}", String(previousResults.available_count))
			.replace("{target_count}", String(previousResults.target_count))
			.replace("{tried_summary}", previousResults.tried_summary || "None yet")
			.replace("{available_summary}", previousResults.available_summary || "None yet")
			.replace("{taken_patterns}", previousResults.taken_patterns || "Unknown");
	} else {
		previousResultsSection = NO_PREVIOUS_RESULTS;
	}

	// Batch guidelines
	const batchGuidelines = BATCH_GUIDELINES[batchNum] || BATCH_GUIDELINES[6];

	let prompt = DRIVER_GENERATE_PROMPT.replace("{count}", String(count))
		.replace(/{business_name}/g, businessName)
		.replace("{domain_idea_section}", domainIdeaSection)
		.replace("{tld_preferences}", tldStr)
		.replace("{vibe}", vibe)
		.replace("{keywords_section}", keywordsSection)
		.replace("{batch_num}", String(batchNum))
		.replace("{max_batches}", String(maxBatches))
		.replace("{previous_results_section}", previousResultsSection)
		.replace("{batch_guidelines}", batchGuidelines);

	// Add diverse TLD instructions if enabled
	if (diverseTlds) {
		prompt += `

**TLD Diversity Requested**: The client wants variety in TLD suggestions. For this batch:
- Include at least 3-4 different TLDs in your suggestions
- Don't use the same TLD for more than 30% of domains
- Mix traditional TLDs (.com, .co) with creative options (.design, .studio, .space, .garden)
- Consider TLDs that match the brand vibe:
  - Tech vibes: .io, .dev, .ai, .app, .tech
  - Creative vibes: .design, .studio, .space, .art
  - Nature/organic vibes: .earth, .garden, .green, .place, .life
  - Personal brands: .me, .blog, .page`;
	}

	return prompt;
}

export interface SwarmPromptOptions {
	domains: string[];
	vibe: string;
	businessName: string;
}

/**
 * Format the swarm evaluation prompt
 */
export function formatSwarmPrompt(options: SwarmPromptOptions): string {
	const { domains, vibe, businessName } = options;
	const domainsList = domains.map((d) => `- ${d}`).join("\n");

	return SWARM_EVALUATE_PROMPT.replace("{vibe}", vibe)
		.replace("{business_name}", businessName)
		.replace("{domains_list}", domainsList);
}
