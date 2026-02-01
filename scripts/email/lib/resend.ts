/**
 * Resend API Utilities for Broadcast System
 *
 * Wraps the Resend API for contacts and broadcasts.
 */

import type {
  ResendContact,
  ResendContactsResponse,
  ResendBroadcast,
  ResendBroadcastsResponse,
  CreateBroadcastParams,
  SyncResult,
  UnsubscribeSyncResult,
} from "./types";
import { getActiveSubscribers, deleteSubscriber, subscriberExists } from "./d1";

const RESEND_API_BASE = "https://api.resend.com";

function getApiKey(): string {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("RESEND_API_KEY environment variable is required");
  }
  return key;
}

function getAudienceId(): string {
  const id = process.env.RESEND_AUDIENCE_ID;
  if (!id) {
    throw new Error("RESEND_AUDIENCE_ID environment variable is required");
  }
  return id;
}

async function resendFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${RESEND_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error (${response.status}): ${error}`);
  }

  return response.json() as Promise<T>;
}

// =============================================================================
// CONTACTS API
// =============================================================================

/**
 * List all contacts in the Grove audience, handling pagination
 */
export async function listAllContacts(): Promise<ResendContact[]> {
  const audienceId = getAudienceId();
  const contacts: ResendContact[] = [];
  let hasMore = true;
  let afterId: string | undefined;

  while (hasMore) {
    const params = new URLSearchParams({ limit: "100" });
    if (afterId) {
      params.set("after", afterId);
    }

    const response = await resendFetch<ResendContactsResponse>(
      `/audiences/${audienceId}/contacts?${params.toString()}`,
    );

    contacts.push(...response.data);
    hasMore = response.has_more;

    if (response.data.length > 0) {
      afterId = response.data[response.data.length - 1].id;
    } else {
      hasMore = false;
    }
  }

  return contacts;
}

/**
 * Create a contact in the Grove audience
 */
export async function createContact(
  email: string,
  firstName?: string | null,
): Promise<{ id: string } | null> {
  const audienceId = getAudienceId();

  try {
    const body: Record<string, unknown> = { email };
    if (firstName) {
      body.first_name = firstName;
    }

    const response = await resendFetch<{ object: string; id: string }>(
      `/audiences/${audienceId}/contacts`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );

    return { id: response.id };
  } catch (error) {
    // Contact might already exist - that's okay
    if (error instanceof Error && error.message.includes("already exists")) {
      return null;
    }
    throw error;
  }
}

/**
 * Delete a contact from Resend by email
 */
export async function deleteContact(email: string): Promise<boolean> {
  const audienceId = getAudienceId();

  try {
    await resendFetch<{ deleted: boolean }>(
      `/audiences/${audienceId}/contacts/${encodeURIComponent(email)}`,
      { method: "DELETE" },
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Sync D1 subscribers to Resend Audience
 * One-way push: D1 → Resend
 */
export async function syncSubscribersToResend(): Promise<SyncResult> {
  const subscribers = await getActiveSubscribers();
  const result: SyncResult = { added: 0, skipped: 0, errors: [] };

  console.log(
    `\n📧 Syncing ${subscribers.length} active subscribers to Resend...\n`,
  );

  for (const sub of subscribers) {
    try {
      const created = await createContact(sub.email, sub.name);
      if (created) {
        result.added++;
        console.log(`  ✓ Added: ${sub.email}`);
      } else {
        result.skipped++;
        console.log(`  · Exists: ${sub.email}`);
      }
    } catch (error) {
      result.errors.push(`${sub.email}: ${error}`);
      console.log(`  ✗ Error: ${sub.email}`);
    }

    // Resend allows 2 requests/second, so wait 550ms between requests
    await new Promise((resolve) => setTimeout(resolve, 550));
  }

  return result;
}

/**
 * Sync unsubscribes from Resend back to D1
 * Deletes unsubscribed contacts from D1 entirely
 */
export async function syncUnsubscribesToD1(): Promise<UnsubscribeSyncResult> {
  const contacts = await listAllContacts();
  const result: UnsubscribeSyncResult = { deleted: 0, errors: [] };

  const unsubscribed = contacts.filter((c) => c.unsubscribed);

  if (unsubscribed.length === 0) {
    console.log("\n✓ No unsubscribed contacts to sync\n");
    return result;
  }

  console.log(
    `\n🗑️  Found ${unsubscribed.length} unsubscribed contact(s) in Resend\n`,
  );

  for (const contact of unsubscribed) {
    try {
      // Check if they exist in D1 first
      const exists = await subscriberExists(contact.email);

      if (exists) {
        // Delete from D1 (full deletion per user request)
        const deleted = await deleteSubscriber(contact.email);
        if (deleted) {
          result.deleted++;
          console.log(`  ✓ Deleted from D1: ${contact.email}`);
        } else {
          result.errors.push(`${contact.email}: Failed to delete from D1`);
          console.log(`  ✗ Failed to delete: ${contact.email}`);
        }
      } else {
        console.log(`  · Not in D1: ${contact.email}`);
      }

      // Also remove from Resend audience (they unsubscribed, clean them out)
      await deleteContact(contact.email);
    } catch (error) {
      result.errors.push(`${contact.email}: ${error}`);
      console.log(`  ✗ Error: ${contact.email}`);
    }
  }

  return result;
}

// =============================================================================
// BROADCASTS API
// =============================================================================

/**
 * List all broadcasts
 */
export async function listBroadcasts(
  limit: number = 20,
): Promise<ResendBroadcast[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  const response = await resendFetch<ResendBroadcastsResponse>(
    `/broadcasts?${params.toString()}`,
  );
  return response.data;
}

/**
 * Get a single broadcast by ID
 */
export async function getBroadcast(id: string): Promise<ResendBroadcast> {
  return resendFetch<ResendBroadcast>(`/broadcasts/${id}`);
}

/**
 * Create a new broadcast (draft)
 */
export async function createBroadcast(
  params: CreateBroadcastParams,
): Promise<{ id: string }> {
  const body = {
    segment_id: params.segmentId,
    from: params.from,
    subject: params.subject,
    html: params.html,
    text: params.text,
    name: params.name,
    reply_to: params.replyTo,
  };

  return resendFetch<{ id: string }>("/broadcasts", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * Send a broadcast
 */
export async function sendBroadcast(
  id: string,
  scheduledAt?: string,
): Promise<{ id: string }> {
  const body: Record<string, unknown> = {};
  if (scheduledAt) {
    body.scheduled_at = scheduledAt;
  }

  return resendFetch<{ id: string }>(`/broadcasts/${id}/send`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
