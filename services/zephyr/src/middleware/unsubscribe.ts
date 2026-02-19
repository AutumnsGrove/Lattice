/**
 * Unsubscribe Check Middleware
 *
 * Checks if a recipient has unsubscribed from emails.
 */

export interface UnsubscribeResult {
  unsubscribed: boolean;
  unsubscribedAt?: string;
}

/**
 * Check if an email address has unsubscribed
 *
 * Queries the email_signups table for the unsubscribed status.
 * In the future, this may also check a dedicated unsubscribes table.
 */
export async function checkUnsubscribed(
  db: D1Database,
  email: string,
): Promise<UnsubscribeResult> {
  try {
    // Check email_signups table
    const result = await db
      .prepare(
        `
        SELECT unsubscribed_at, onboarding_emails_unsubscribed
        FROM email_signups
        WHERE email = ?
        LIMIT 1
      `,
      )
      .bind(email)
      .first<{
        unsubscribed_at: string | null;
        onboarding_emails_unsubscribed: number;
      }>();

    if (result) {
      // Check if unsubscribed via either method
      if (
        result.unsubscribed_at ||
        result.onboarding_emails_unsubscribed === 1
      ) {
        return {
          unsubscribed: true,
          unsubscribedAt: result.unsubscribed_at || undefined,
        };
      }
    }

    // TODO: Check dedicated unsubscribes table when implemented
    // const unsubscribeResult = await db
    //   .prepare("SELECT unsubscribed_at FROM unsubscribes WHERE email = ?")
    //   .bind(email)
    //   .first<{ unsubscribed_at: string }>();
    //
    // if (unsubscribeResult) {
    //   return {
    //     unsubscribed: true,
    //     unsubscribedAt: unsubscribeResult.unsubscribed_at,
    //   };
    // }

    return { unsubscribed: false };
  } catch (error) {
    // Log error but don't block the request
    console.error("[Zephyr] Unsubscribe check failed:", error);
    // Fail open - allow the request if we can't check unsubscribe status
    return { unsubscribed: false };
  }
}
