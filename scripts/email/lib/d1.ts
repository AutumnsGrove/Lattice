/**
 * D1 Database Utilities for Broadcast System
 *
 * Uses wrangler CLI to query the remote D1 database.
 */

import type { EmailSignup } from "./types";

const DATABASE_NAME = "grove-engine-db";

/**
 * Execute a D1 query and return raw JSON output
 */
async function executeD1Query(sql: string): Promise<string> {
  const proc = Bun.spawn(
    [
      "wrangler",
      "d1",
      "execute",
      DATABASE_NAME,
      "--remote",
      "--json",
      "--command",
      sql,
    ],
    {
      stdout: "pipe",
      stderr: "pipe",
    },
  );

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    throw new Error(`D1 query failed: ${stderr}`);
  }

  return stdout;
}

/**
 * Parse D1 JSON output to extract results
 */
function parseD1Results<T>(output: string): T[] {
  try {
    const parsed = JSON.parse(output);
    // D1 returns an array with one result object containing 'results'
    if (Array.isArray(parsed) && parsed[0]?.results) {
      return parsed[0].results as T[];
    }
    return [];
  } catch {
    throw new Error(`Failed to parse D1 output: ${output}`);
  }
}

/**
 * Get all active (non-unsubscribed) email signups
 */
export async function getActiveSubscribers(): Promise<EmailSignup[]> {
  const sql = `SELECT id, email, name, created_at, unsubscribed_at, source
               FROM email_signups
               WHERE unsubscribed_at IS NULL
               ORDER BY created_at DESC`;

  const output = await executeD1Query(sql);
  return parseD1Results<EmailSignup>(output);
}

/**
 * Get total subscriber count
 */
export async function getSubscriberCount(): Promise<{
  active: number;
  unsubscribed: number;
}> {
  const sql = `SELECT
                 SUM(CASE WHEN unsubscribed_at IS NULL THEN 1 ELSE 0 END) as active,
                 SUM(CASE WHEN unsubscribed_at IS NOT NULL THEN 1 ELSE 0 END) as unsubscribed
               FROM email_signups`;

  const output = await executeD1Query(sql);
  const results = parseD1Results<{ active: number; unsubscribed: number }>(
    output,
  );
  return results[0] || { active: 0, unsubscribed: 0 };
}

/**
 * Delete a subscriber by email (full deletion, not soft delete)
 * This is used when syncing unsubscribes from Resend back to D1
 */
export async function deleteSubscriber(email: string): Promise<boolean> {
  const escapedEmail = email.replace(/'/g, "''");
  const sql = `DELETE FROM email_signups WHERE LOWER(email) = LOWER('${escapedEmail}')`;

  try {
    await executeD1Query(sql);
    return true;
  } catch (error) {
    console.error(`Failed to delete ${email}:`, error);
    return false;
  }
}

/**
 * Check if a subscriber exists in D1
 */
export async function subscriberExists(email: string): Promise<boolean> {
  const escapedEmail = email.replace(/'/g, "''");
  const sql = `SELECT 1 FROM email_signups WHERE LOWER(email) = LOWER('${escapedEmail}') LIMIT 1`;

  const output = await executeD1Query(sql);
  const results = parseD1Results<{ 1: number }>(output);
  return results.length > 0;
}
