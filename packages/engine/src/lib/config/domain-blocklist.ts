/**
 * Loam - Domain Blocklist Configuration
 *
 * Part of the Loam name protection system.
 * Comprehensive list of blocked usernames/subdomains organized by category.
 *
 * @see docs/specs/loam-spec.md
 * @module domain-blocklist
 */

export type BlocklistReason =
  | "system"
  | "grove_service"
  | "trademark"
  | "impersonation"
  | "offensive"
  | "fraud"
  | "future_reserved";

/**
 * Array of valid blocklist reasons for runtime validation
 * Use this to validate database values before type assertion
 */
export const VALID_BLOCKLIST_REASONS: BlocklistReason[] = [
  "system",
  "grove_service",
  "trademark",
  "impersonation",
  "offensive",
  "fraud",
  "future_reserved",
];

export interface BlocklistEntry {
  username: string;
  reason: BlocklistReason;
  category?: string;
}

// =============================================================================
// CATEGORY 1: System & Infrastructure
// =============================================================================

const SYSTEM_WEB: string[] = [
  "www",
  "api",
  "app",
  "auth",
  "login",
  "logout",
  "signin",
  "signout",
  "signup",
  "register",
  "account",
  "accounts",
  "oauth",
  "oauth2",
  "sso",
  "admin",
  "administrator",
  "dashboard",
  "panel",
  "console",
  "backend",
  "control",
  "billing",
  "checkout",
  "subscribe",
  "unsubscribe",
  "payment",
  "payments",
  "pay",
  "settings",
  "preferences",
  "config",
  "configuration",
  "profile",
  "profiles",
  "user",
  "users",
  "member",
  "members",
];

const SYSTEM_EMAIL: string[] = [
  "mail",
  "email",
  "emails",
  "smtp",
  "imap",
  "pop",
  "pop3",
  "postmaster",
  "webmail",
  "mx",
  "newsletter",
  "newsletters",
  "noreply",
  "no-reply",
  "mailer",
  "bounce",
  "mailbox",
];

const SYSTEM_NETWORK: string[] = [
  "ftp",
  "sftp",
  "ssh",
  "vpn",
  "proxy",
  "gateway",
  "firewall",
  "cdn",
  "static",
  "assets",
  "media",
  "images",
  "files",
  "img",
  "js",
  "css",
  "fonts",
  "upload",
  "uploads",
  "download",
  "downloads",
  "cache",
  "server",
  "servers",
  "node",
  "nodes",
  "cluster",
  "worker",
  "workers",
];

const SYSTEM_DNS: string[] = [
  "ns",
  "ns1",
  "ns2",
  "ns3",
  "dns",
  "nameserver",
  "whois",
  "rdap",
];

const SYSTEM_METADATA: string[] = [
  "rss",
  "atom",
  "feed",
  "feeds",
  "sitemap",
  "sitemaps",
  "robots",
  "favicon",
  "manifest",
  "status",
  "health",
  "healthcheck",
  "ping",
  "metrics",
  "analytics",
  "telemetry",
  "logs",
  "log",
  "debug",
  "trace",
  "error",
  "errors",
];

const SYSTEM_DEV: string[] = [
  "root",
  "null",
  "undefined",
  "void",
  "nan",
  "test",
  "testing",
  "tests",
  "demo",
  "demos",
  "example",
  "examples",
  "sample",
  "samples",
  "sandbox",
  "staging",
  "dev",
  "development",
  "prod",
  "production",
  "temp",
  "tmp",
  "localhost",
  "local",
  "internal",
  "beta",
  "alpha",
  "canary",
  "nightly",
  "preview",
  "release",
  "releases",
];

const SYSTEM_LEGAL: string[] = [
  "legal",
  "terms",
  "privacy",
  "dmca",
  "copyright",
  "trademark",
  "tos",
  "eula",
  "abuse",
  "report",
  "reports",
  "security",
  "vulnerability",
  "cve",
  "compliance",
  "gdpr",
  "ccpa",
  "dsar",
];

const SYSTEM_DOCS: string[] = [
  "docs",
  "documentation",
  "wiki",
  "guide",
  "guides",
  "tutorial",
  "tutorials",
  "faq",
  "faqs",
  "help",
  "support",
  "knowledge",
  "kb",
  "knowledgebase",
  "manual",
  "manuals",
  "reference",
  "spec",
  "specs",
  "about",
  "info",
  "contact",
  "contacts",
];

// =============================================================================
// CATEGORY 2: Grove Services & Products
// =============================================================================

