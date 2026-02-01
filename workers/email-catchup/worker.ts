/**
 * Email Catch-up Worker
 *
 * Weekly cron that handles edge cases in email delivery:
 * 1. Find users who should have received emails but didn't
 * 2. Sync unsubscribes from Resend back to D1
 * 3. Mark completed sequences
 *
 * This is a safety net for the primary scheduling system
 * (which schedules all emails at signup time).
 */

import { Resend } from "resend";

// =============================================================================
// Types
// =============================================================================

interface Env {
  DB: D1Database;
  RESEND_API_KEY: string;
}

interface EmailSignup {
  id: number;
  email: string;
  name: string | null;
  created_at: string;
  audience_type: "waitlist" | "trial" | "rooted";
  sequence_stage: number;
  last_email_at: string | null;
}

// Sequence definitions (must match types.ts)
const SEQUENCES = {
  waitlist: [0, 7, 14, 30],
  trial: [0, 1, 7, 14, 30],
  rooted: [0, 1, 7],
};

// =============================================================================
// Main Handler
// =============================================================================

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    console.log("📧 Email catch-up cron starting...");

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
			-- Overdue for next email based on current stage
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

  for (const user of overdueUsers.results || []) {
    try {
      // Determine next stage
      const nextStage = getNextStage(user.sequence_stage, user.audience_type);

      if (nextStage === -1) {
        // Sequence complete, just update the stage
        await env.DB.prepare(
          `
					UPDATE email_signups
					SET sequence_stage = -1
					WHERE id = ?
				`,
        )
          .bind(user.id)
          .run();
        continue;
      }

      // Send the catch-up email
      // Note: In production, you'd render the actual template here
      // For now, we'll just log and update the database
      console.log(
        `📧 Would send Day ${nextStage} email to ${user.email} (${user.audience_type})`,
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
    }
  }

  return result;
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

  // Waitlist: last email is day 30
  const waitlistResult = await env.DB.prepare(
    `
		UPDATE email_signups
		SET sequence_stage = -1
		WHERE audience_type = 'waitlist'
		AND sequence_stage = 30
		AND last_email_at IS NOT NULL
		AND datetime(last_email_at, '+1 day') < datetime('now')
	`,
  ).run();

  // Trial: last email is day 30
  const trialResult = await env.DB.prepare(
    `
		UPDATE email_signups
		SET sequence_stage = -1
		WHERE audience_type = 'trial'
		AND sequence_stage = 30
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
    (waitlistResult.meta?.changes || 0) +
    (trialResult.meta?.changes || 0) +
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
  audienceType: "waitlist" | "trial" | "rooted",
): number {
  const stages = SEQUENCES[audienceType];
  const nextStage = stages.find((s) => s > currentStage);
  return nextStage ?? -1;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
