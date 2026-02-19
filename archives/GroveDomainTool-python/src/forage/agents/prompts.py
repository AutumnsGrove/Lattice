"""
Prompt templates for domain search agents

All prompt engineering lives here. Prompts are designed to:
1. Generate creative, relevant domain candidates
2. Evaluate domains for pronounceability, memorability, brand fit
3. Learn from previous attempts and avoid repetition
"""

# =============================================================================
# DRIVER AGENT PROMPTS
# =============================================================================

DRIVER_SYSTEM_PROMPT = """You are a domain name expert helping find the perfect domain for a client's business or project.

Your role is to generate creative, memorable, and available domain name candidates that are DIRECTLY RELATED to the client's business name.

CRITICAL: Every domain you suggest MUST be based on or inspired by the client's business name. Do NOT generate generic domains unrelated to their business.

Key principles:
1. **Business name focus**: ALL domains must relate to the client's business name - use the name directly, abbreviations, variations, or creative wordplay based on the name.
2. **Availability awareness**: Many obvious names are taken. Get creative with prefixes, suffixes, word combinations, and alternative TLDs.
3. **Brand fit**: Names should match the client's stated vibe (professional, creative, minimal, bold, personal).
4. **Practical**: Names should be easy to spell, pronounce, and remember. Avoid hyphens and numbers.
5. **Diverse**: Suggest a mix of direct names, creative variations, and unexpected options - BUT all related to the business name.
6. **TLD strategy**: .com is king but .co, .io, .dev, .app, .me are strong alternatives.

When given previous results, learn from them:
- Avoid repeating domains already checked
- If a pattern is taken (e.g., [name].com), try variations ([name]hq.com, get[name].com)
- If short names are taken, try slightly longer descriptive names
- Note which TLDs had availability and lean into those

Output format: JSON with a "domains" array containing domain name strings.
Example for "Sunrise Bakery": {"domains": ["sunrisebakery.com", "sunrisebakes.co", "getsunrise.io", "sunrisebaking.com", "thesunrisebakery.co"]}
"""

DRIVER_GENERATE_PROMPT = """Generate {count} domain name candidates for this client.

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
{{"domains": ["domain1.tld", "domain2.tld", ...]}}
"""

# Template sections for the generate prompt
DOMAIN_IDEA_SECTION = """**Domain Idea (client's preference)**: {domain_idea}
"""

KEYWORDS_SECTION = """**Keywords/Themes**: {keywords}
"""

PREVIOUS_RESULTS_SECTION = """
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
"""

NO_PREVIOUS_RESULTS = """
This is the first batch. Start with the most obvious/desirable options first,
then include creative alternatives. Mix direct names with variations.
"""

# Batch-specific guidelines
BATCH_GUIDELINES = {
    1: """- Start with the most obvious and desirable names
- Include the exact business name with top TLDs (.com, .co, .io)
- Add common prefix/suffix variations (get, try, my, hq, app, studio)
- Mix short catchy names with descriptive alternatives""",

    2: """- Build on batch 1 learnings - avoid patterns that were all taken
- Try more creative combinations and wordplay
- Explore TLDs that showed availability in batch 1
- Consider industry-specific terms and metaphors""",

    3: """- Get more creative - simple names are likely exhausted
- Try compound words, phrases, and action-oriented names
- Look for synonyms and related concepts
- Explore niche TLDs if mainstream ones are saturated""",

    4: """- Think outside the box - obvious paths are exhausted
- Consider abbreviated names, acronyms, made-up words
- Try unexpected but relevant word combinations
- Focus on TLDs with proven availability""",

    5: """- Last creative push before potential follow-up
- Combine learnings from all previous batches
- Try any remaining untested patterns
- Include some "long shot" premium-sounding options""",

    6: """- Final batch - make it count
- Focus on quality over quantity
- Include your best remaining ideas
- Consider names that might need client input to validate""",
}


# =============================================================================
# SWARM EVALUATION PROMPTS
# =============================================================================

SWARM_SYSTEM_PROMPT = """You are a domain name evaluator. Your job is to quickly assess domain names for quality.

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

Output format: JSON with evaluations array.
"""

SWARM_EVALUATE_PROMPT = """Evaluate these domain names for the client:

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
{{"evaluations": [
  {{"domain": "example.com", "score": 0.85, "worth_checking": true, "pronounceable": true, "memorable": true, "brand_fit": true, "email_friendly": true, "flags": [], "notes": "Short, classic .com"}},
  ...
]}}
"""


# =============================================================================
# FOLLOW-UP QUIZ PROMPTS
# =============================================================================

FOLLOWUP_QUIZ_SYSTEM = """You are helping refine a domain search that hasn't found enough good options.

Based on the search results, generate 3 targeted follow-up questions that will help narrow down what the client really wants.

Your questions should:
1. Address specific patterns from the failed search
2. Help clarify trade-offs (e.g., short name vs. .com TLD)
3. Explore new directions based on what's available
4. Be quick to answer (multiple choice preferred)
"""