const GROVE_PUBLIC_SERVICES: string[] = [
  // Core
  "grove",
  "lattice",
  // Subdomain services
  "meadow",
  "forage",
  "foliage",
  "heartwood",
  "trove",
  "outpost",
  "aria",
  "plant",
  "ivy",
  "amber",
  "bloom",
  "mycelium",
  "vista",
  "pantry",
  "nook",
  "clearing",
  "porch",
  "wander", // Immersive Discovery
  "curios", // Cabinet of Wonders
  "forests", // Community Groves
  "canopy", // Wanderer Directory
  "shutter", // Web Content Distillation (Beyond)
  "centennial", // Domain Preservation
  // Route-based services
  "shade",
  "trails",
  "vineyard",
  "terrarium",
  "weave",
];

const GROVE_INTERNAL_SERVICES: string[] = [
  "patina",
  "rings",
  "waystone",
  "reeds",
  "press",
  "wisp",
  "thorn",
  "fireside",
  "vines",
  "arbor",
  "sway",
  "fern",
  "loam",
  "gossamer", // ASCII Visual Effects library
  // Patterns (architectural foundations)
  "prism", // Design System
  "loom", // Real-time Coordination
  "threshold", // Rate Limiting
  "songbird", // Prompt Injection Protection
  "sentinel", // Load Testing
  // Songbird sub-components
  "canary", // Tripwire detection
  "kestrel", // Semantic validation
  // Weave sub-components
  "breeze", // Animation mode
  "thread", // Connections
];

const GROVE_ALIASES: string[] = [
  "domains",
  "music",
  "mc",
  "auth-api",
  "scout",
  "search",
  "og",
  "monitor",
];

const GROVE_INTERNAL_CODENAMES: string[] = [
  "grovesocial",
  "grovedomaintool",
  "grovethemes",
  "groveauth",
  "grovepatina",
  "treasuretrove",
  "grovemc",
  "grovemusic",
  "seedbed",
  "groveanalytics",
  "grovemail",
  "grovestorage",
  "groveshade",
  "grovetrails",
  "groveshowcase",
  "grovebloom",
  "grovemcp",
  "grovemonitor",
  "grovepress",
  "grovewisp",
  "groveshop",
  "grovenook",
  "groveclear",
  "grovewaystone",
  "grovereeds",
  "groveporch",
  "grovethorn",
  "grovearbor",
  "grovescout",
  "groveengine",
  "groveplace",
  "groveloam",
  // New service codenames
  "grovewander",
  "grovecurios",
  "groveforests",
  "groveshutter",
  "grovecentennial",
  "grovegossamer",
  "groveprism",
  "groveloom",
  "grovethreshold",
  "grovesongbird",
  "grovesentinel",
];

/**
 * Typosquatting variants of critical services
 * Common misspellings that could be used for phishing/impersonation
 */
const GROVE_TYPOSQUATTING: string[] = [
  // Grove core
  "grov",
  "grve",
  "groce",
  "grobe",
  "grpve",
  "grive",
  // Meadow
  "meadw",
  "meado",
  "meadwo",
  "medow",
  "maedow",
  // Forage
  "forrage",
  "forrge",
  "forege",
  "forage-grove",
  // Heartwood
  "heartwod",
  "hartwod",
  "harwood",
  "hearwood",
  "hertwood",
  // Plant
  "plat",
  "palnt",
  "plnt",
  // Pantry
  "pnatry",
  "pantrey",
  "patry",
  // Support/admin
  "suport",
  "supprt",
  "amin",
  "admn",
];

// =============================================================================
// CATEGORY 3: Grove Brand & Trademarks
// =============================================================================

const GROVE_BRAND: string[] = [
  // Note: 'grove' is in GROVE_PUBLIC_SERVICES to get 'grove_service' reason
  "groveplace",
  "grove-place",
  "thegrove",
  "the-grove",
  "autumnsgrove",
  "autumns-grove",
  "autumngrove",
  "autumn-grove",
  "autumn",
  "autumns",
];

const GROVE_TIERS: string[] = [
  "seedling",
  "sapling",
  "oak",
  "evergreen",
  "free",
  "premium",
  "pro",
  "plus",
  "basic",
  "starter",
  "enterprise",
];

const GROVE_CONCEPTS: string[] = [
  // Note: 'centennial' is in GROVE_PUBLIC_SERVICES (Domain Preservation feature)
  "seasons",
  "acorn",
  // "canopy" moved to GROVE_PUBLIC_SERVICES (Wanderer Directory)
  "understory",
  "overstory",
  "forest",
  "woods",
  "woodland",
  "tree",
  "trees",
  "branch",
  "branches",
  "root",
  "roots",
  "leaf",
  "leaves",
  "grove-keeper",
  "grovekeeper",
];

// =============================================================================
// CATEGORY 4: Authority & Impersonation Prevention
// =============================================================================

