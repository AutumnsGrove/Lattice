/**
 * Loam - Offensive Content Blocklist
 *
 * Part of the Loam name protection system.
 * This file contains terms blocked for violating the Acceptable Use Policy.
 *
 * Sources:
 * - LDNOOBW (List of Dirty, Naughty, Obscene, and Otherwise Bad Words)
 * - dsojevic/profanity-list (categorized with severity ratings)
 * - GLAAD Anti-LGBTQ Hate Speech Guide
 * - Autistic Hoya's Ableist Language List
 * - ADL Hate Symbols Database
 * - SPLC Extremist Files
 *
 * @see docs/specs/loam-spec.md
 * @module offensive-blocklist
 * @private
 */

// =============================================================================
// SLURS - Organized by category
// Note: These are kept intentionally non-enumerated in documentation
// =============================================================================

/**
 * Racial and ethnic slurs
 * Sourced from LDNOOBW and dsojevic/profanity-list (tag: racial)
 */
const SLURS_RACIAL: string[] = [
  // Anti-Black slurs
  "nigger",
  "nigga",
  "nigg3r",
  "n1gger",
  "n1gga",
  "negro",
  "negr0",
  "coon",
  "c00n",
  "darkie",
  "sambo",
  "spook",
  "jigaboo",
  "pickaninny",
  "spade",
  "tar-baby",
  "tarbaby",
  "jungle-bunny",
  "junglebunny",
  "porch-monkey",
  "porchmonkey",
  // Anti-Asian slurs
  "chink",
  "ch1nk",
  "gook",
  "g00k",
  "slope",
  "slant",
  "slanteye",
  "slant-eye",
  "zipperhead",
  "jap",
  "nip",
  "chinaman",
  "ching-chong",
  "chingchong",
  "ch1ng-ch0ng",
  // Anti-Latino/Hispanic slurs
  "wetback",
  "w3tback",
  "spic",
  "sp1c",
  "beaner",
  "b3aner",
  "greaser",
  // Anti-Indigenous slurs
  "redskin",
  "r3dskin",
  "injun",
  "squaw",
  "prairie-nigger",
  "prairienig",
  // Anti-Semitic slurs
  "kike",
  "k1ke",
  "heeb",
  "hymie",
  "yid",
  "sheeny",
  "shylock",
  "jewboy",
  "jew-boy",
  // Anti-Arab/Muslim slurs
  "sand-nigger",
  "sandnigger",
  "towelhead",
  "towel-head",
  "raghead",
  "rag-head",
  "camel-jockey",
  "cameljockey",
  "hajji",
  "haji",
  // Anti-Romani slurs
  "gypsy",
  "gyp",
  "pikey",
  // Anti-South Asian slurs
  "paki",
  "p4ki",
  "dothead",
  "dot-head",
  // General
  "mudblood",
  "halfbreed",
  "half-breed",
  "mulatto",
  "mongrel",
];

/**
 * LGBTQ+ slurs
 * Sourced from GLAAD and dsojevic/profanity-list (tag: lgbtq)
 * Note: Some reclaimed terms are in REQUIRES_REVIEW instead
 */
const SLURS_LGBTQ: string[] = [
  // Homophobic slurs
  "faggot",
  "f4ggot",
  "fagg0t",
  "fag",
  "f4g",
  "fags",
  "faggy",
  "fairy",
  "f41ry",
  "pansy",
  "homo",
  "h0mo",
  "homos",
  "sodomite",
  "cocksucker",
  "c0cksucker",
  "poof",
  "poofter",
  "batty-boy",
  "battyboy",
  "bender",
  "pillow-biter",
  "pillowbiter",
  "arse-bandit",
  "arsebandit",
  "shirt-lifter",
  "shirtlifter",
  "fudge-packer",
  "fudgepacker",
  "butt-pirate",
  "buttpirate",
  // Transphobic slurs
  "tranny",
  "tr4nny",
  "shemale",
  "sh3male",
  "she-male",
  "ladyboy",
  "lady-boy",
  "he-she",
  "heshe",
  "it-creature",
  "trap",
  "shim",
  "dickgirl",
  "dick-girl",
  "chick-with-dick",
  "chickwithdick",
  // Lesbian-specific slurs (non-reclaimed)
  "carpet-muncher",
  "carpetmuncher",
  "rug-muncher",
  "rugmuncher",
  "lesbo",
  "l3sbo",
  "lezzie",
  "lezbo",
  // Bisexual-specific
  "fence-sitter",
  "fencesitter",
];

/**
 * Gendered/sexist slurs
 * Sourced from academic research on gendered hate speech
 */
