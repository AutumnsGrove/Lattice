/**
 * Email Catch-up Worker
 *
 * Weekly cron that handles edge cases in email delivery:
 * 1. Find users who should have received emails but didn't
 * 2. Sync unsubscribes from Resend back to D1
 * 3. Mark completed sequences
 *
 * This is a safety net for the primary scheduling system
 * (which schedules all emails at signup time via Resend's scheduled_at).
 *
 * Deploy: wrangler deploy
 * Logs: wrangler tail
 */

import { Resend } from "resend";

// =============================================================================
// Types
// =============================================================================

interface Env {
  DB: D1Database;
  RESEND_API_KEY: string;
  /** URL for the email-render worker */
  EMAIL_RENDER_URL: string;
}

type AudienceType = "wanderer" | "promo" | "rooted";

interface EmailSignup {
  id: number;
  email: string;
  name: string | null;
  created_at: string;
  audience_type: AudienceType;
  sequence_stage: number;
  last_email_at: string | null;
}

/**
 * Sequence definitions by audience type
 * Must match packages/engine/src/lib/email/types.ts
 */
const SEQUENCES: Record<
  AudienceType,
  { dayOffset: number; subject: string }[]
> = {
  wanderer: [
    { dayOffset: 0, subject: "Welcome to the Grove 🌿" },
    { dayOffset: 7, subject: "What makes Grove different" },
    { dayOffset: 14, subject: "Why Grove exists" },
    { dayOffset: 30, subject: "Still there? 👋" },
  ],
  promo: [
    { dayOffset: 0, subject: "You found Grove 🌱" },
    { dayOffset: 7, subject: "Still thinking about it?" },
  ],
  rooted: [
    { dayOffset: 0, subject: "Welcome home 🏡" },
    { dayOffset: 1, subject: "Making it yours" },
    { dayOffset: 7, subject: "The blank page" },
  ],
};

/**
 * Template names matching the sequence
 */
const TEMPLATE_MAP: Record<number, string> = {
  0: "WelcomeEmail",
  1: "Day1Email",
  7: "Day7Email",
  14: "Day14Email",
  30: "Day30Email",
};

// =============================================================================
// Main Handler
// =============================================================================

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    console.log("📧 Email catch-up cron starting...");

    // Validate required environment variables
    if (!env.EMAIL_RENDER_URL) {
      console.error(
        "📧 EMAIL_RENDER_URL not configured. Set it in wrangler.toml or via wrangler secret.",
      );
      return { error: "EMAIL_RENDER_URL not configured" };
    }

    if (!env.RESEND_API_KEY) {
      console.error(
        "📧 RESEND_API_KEY not configured. Run: wrangler secret put RESEND_API_KEY",
      );
      return { error: "RESEND_API_KEY not configured" };
    }

    const results = {
      overdueFound: 0,
      emailsSent: 0,
      unsubscribesSynced: 0,
      sequencesCompleted: 0,
      errors: [] as string[],
    };

    try {
      // 1. Find and send overdue emails
      const overdueResult = await processOverdueEmails(env);
      results.overdueFound = overdueResult.found;
      results.emailsSent = overdueResult.sent;
      results.errors.push(...overdueResult.errors);

      // 2. Sync unsubscribes from Resend
      const unsubResult = await syncUnsubscribes(env);
      results.unsubscribesSynced = unsubResult.synced;
      results.errors.push(...unsubResult.errors);

      // 3. Mark completed sequences
      const completeResult = await markCompletedSequences(env);
      results.sequencesCompleted = completeResult.completed;

      console.log("📧 Email catch-up complete:", results);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("📧 Email catch-up failed:", message);
      results.errors.push(message);
    }

    return results;
  },
};

// =============================================================================
// Process Overdue Emails
// =============================================================================