const IMPERSONATION_OFFICIAL: string[] = [
  "official",
  "verified",
  "authentic",
  "real",
  "true",
  "original",
  "genuine",
  "certified",
  "approved",
  "authorized",
  "licensed",
  "legit",
  "legitimate",
];

const IMPERSONATION_ROLES: string[] = [
  // Note: 'admin' and 'administrator' are in SYSTEM_WEB to get 'system' reason
  "moderator",
  "mod",
  "mods",
  "staff",
  "employee",
  "team",
  "founder",
  "cofounder",
  "co-founder",
  "ceo",
  "cto",
  "cfo",
  "coo",
  "president",
  "director",
  "manager",
  "owner",
  "operator",
  "creator",
  "developer",
  "engineer",
  "maintainer",
];

const IMPERSONATION_SUPPORT: string[] = [
  // Note: 'support' is in SYSTEM_DOCS to get 'system' reason
  "helpdesk",
  "help-desk",
  "customerservice",
  "customer-service",
  "trust",
  "safety",
  // Note: 'security' is in SYSTEM_LEGAL to get 'system' reason
  "moderation",
  "enforcement",
  "billing-support",
  "tech-support",
];

// =============================================================================
// CATEGORY 5: Fraud & Spam Patterns
// =============================================================================

const FRAUD_MONEY: string[] = [
  "free-money",
  "freemoney",
  "getrich",
  "get-rich",
  "makemoney",
  "make-money",
  "earnmoney",
  "earn-money",
  "crypto-giveaway",
  "cryptogiveaway",
  "giveaway",
  "airdrop",
  "freebitcoin",
  "free-bitcoin",
];

const FRAUD_PHISHING: string[] = [
  "password",
  "passwords",
  "login-here",
  "signin-here",
  "sign-in",
  "click-here",
  "clickhere",
  "download-now",
  "downloadnow",
  "limited-time",
  "limitedtime",
  "act-now",
  "actnow",
];

const FRAUD_SCAM: string[] = [
  "winner",
  "congratulations",
  "congrats",
  "prize",
  "prizes",
  "lottery",
  "jackpot",
  "invoice",
  "receipt",
  "verify",
  "verification",
  "confirm",
  "confirmation",
  "account-suspended",
  "account-locked",
  "urgent",
  "warning",
  "alert",
  "suspended",
];

const FRAUD_IMPERSONATION: string[] = [
  "paypal",
  "stripe",
  "venmo",
  "cashapp",
  "zelle",
  "apple",
  "google",
  "microsoft",
  "amazon",
  "facebook",
  "instagram",
  "twitter",
  "tiktok",
  "netflix",
  "spotify",
];

// =============================================================================
// CATEGORY 6: Future Reserved (Potential Grove Services)
// =============================================================================

const FUTURE_NATURE_PLACES: string[] = [
  "hollow",
  "glade",
  "thicket",
  "copse",
  "dell",
  "glen",
  "grove-commons",
  "bower",
  "arbor-day",
  "arborday",
];

const FUTURE_NATURE_GROWING: string[] = [
  "seedbank",
  "greenhouse",
  "nursery",
  "mulch",
  "compost",
  "humus",
  "topsoil",
  "sprout",
  "bud",
  "petal",
];

const FUTURE_NATURE_CREATURES: string[] = [
  "birdsong",
  "cricket",
  "firefly",
  "moth",
  "owl",
  "fox",
  "deer",
  "rabbit",
  "cardinal",
  "robin",
  "bluebird",
  "chickadee",
];

const FUTURE_NATURE_PLANTS: string[] = [
  "moss",
  "lichen",
  "fern",
  "mushroom",
  "fungus",
  "truffle",
  "clover",
  "daisy",
  "wildflower",
];

const FUTURE_NATURE_WATER: string[] = [
  "stream",
  "brook",
  "creek",
  "pond",
  "spring",
  "well",
  "rain",
  "mist",
  "dew",
];

const FUTURE_NATURE_TIME: string[] = [
  "sunrise",
  "sunset",
  "dawn",
  "dusk",
  "twilight",
  "midnight",
  "noon",
  "solstice",
  "equinox",
];

// =============================================================================
// COMBINED EXPORTS
// =============================================================================

export const SYSTEM_RESERVED: string[] = [
  ...SYSTEM_WEB,
  ...SYSTEM_EMAIL,
  ...SYSTEM_NETWORK,
  ...SYSTEM_DNS,
  ...SYSTEM_METADATA,
  ...SYSTEM_DEV,
  ...SYSTEM_LEGAL,
  ...SYSTEM_DOCS,
];