const SLURS_GENDER: string[] = [
  // Primary slurs
  "cunt",
  "c0nt",
  "c-u-n-t",
  "bitch",
  "b1tch",
  "b-i-t-c-h",
  "slut",
  "sl0t",
  "whore",
  "wh0re",
  "hoe",
  "h0e",
  "ho",
  "skank",
  "sk4nk",
  "slag",
  "tramp",
  "trollop",
  // Body-shaming slurs
  "butterface",
  "butter-face",
  // Violence-adjacent
  "cum-dumpster",
  "cumdumpster",
  "cum-slut",
  "cumslut",
  "cock-sleeve",
  "cocksleeve",
  // Degrading terms
  "twat",
  "tw4t",
  "gash",
  "minge",
  "floozy",
  "hussy",
];

/**
 * Ableist slurs
 * Sourced from Autistic Hoya, Dictionary.com, UW Medicine
 */
const SLURS_ABLEIST: string[] = [
  // Cognitive disability slurs
  "retard",
  "r3tard",
  "retarded",
  "r3tarded",
  "tard",
  "t4rd",
  "libtard",
  "l1btard",
  "fucktard",
  "mongoloid",
  "mong0loid",
  "mong",
  "moron",
  "imbecile",
  "cretin",
  // Physical disability slurs
  "cripple",
  "cr1pple",
  "crippled",
  "gimp",
  "g1mp",
  "gimpy",
  "spastic",
  "sp4stic",
  "spaz",
  "sp4z",
  "spazz",
  "spazzed",
  "lame",
  // Mental health slurs
  "psycho",
  "psych0",
  "lunatic",
  "lunat1c",
  "nutcase",
  "nutjob",
  "schizo",
  "sch1zo",
  "basket-case",
  "basketcase",
  // Sensory disability
  "deaf-and-dumb",
  "deafdumb",
  "dumb",
  "mute",
];

// =============================================================================
// VIOLENCE & EXTREMISM
// Sourced from ADL, SPLC, DHS threat assessments
// =============================================================================

const VIOLENCE_TERMS: string[] = [
  "killall",
  "kill-all",
  "k1llall",
  "genocide",
  "gen0cide",
  "ethnic-cleansing",
  "ethniccleansing",
  "holocaust",
  "h0locaust",
  "lynching",
  "lynch",
  "lynchings",
  "death-to",
  "deathto",
  "murder",
  "murderer",
  "terrorist",
  "terrorism",
  "terr0rist",
  "bomber",
  "suicide-bomber",
  "shooting",
  "shooter",
  "mass-shooter",
  "massshooter",
  "massacre",
  "massacres",
  "slaughter",
  // Mass shooter glorification (per ADL gaming research)
  "columbine",
  "columbiners",
  "elliot-rodger",
  "elliotrodger",
  "saint-elliot",
  "saintelliot",
  "going-er",
  "goinger",
  "supreme-gentleman",
  "supremegentleman",
  "day-of-retribution",
  "dayofretribution",
  "beta-uprising",
  "betauprising",
  // Accelerationist terminology
  "race-war",
  "racewar",
  "rahowa",
  "r4howa",
  "racial-holy-war",
  "boogaloo",
  "big-igloo",
  "boog",
  "accelerationism",
  "accelerationist",
  "lone-wolf",
  "lonewolf",
  "day-of-the-rope",
  "dayoftherope",
  "dotr",
];

const HATE_GROUPS: string[] = [
  // Nazi/white supremacist
  "nazi",
  "nazis",
  "n4zi",
  "n4zis",
  "neonazi",
  "neo-nazi",
  "n30nazi",
  "skinhead",
  "skinheads",
  "sk1nhead",
  "kkk",
  "ku-klux-klan",
  "klan",
  "klansman",
  "aryan",
  "aryan-nation",
  "aryannation",
  "aryan-brotherhood",
  "aryans",
  "whitepride",
  "white-pride",
  "wh1tepride",
  "whitepower",
  "white-power",
  "wh1tepower",
  // Numeric codes (ADL Hate Symbols Database)
  "1488",
  "14-88",
  "14words",
  "14-words",
  "fourteenwords",
  "hh88",
  "sieg-heil",
  "siegheil",
  "s1egheil",
  "heil-hitler",
  "heilhitler",
  "h3ilhitler",
  // Symbols
  "black-sun",
  "blacksun",
  "sonnenrad",
  "totenkopf",
  "ss-bolts",
  "ssbolts",
  "blood-and-soil",
  "bloodandsoil",
  "blut-und-boden",
  // Active groups (SPLC tracking)
  "proudboys",
  "proud-boys",
  "pr0udboys",
  "oathkeepers",
  "oath-keepers",
  "0athkeepers",
  "threepers",
  "three-percenters",
  "3percenters",
  "3-percent",
  "atomwaffen",
  "atomw4ffen",
  "identity-evropa",
  "identityevropa",
  "patriot-front",
  "patriotfront",
  "vanguard-america",
  "vanguardamerica",
  "goyim-defense-league",
  "goyimdefense",
  "stormfront",
  "st0rmfront",
  "daily-stormer",
  "dailystormer",
  "combat-18",
  "combat18",
  "c18",
  "hammerskins",
  "hammerskin",
  "white-genocide",
  "whitegenocide",
  "zog",
];

