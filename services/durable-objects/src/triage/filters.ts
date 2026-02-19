/**
 * Triage Filters — Blocklist / Allowlist
 *
 * Runs BEFORE AI classification to save Lumen cost on known junk.
 * Evaluates sender against stored filter rules.
 */

export interface FilterRule {
  id: string;
  type: "blocklist" | "allowlist";
  pattern: string;
  match_type: "exact" | "domain" | "contains";
  notes: string | null;
  created_at: string;
}

export interface FilterResult {
  matched: true;
  rule: FilterRule;
  action: "junk" | "allow";
}

/** Default domains that are almost always junk for personal email triage */
export const DEFAULT_BLOCKLIST_DOMAINS = [
  "instagram.com",
  "facebook.com",
  "facebookmail.com",
  "linkedin.com",
  "x.com",
  "tiktok.com",
  "pinterest.com",
  "noreply.github.com", // GitHub notification noise (opt-in via allowlist)
];

/**
 * Evaluate a sender email against all filter rules.
 * Returns the first matching rule, or null if no match.
 *
 * Evaluation order: allowlist first (explicit pass), then blocklist.
 * This lets you allowlist a specific sender from a blocked domain.
 */
export async function evaluateFilters(
  sender: string,
  db: D1Database,
): Promise<FilterResult | null> {
  const normalizedSender = sender.toLowerCase().trim();
  const senderDomain = normalizedSender.split("@")[1] || "";

  // Fetch all filter rules (small table, OK to load all)
  const { results: rules } = await db
    .prepare("SELECT * FROM ivy_triage_filters ORDER BY type ASC")
    .all<FilterRule>();

  if (!rules || rules.length === 0) {
    // Fall back to default blocklist
    return evaluateDefaultBlocklist(senderDomain);
  }

  // Check allowlist first
  for (const rule of rules) {
    if (
      rule.type === "allowlist" &&
      matchesRule(normalizedSender, senderDomain, rule)
    ) {
      return { matched: true, rule, action: "allow" };
    }
  }

  // Then check blocklist
  for (const rule of rules) {
    if (
      rule.type === "blocklist" &&
      matchesRule(normalizedSender, senderDomain, rule)
    ) {
      return { matched: true, rule, action: "junk" };
    }
  }

  // Check default blocklist if no custom rules matched
  return evaluateDefaultBlocklist(senderDomain);
}

function matchesRule(
  sender: string,
  domain: string,
  rule: FilterRule,
): boolean {
  const pattern = rule.pattern.toLowerCase().trim();

  switch (rule.match_type) {
    case "exact":
      return sender === pattern;
    case "domain":
      return domain === pattern || domain.endsWith(`.${pattern}`);
    case "contains":
      return sender.includes(pattern);
    default:
      return false;
  }
}

function evaluateDefaultBlocklist(senderDomain: string): FilterResult | null {
  for (const blockedDomain of DEFAULT_BLOCKLIST_DOMAINS) {
    if (
      senderDomain === blockedDomain ||
      senderDomain.endsWith(`.${blockedDomain}`)
    ) {
      return {
        matched: true,
        rule: {
          id: `default:${blockedDomain}`,
          type: "blocklist",
          pattern: blockedDomain,
          match_type: "domain",
          notes: "Default blocklist",
          created_at: "",
        },
        action: "junk",
      };
    }
  }

  return null;
}
