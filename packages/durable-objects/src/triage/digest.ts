/**
 * Triage Digest — Email Briefing Generation & Delivery
 *
 * Generates a clean digest of unread emails grouped by category,
 * summarizes them via Lumen, and delivers via Zephyr service binding.
 *
 * Digest times default to 8am / 1pm / 6pm, configurable per-user.
 */

import type { LumenClient } from "@autumnsgrove/lattice/lumen";
import type { EmailCategory } from "./types.js";

// =============================================================================
// TYPES
// =============================================================================

export interface DigestEmail {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  category: EmailCategory;
  suggested_action: string;
  created_at: string;
}

export interface DigestSettings {
  digest_times: string; // JSON array: ["08:00","13:00","18:00"]
  digest_timezone: string;
  digest_recipient: string;
  digest_enabled: number;
  last_digest_at: string | null;
}

interface ZephyrBinding {
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

// =============================================================================
// QUERY EMAILS FOR DIGEST
// =============================================================================

/**
 * Get unread emails since the last digest, grouped by category.
 */
export async function getDigestEmails(
  db: D1Database,
  since: string | null,
): Promise<DigestEmail[]> {
  const query = since
    ? `SELECT id, original_sender as "from", encrypted_envelope, category, suggested_action, created_at
       FROM ivy_emails
       WHERE is_read = 0 AND category != 'junk' AND created_at > ?
       ORDER BY
         CASE category
           WHEN 'important' THEN 1
           WHEN 'actionable' THEN 2
           WHEN 'fyi' THEN 3
           WHEN 'transactional' THEN 4
           WHEN 'social' THEN 5
           WHEN 'marketing' THEN 6
           ELSE 7
         END,
         created_at DESC
       LIMIT 100`
    : `SELECT id, original_sender as "from", encrypted_envelope, category, suggested_action, created_at
       FROM ivy_emails
       WHERE is_read = 0 AND category != 'junk'
       ORDER BY
         CASE category
           WHEN 'important' THEN 1
           WHEN 'actionable' THEN 2
           WHEN 'fyi' THEN 3
           WHEN 'transactional' THEN 4
           WHEN 'social' THEN 5
           WHEN 'marketing' THEN 6
           ELSE 7
         END,
         created_at DESC
       LIMIT 100`;

  const params = since ? [since] : [];
  const { results } = await db
    .prepare(query)
    .bind(...params)
    .all<{
      id: string;
      from: string | null;
      encrypted_envelope: string;
      category: EmailCategory;
      suggested_action: string;
      created_at: string;
    }>();

  // Extract subject and snippet from envelope
  return (results || []).map((row) => {
    let subject = "(no subject)";
    let snippet = "";
    let from = row.from || "unknown";

    try {
      const envelope = JSON.parse(row.encrypted_envelope);
      subject = envelope.subject || subject;
      snippet = envelope.snippet || "";
      if (!row.from && envelope.from) {
        from = envelope.from;
      }
    } catch {
      // Envelope may be encrypted or malformed — use what we have
    }

    return {
      id: row.id,
      from,
      subject,
      snippet,
      category: row.category,
      suggested_action: row.suggested_action,
      created_at: row.created_at,
    };
  });
}

// =============================================================================
// GENERATE DIGEST HTML
// =============================================================================

const DIGEST_SYSTEM_PROMPT = `You are a personal email briefing assistant. Write a concise, warm digest of these emails.

Format your response as a structured briefing:
- Group by priority (Important first, then Actionable, then FYI)
- For each email: one sentence summary with sender name
- End with a count of skipped low-priority items
- Keep the entire briefing under 500 words
- Write in a warm, conversational tone — like a helpful friend catching you up

Do NOT include any HTML tags. Use plain text with simple formatting:
- Use "##" for section headers
- Use "- " for bullet points
- Use blank lines between sections`;

function buildDigestPrompt(emails: DigestEmail[]): string {
  const grouped: Record<string, DigestEmail[]> = {};
  for (const email of emails) {
    if (!grouped[email.category]) grouped[email.category] = [];
    grouped[email.category].push(email);
  }

  const lines: string[] = [`${emails.length} unread emails to summarize:\n`];

  for (const [category, items] of Object.entries(grouped)) {
    lines.push(`[${category.toUpperCase()}] (${items.length} emails)`);
    for (const item of items.slice(0, 20)) {
      // Cap per category
      lines.push(`  From: ${item.from}`);
      lines.push(`  Subject: ${item.subject}`);
      if (item.snippet) {
        lines.push(
          `  Preview: ${item.snippet.slice(0, 150)}${item.snippet.length > 150 ? "..." : ""}`,
        );
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

/**
 * Generate a natural language digest briefing via Lumen.
 * Falls back to a structured list if Lumen is unavailable.
 */
export async function generateDigest(
  emails: DigestEmail[],
  lumen: LumenClient | null,
): Promise<string> {
  if (emails.length === 0) {
    return "No new emails since your last digest. Enjoy the quiet! 🌿";
  }

  // Try AI-generated summary
  if (lumen) {
    try {
      const response = await lumen.run({
        task: "summary" as const,
        input: [
          { role: "system", content: DIGEST_SYSTEM_PROMPT },
          { role: "user", content: buildDigestPrompt(emails) },
        ],
        options: {
          maxTokens: 800,
          temperature: 0.4,
          skipQuota: true,
          skipPiiScrub: true,
        },
      });

      return response.content;
    } catch (error) {
      console.error("[TriageDO/Digest] Lumen summary failed:", error);
      // Fall through to structured fallback
    }
  }

  // Fallback: structured list
  return buildStructuredFallback(emails);
}

function buildStructuredFallback(emails: DigestEmail[]): string {
  const grouped: Record<string, DigestEmail[]> = {};
  for (const email of emails) {
    if (!grouped[email.category]) grouped[email.category] = [];
    grouped[email.category].push(email);
  }

  const sections: string[] = [
    `Your Email Digest — ${emails.length} unread emails\n`,
  ];

  const categoryOrder: EmailCategory[] = [
    "important",
    "actionable",
    "fyi",
    "transactional",
    "social",
    "marketing",
    "uncategorized",
  ];

  const categoryEmoji: Record<string, string> = {
    important: "🔴",
    actionable: "🟠",
    fyi: "🔵",
    transactional: "⚪",
    social: "💬",
    marketing: "📢",
    uncategorized: "❓",
  };

  for (const cat of categoryOrder) {
    const items = grouped[cat];
    if (!items || items.length === 0) continue;

    sections.push(
      `${categoryEmoji[cat] || "•"} ${cat.charAt(0).toUpperCase() + cat.slice(1)} (${items.length})`,
    );
    for (const item of items.slice(0, 10)) {
      sections.push(`  • ${item.from}: ${item.subject}`);
    }
    if (items.length > 10) {
      sections.push(`  ... and ${items.length - 10} more`);
    }
    sections.push("");
  }

  return sections.join("\n");
}

// =============================================================================
// RENDER DIGEST HTML
// =============================================================================

/**
 * Wrap the plain-text digest content in a simple HTML email template.
 */
export function renderDigestHtml(content: string, emailCount: number): string {
  // Convert markdown-ish text to HTML
  const htmlContent = content
    .split("\n")
    .map((line) => {
      if (line.startsWith("## "))
        return `<h3 style="color: #16a34a; margin: 16px 0 8px;">${escapeHtml(line.slice(3))}</h3>`;
      if (line.startsWith("- ") || line.startsWith("  • "))
        return `<li style="margin: 4px 0;">${escapeHtml(line.replace(/^[-•]\s*/, "").trim())}</li>`;
      if (line.startsWith("  ..."))
        return `<p style="color: #888; font-style: italic; margin: 4px 0 12px 16px;">${escapeHtml(line.trim())}</p>`;
      if (line.trim() === "") return "<br>";
      return `<p style="margin: 4px 0;">${escapeHtml(line)}</p>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fefdf8; color: #333;">
  <div style="border-bottom: 2px solid #16a34a; padding-bottom: 12px; margin-bottom: 20px;">
    <h2 style="color: #16a34a; margin: 0;">🌿 Ivy Digest</h2>
    <p style="color: #888; margin: 4px 0 0;">${emailCount} email${emailCount !== 1 ? "s" : ""} · ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
  </div>
  <div>${htmlContent}</div>
  <div style="border-top: 1px solid #e5e5e5; margin-top: 24px; padding-top: 12px; color: #999; font-size: 12px;">
    <p>Sent by Ivy · <a href="https://ivy.grove.place/inbox" style="color: #16a34a;">Open inbox</a></p>
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// =============================================================================
// SEND DIGEST VIA ZEPHYR
// =============================================================================

/**
 * Deliver a rendered digest email via Zephyr service binding.
 */
export async function sendDigest(
  html: string,
  recipient: string,
  emailCount: number,
  zephyr: ZephyrBinding,
  apiKey: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await zephyr.fetch("https://zephyr.internal/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        type: "transactional",
        template: "raw",
        to: recipient,
        subject: `🌿 Ivy Digest — ${emailCount} email${emailCount !== 1 ? "s" : ""}`,
        html,
        from: "ivy@grove.place",
        fromName: "Ivy Digest",
      }),
    });

    const result = (await response.json()) as {
      success: boolean;
      messageId?: string;
      errorMessage?: string;
    };

    if (!result.success) {
      return {
        success: false,
        error: result.errorMessage || `HTTP ${response.status}`,
      };
    }

    return { success: true, messageId: result.messageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Network error: ${message}` };
  }
}

// =============================================================================
// ALARM SCHEDULING
// =============================================================================

/**
 * Calculate the next alarm time based on configured digest times.
 *
 * @param times - Array of "HH:MM" strings (e.g., ["08:00", "13:00", "18:00"])
 * @param timezone - IANA timezone (e.g., "America/New_York")
 * @param now - Current time in milliseconds
 * @returns Next alarm timestamp in milliseconds, or null if no times configured
 */
export function calculateNextAlarm(
  times: string[],
  timezone: string,
  now: number = Date.now(),
): number | null {
  if (!times || times.length === 0) return null;

  const nowDate = new Date(now);

  // Get current time in the target timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(nowDate);
  const currentHour = parseInt(
    parts.find((p) => p.type === "hour")?.value || "0",
  );
  const currentMinute = parseInt(
    parts.find((p) => p.type === "minute")?.value || "0",
  );
  const currentMinutes = currentHour * 60 + currentMinute;

  // Parse all configured times into minutes-since-midnight
  const timeMinutes = times
    .map((t) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + (m || 0);
    })
    .sort((a, b) => a - b);

  // Find the next time that hasn't passed yet today
  let targetMinutes = timeMinutes.find((t) => t > currentMinutes + 1); // +1 min buffer

  let daysToAdd = 0;
  if (targetMinutes === undefined) {
    // All times passed today — use first time tomorrow
    targetMinutes = timeMinutes[0];
    daysToAdd = 1;
  }

  // Calculate the target Date in the timezone
  const targetHour = Math.floor(targetMinutes / 60);
  const targetMinute = targetMinutes % 60;

  // Build a date string in the target timezone, then convert back to UTC
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;

  // Create date in UTC first, then adjust for timezone offset
  const targetLocal = new Date(
    `${year}-${month}-${String(parseInt(day!) + daysToAdd).padStart(2, "0")}T${String(targetHour).padStart(2, "0")}:${String(targetMinute).padStart(2, "0")}:00`,
  );

  // Calculate timezone offset by comparing local representation
  const utcEquivalent = new Date(
    targetLocal.toLocaleString("en-US", { timeZone: "UTC" }),
  );
  const tzEquivalent = new Date(
    targetLocal.toLocaleString("en-US", { timeZone: timezone }),
  );
  const offsetMs = utcEquivalent.getTime() - tzEquivalent.getTime();

  return targetLocal.getTime() + offsetMs;
}

/**
 * Get category counts from a list of digest emails.
 */
export function getCategoryCounts(
  emails: DigestEmail[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const email of emails) {
    counts[email.category] = (counts[email.category] || 0) + 1;
  }
  return counts;
}