const TERRORIST_GROUPS: string[] = [
  "isis",
  "1sis",
  "isil",
  "daesh",
  "da3sh",
  "islamic-state",
  "islamicstate",
  "al-qaeda",
  "alqaeda",
  "al-qa1da",
  "al-shabab",
  "alshabab",
  "boko-haram",
  "bokoharam",
  "taliban",
  "tal1ban",
];

// =============================================================================
// SELF-HARM CONTENT
// Blocked for user safety
// =============================================================================

const SELF_HARM: string[] = [
  "suicide",
  "suicidal",
  "su1cide",
  "killmyself",
  "kill-myself",
  "k1llmyself",
  "kms",
  "selfharm",
  "self-harm",
  "s3lfharm",
  "cutting",
  "cutter",
  "cutt1ng",
  // Pro-eating disorder
  "proana",
  "pro-ana",
  "pr0ana",
  "promia",
  "pro-mia",
  "pr0mia",
  "thinspo",
  "thinspiration",
  "th1nspo",
  "bonespo",
  "bonespiration",
  "b0nespo",
  "meanspo",
  "m3anspo",
  "ana-tips",
  "anatips",
  "mia-tips",
  "miatips",
  "edtwt",
  "ed-twt",
  "shtwt",
  "sh-twt",
  "ana-buddy",
  "anabuddy",
  // Other self-harm
  "an-hero",
  "anhero",
  "ldar",
  "lie-down-and-rot",
  "rope-day",
  "ropeday",
  "neck-rope",
  "neckrope",
  "end-it-all",
  "enditall",
  "want-to-die",
  "wanttod1e",
];

// =============================================================================
// EXPLOITATION CONTENT
// =============================================================================

const EXPLOITATION: string[] = [
  "pedo",
  "p3do",
  "pedophile",
  "pedoph1le",
  "paedo",
  "paedophile",
  "child-lover",
  "childlover",
  "minor-attracted",
  "minorattracted",
  "hebephile",
  "hebeph1le",
  "jailbait",
  "ja1lbait",
  "underage",
  "und3rage",
  "preteen",
  "pre-teen",
  "pr3teen",
  "lolita",
  "l0lita",
  "loli",
  "l0li",
  "shota",
  "sh0ta",
  "toddlercon",
  "t0ddlercon",
  "grooming",
  "gro0ming",
  "groomer",
  "groomers",
  "child-predator",
  "childpredator",
];

// =============================================================================
// EXPLICIT SEXUAL (for username context)
// =============================================================================

const EXPLICIT_SEXUAL: string[] = [
  "xxx",
  "xxxx",
  "porn",
  "p0rn",
  "porno",
  "pornhub",
  "xvideos",
  "xnxx",
  "hentai",
  "h3ntai",
  "camgirl",
  "camboy",
  "escort",
  "escorts",
  "hooker",
  "prostitute",
];

// =============================================================================
// INCEL TERMINOLOGY
// Per ADL: "most violent community within the manosphere"
// =============================================================================

const INCEL_TERMS: string[] = [
  "incel",
  "1ncel",
  "incels",
  "blackpill",
  "black-pill",
  "blackpilled",
  "foid",
  "f0id",
  "foids",
  "femoid",
  "fem0id",
  "femoids",
  "roastie",
  "roasties",
  "r0astie",
];

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Leetspeak/obfuscation variants
 * Common character substitutions to evade filters
 */
function generateLeetVariants(term: string): string[] {
  const substitutions: Record<string, string[]> = {
    a: ["4", "@"],
    e: ["3"],
    i: ["1", "!"],
    o: ["0"],
    s: ["5", "$"],
    t: ["7"],
    l: ["1"],
    g: ["9"],
  };

  const variants: string[] = [term];

  // Generate single-substitution variants
  for (const [char, replacements] of Object.entries(substitutions)) {
    if (term.includes(char)) {
      for (const replacement of replacements) {
        variants.push(term.replace(new RegExp(char, "g"), replacement));
      }
    }
  }

  return variants;
}