FOLLOWUP_QUIZ_PROMPT = """Generate a follow-up quiz based on this search:

## Original Preferences
{original_quiz}

## Search Results
- Batches completed: {batches_completed}
- Domains checked: {total_checked}
- Good options found: {good_found} (target was {target})

## Availability Patterns
{availability_patterns}

## What Was Taken
{taken_summary}

## What Was Available
{available_summary}

Generate 3 follow-up questions as JSON:
{{"questions": [
  {{
    "id": "followup_1",
    "type": "single_select",
    "prompt": "Question text",
    "options": [{{"value": "opt1", "label": "Option 1"}}, ...]
  }},
  ...
]}}

Focus on the specific trade-offs and patterns from this search.
"""


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def format_driver_prompt(
    business_name: str,
    tld_preferences: list[str],
    vibe: str,
    batch_num: int,
    count: int = 50,
    max_batches: int = 6,
    domain_idea: str | None = None,
    keywords: str | None = None,
    previous_results: dict | None = None,
) -> str:
    """
    Format the driver prompt with all context.

    Args:
        business_name: Client's business/project name
        tld_preferences: List of preferred TLDs
        vibe: Brand vibe (professional, creative, etc.)
        batch_num: Current batch number (1-indexed)
        count: Number of candidates to generate
        max_batches: Maximum number of batches
        domain_idea: Optional client-specified domain
        keywords: Optional keywords/themes
        previous_results: Dict with previous batch results

    Returns:
        Formatted prompt string
    """
    # Format TLD preferences
    tld_str = ", ".join(f".{tld}" for tld in tld_preferences)
    if "any" in tld_preferences:
        tld_str = "Open to any TLD (but prefers .com if available)"

    # Optional sections
    domain_idea_section = ""
    if domain_idea:
        domain_idea_section = DOMAIN_IDEA_SECTION.format(domain_idea=domain_idea)

    keywords_section = ""
    if keywords:
        keywords_section = KEYWORDS_SECTION.format(keywords=keywords)

    # Previous results section
    if previous_results and batch_num > 1:
        previous_results_section = PREVIOUS_RESULTS_SECTION.format(
            checked_count=previous_results.get("checked_count", 0),
            available_count=previous_results.get("available_count", 0),
            target_count=previous_results.get("target_count", 25),
            tried_summary=previous_results.get("tried_summary", "None yet"),
            available_summary=previous_results.get("available_summary", "None yet"),
            taken_patterns=previous_results.get("taken_patterns", "Unknown"),
        )
    else:
        previous_results_section = NO_PREVIOUS_RESULTS

    # Batch guidelines
    batch_guidelines = BATCH_GUIDELINES.get(batch_num, BATCH_GUIDELINES[6])

    return DRIVER_GENERATE_PROMPT.format(
        count=count,
        business_name=business_name,
        domain_idea_section=domain_idea_section,
        tld_preferences=tld_str,
        vibe=vibe,
        keywords_section=keywords_section,
        batch_num=batch_num,
        max_batches=max_batches,
        previous_results_section=previous_results_section,
        batch_guidelines=batch_guidelines,
    )


def format_swarm_prompt(
    domains: list[str],
    vibe: str,
    business_name: str,
) -> str:
    """
    Format the swarm evaluation prompt.

    Args:
        domains: List of domains to evaluate
        vibe: Brand vibe
        business_name: Client's business name

    Returns:
        Formatted prompt string
    """
    domains_list = "\n".join(f"- {d}" for d in domains)

    return SWARM_EVALUATE_PROMPT.format(
        vibe=vibe,
        business_name=business_name,
        domains_list=domains_list,
    )


def format_followup_prompt(
    original_quiz: dict,
    batches_completed: int,
    total_checked: int,
    good_found: int,
    target: int,
    availability_patterns: str,
    taken_summary: str,
    available_summary: str,
) -> str:
    """
    Format the follow-up quiz generation prompt.

    Args:
        original_quiz: Original quiz responses
        batches_completed: Number of batches run
        total_checked: Total domains checked
        good_found: Good domains found
        target: Target number of good domains
        availability_patterns: Description of availability patterns
        taken_summary: Summary of taken domains
        available_summary: Summary of available domains

    Returns:
        Formatted prompt string
    """
    import json
    original_quiz_str = json.dumps(original_quiz, indent=2)

    return FOLLOWUP_QUIZ_PROMPT.format(
        original_quiz=original_quiz_str,
        batches_completed=batches_completed,
        total_checked=total_checked,
        good_found=good_found,
        target=target,
        availability_patterns=availability_patterns,
        taken_summary=taken_summary,
        available_summary=available_summary,
    )