export const GROVE_SERVICES: string[] = [
  ...GROVE_PUBLIC_SERVICES,
  ...GROVE_INTERNAL_SERVICES,
  ...GROVE_ALIASES,
  ...GROVE_INTERNAL_CODENAMES,
  ...GROVE_TYPOSQUATTING,
];

export const GROVE_TRADEMARKS: string[] = [
  ...GROVE_BRAND,
  ...GROVE_TIERS,
  ...GROVE_CONCEPTS,
];

export const IMPERSONATION_TERMS: string[] = [
  ...IMPERSONATION_OFFICIAL,
  ...IMPERSONATION_ROLES,
  ...IMPERSONATION_SUPPORT,
];

export const FRAUD_TERMS: string[] = [
  ...FRAUD_MONEY,
  ...FRAUD_PHISHING,
  ...FRAUD_SCAM,
  ...FRAUD_IMPERSONATION,
];

export const FUTURE_RESERVED: string[] = [
  ...FUTURE_NATURE_PLACES,
  ...FUTURE_NATURE_GROWING,
  ...FUTURE_NATURE_CREATURES,
  ...FUTURE_NATURE_PLANTS,
  ...FUTURE_NATURE_WATER,
  ...FUTURE_NATURE_TIME,
];

/**
 * Complete blocklist with all categories
 */
export const COMPLETE_BLOCKLIST: BlocklistEntry[] = [
  ...SYSTEM_RESERVED.map((u) => ({ username: u, reason: "system" as const })),
  ...GROVE_SERVICES.map((u) => ({
    username: u,
    reason: "grove_service" as const,
  })),
  ...GROVE_TRADEMARKS.map((u) => ({
    username: u,
    reason: "trademark" as const,
  })),
  ...IMPERSONATION_TERMS.map((u) => ({
    username: u,
    reason: "impersonation" as const,
  })),
  ...FRAUD_TERMS.map((u) => ({ username: u, reason: "fraud" as const })),
  ...FUTURE_RESERVED.map((u) => ({
    username: u,
    reason: "future_reserved" as const,
  })),
];

/**
 * Fast lookup Set for validation (checks existence only)
 */
export const BLOCKED_USERNAMES: Set<string> = new Set(
  COMPLETE_BLOCKLIST.map((e) => e.username),
);

/**
 * Fast lookup Map for validation with reason (O(1) lookup)
 */
export const BLOCKED_USERNAMES_MAP: Map<string, BlocklistReason> = new Map(
  COMPLETE_BLOCKLIST.map((e) => [e.username, e.reason]),
);

/** Prefixes that indicate impersonation attempts */
const BLOCKED_PREFIXES = ["grove-", "admin-", "official-", "verified-"];

/** Suffixes that indicate impersonation attempts */
const BLOCKED_SUFFIXES = ["-official", "-verified", "-admin", "-support"];

/**
 * Check if a username is blocked
 * @param username - The username to check (will be lowercased)
 * @returns The blocking reason if blocked, null if allowed
 */
export function isUsernameBlocked(username: string): BlocklistReason | null {
  // Normalize: lowercase, trim whitespace, strip null bytes and control characters
  const normalized = username
    .toLowerCase()
    .trim()
    .replace(/[\x00-\x1f\x7f]/g, ""); // Strip control characters including null bytes

  // O(1) exact match lookup using Map
  const exactMatch = BLOCKED_USERNAMES_MAP.get(normalized);
  if (exactMatch) {
    return exactMatch;
  }

  // Check if starts with blocked prefix (e.g., "grove-anything")
  for (const prefix of BLOCKED_PREFIXES) {
    if (normalized.startsWith(prefix)) {
      return "impersonation";
    }
  }

  // Check if ends with blocked suffix
  for (const suffix of BLOCKED_SUFFIXES) {
    if (normalized.endsWith(suffix)) {
      return "impersonation";
    }
  }

  return null;
}

/**
 * Get a user-friendly error message for a blocked username
 * @param reason - The blocking reason
 * @returns A user-friendly error message
 */
export function getBlockedMessage(reason: BlocklistReason): string {
  switch (reason) {
    case "system":
      return "This username is reserved for system use";
    case "grove_service":
      return "This username is reserved for a Grove service";
    case "trademark":
      return "This username is reserved";
    case "impersonation":
      return "This username is not available";
    case "offensive":
      return "This username is not available";
    case "fraud":
      return "This username is not available";
    case "future_reserved":
      return "This username is reserved";
    default:
      return "This username is not available";
  }
}

/**
 * Validation configuration
 */
export const VALIDATION_CONFIG = {
  minLength: 3,
  maxLength: 30,
  pattern: /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/,
  patternDescription:
    "Must start with a letter, contain only lowercase letters, numbers, and single hyphens",
};