// =============================================================================
// COMBINED EXPORTS
// =============================================================================

/**
 * All offensive terms combined
 * Includes base terms and generated variants
 */
export const OFFENSIVE_TERMS: string[] = [
  ...SLURS_RACIAL,
  ...SLURS_LGBTQ,
  ...SLURS_GENDER,
  ...SLURS_ABLEIST,
  ...VIOLENCE_TERMS,
  ...HATE_GROUPS,
  ...TERRORIST_GROUPS,
  ...SELF_HARM,
  ...EXPLOITATION,
  ...EXPLICIT_SEXUAL,
  ...INCEL_TERMS,
].flatMap((term) => generateLeetVariants(term));

/**
 * Fast lookup Set
 */
export const OFFENSIVE_SET: Set<string> = new Set(OFFENSIVE_TERMS);

/**
 * Terms requiring substring matching (hate groups, violence)
 */
const DANGEROUS_SUBSTRINGS = [
  ...HATE_GROUPS,
  ...VIOLENCE_TERMS,
  ...TERRORIST_GROUPS,
];

/**
 * Severe slurs that should be caught even as substrings.
 * These are carefully selected to minimize false positives.
 * Excludes short terms (3 chars or less) that might appear in legitimate words.
 */
const SLUR_SUBSTRINGS: string[] = [
  // Racial slurs (4+ chars, unlikely to appear in legitimate words)
  "nigger",
  "nigga",
  "chink",
  "wetback",
  "beaner",
  "redskin",
  "sandnigger",
  "towelhead",
  "raghead",
  // LGBTQ slurs (4+ chars)
  "faggot",
  "tranny",
  "shemale",
  // Ableist slurs (4+ chars) - Note: "retard" handled separately with word boundary check
  "retarded",
  "spastic",
  // Exploitation (4+ chars) - Note: "pedo" handled separately with word boundary check
  "pedophile",
  "jailbait",
  "lolita",
  "groomer",
];

/**
 * Terms that need word boundary checking to avoid false positives.
 * Example: "retard" could match "fire-retardant-blog"
 */
const BOUNDARY_CHECK_TERMS: string[] = [
  "retard", // Could match "retardant"
  "pedo", // Could match "pedometer" (rare, but possible)
];

/**
 * Check if a term appears as a word (not embedded in another word)
 * Uses simple boundary detection: term is at start/end or surrounded by non-letters
 */
function hasWordBoundary(text: string, term: string): boolean {
  const index = text.indexOf(term);
  if (index === -1) return false;

  const beforeChar = index > 0 ? text[index - 1] : "";
  const afterChar =
    index + term.length < text.length ? text[index + term.length] : "";

  // Check if bounded by non-letter characters or string boundaries
  const beforeOk = !beforeChar || !/[a-z]/.test(beforeChar);
  const afterOk = !afterChar || !/[a-z]/.test(afterChar);

  return beforeOk && afterOk;
}

/**
 * Check if a username contains offensive content
 * Uses exact matching and substring matching for dangerous/severe terms
 *
 * @param username - The username to check
 * @returns true if offensive content detected
 */
export function containsOffensiveContent(username: string): boolean {
  const normalized = username.toLowerCase().replace(/-/g, "");

  // Exact match
  if (OFFENSIVE_SET.has(normalized)) {
    return true;
  }

  // Also check with hyphens preserved
  if (OFFENSIVE_SET.has(username.toLowerCase())) {
    return true;
  }

  // Substring match for dangerous terms (hate groups, violence, terrorist)
  for (const term of DANGEROUS_SUBSTRINGS) {
    const normalizedTerm = term.replace(/-/g, "");
    if (normalized.includes(normalizedTerm)) {
      return true;
    }
  }

  // Substring match for severe slurs (catches "badword123" patterns)
  for (const slur of SLUR_SUBSTRINGS) {
    if (normalized.includes(slur)) {
      return true;
    }
  }

  // Word boundary check for terms prone to false positives
  // Use lowercase with hyphens preserved since hyphens ARE word boundaries
  const withHyphens = username.toLowerCase();
  for (const term of BOUNDARY_CHECK_TERMS) {
    if (
      hasWordBoundary(withHyphens, term) ||
      hasWordBoundary(normalized, term)
    ) {
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
  "queer",
  "dyke",
  "femme",
  "butch",
  "twink",
  "bear",
  "leather",
  "crip", // disability reclaimed term
];

/**
 * Check if a term requires manual review
 */
export function requiresReview(username: string): boolean {
  const normalized = username.toLowerCase();
  return REQUIRES_REVIEW.some((term) => normalized.includes(term));
}