async function processOverdueEmails(env: Env) {
  const result = { found: 0, sent: 0, errors: [] as string[] };

  // Find users who are overdue for their next email
  // This query finds users where:
  // - sequence_stage >= 0 (not complete)
  // - enough time has passed since last_email_at for the next stage
  //
  // NOTE: The day offsets here (+2 days, +7 days, etc.) must stay in sync
  // with the SEQUENCES constant defined at the top of this file.
  // Offsets include a 1-day buffer to account for scheduling delays.
  // Example: stage 0→1 is 1 day, so we check +2 days to allow buffer.
  const overdueUsers = await env.DB.prepare(
    `
		SELECT * FROM email_signups
		WHERE sequence_stage >= 0
		AND sequence_stage < 30
		AND onboarding_emails_unsubscribed = 0
		AND unsubscribed_at IS NULL
		AND (
			-- Never received an email (stuck at stage 0)
			(last_email_at IS NULL AND sequence_stage = 0 AND datetime(created_at, '+1 day') < datetime('now'))
			OR
			-- Overdue for next email based on current stage (offsets from SEQUENCES + 1 day buffer)
			(sequence_stage = 0 AND datetime(last_email_at, '+2 days') < datetime('now'))
			OR
			(sequence_stage = 1 AND datetime(last_email_at, '+7 days') < datetime('now'))
			OR
			(sequence_stage = 7 AND datetime(last_email_at, '+8 days') < datetime('now'))
			OR
			(sequence_stage = 14 AND datetime(last_email_at, '+17 days') < datetime('now'))
		)
		LIMIT 100
	`,
  ).all<EmailSignup>();

  result.found = overdueUsers.results?.length || 0;

  if (result.found === 0) {
    console.log("📧 No overdue emails found");
    return result;
  }

  console.log(`📧 Found ${result.found} overdue users`);

  const resend = new Resend(env.RESEND_API_KEY);
  const renderUrl = env.EMAIL_RENDER_URL;

  for (const user of overdueUsers.results || []) {
    try {
      // Determine next stage
      const nextStage = getNextStage(user.sequence_stage, user.audience_type);

      if (nextStage === -1) {
        // Sequence complete, just update the stage
        await env.DB.prepare(
          `UPDATE email_signups SET sequence_stage = -1 WHERE id = ?`,
        )
          .bind(user.id)
          .run();
        continue;
      }

      // Get the email content for this stage
      const emailContent = await renderEmail(renderUrl, {
        template: TEMPLATE_MAP[nextStage],
        audienceType: user.audience_type,
        name: user.name,
      });

      if (!emailContent) {
        console.log(
          `📧 Skipping Day ${nextStage} for ${user.email}: template not available`,
        );
        continue;
      }

      // Get the subject for this audience/stage
      const sequence = SEQUENCES[user.audience_type];
      const emailConfig = sequence.find((e) => e.dayOffset === nextStage);
      const subject = emailConfig?.subject || `Day ${nextStage} from Grove`;

      // Send via Resend
      const response = await resend.emails.send({
        from: "Autumn <autumn@grove.place>",
        to: user.email,
        subject,
        html: emailContent.html,
        text: emailContent.text,
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      console.log(
        `📧 Sent Day ${nextStage} catch-up to ${user.email} (${user.audience_type})`,
      );

      // Update the user's sequence stage and last_email_at
      await env.DB.prepare(
        `
				UPDATE email_signups
				SET sequence_stage = ?,
				    last_email_at = datetime('now')
				WHERE id = ?
			`,
      )
        .bind(nextStage, user.id)
        .run();

      result.sent++;

      // Rate limit: 100ms between sends
      await sleep(100);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(`User ${user.email}: ${message}`);
      console.error(`📧 Failed to send to ${user.email}:`, message);
    }
  }

  return result;
}

/**
 * Render an email template via the email-render worker
 *
 * Calls the grove-email-render worker to get
 * the HTML and text versions of an email template.
 */
async function renderEmail(
  renderUrl: string,
  params: {
    template: string;
    audienceType: AudienceType;
    name: string | null;
  },
): Promise<{ html: string; text: string } | null> {
  try {
    const response = await fetch(`${renderUrl}/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`📧 Render worker returned ${response.status}: ${error}`);
      return null;
    }

    return response.json();
  } catch (error) {
    console.error("📧 Failed to render email:", error);
    return null;
  }
}

// =============================================================================
// Sync Unsubscribes
// =============================================================================

async function syncUnsubscribes(env: Env) {
  const result = { synced: 0, errors: [] as string[] };

  try {
    const resend = new Resend(env.RESEND_API_KEY);

    // Get all contacts from Resend audience
    // Note: You'd need to configure your audience ID here
    // For now, we'll skip this step as it requires audience setup
    console.log("📧 Unsubscribe sync skipped (requires Resend audience setup)");

    // In production:
    // 1. List all contacts from Resend audience
    // 2. Find ones with unsubscribed = true
    // 3. Update D1: SET onboarding_emails_unsubscribed = 1
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.errors.push(`Unsubscribe sync: ${message}`);
  }

  return result;
}

// =============================================================================
// Mark Completed Sequences
// =============================================================================

async function markCompletedSequences(env: Env) {
  const result = { completed: 0 };

  // Find users who have received their last sequence email
  // and mark them as complete (stage = -1)

  // Wanderer: last email is day 30
  const wandererResult = await env.DB.prepare(
    `
		UPDATE email_signups
		SET sequence_stage = -1
		WHERE audience_type = 'wanderer'
		AND sequence_stage = 30
		AND last_email_at IS NOT NULL
		AND datetime(last_email_at, '+1 day') < datetime('now')
	`,
  ).run();

  // Promo: last email is day 7 (short sequence)
  const promoResult = await env.DB.prepare(
    `
		UPDATE email_signups
		SET sequence_stage = -1
		WHERE audience_type = 'promo'
		AND sequence_stage = 7
		AND last_email_at IS NOT NULL
		AND datetime(last_email_at, '+1 day') < datetime('now')
	`,
  ).run();

  // Rooted: last email is day 7
  const rootedResult = await env.DB.prepare(
    `
		UPDATE email_signups
		SET sequence_stage = -1
		WHERE audience_type = 'rooted'
		AND sequence_stage = 7
		AND last_email_at IS NOT NULL
		AND datetime(last_email_at, '+1 day') < datetime('now')
	`,
  ).run();

  result.completed =
    (wandererResult.meta?.changes || 0) +
    (promoResult.meta?.changes || 0) +
    (rootedResult.meta?.changes || 0);

  if (result.completed > 0) {
    console.log(`📧 Marked ${result.completed} sequences as complete`);
  }

  return result;
}

// =============================================================================
// Helpers
// =============================================================================

function getNextStage(
  currentStage: number,
  audienceType: AudienceType,
): number {
  const sequence = SEQUENCES[audienceType];
  const stages = sequence.map((s) => s.dayOffset);
  const nextStage = stages.find((s) => s > currentStage);
  return nextStage ?? -1;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
