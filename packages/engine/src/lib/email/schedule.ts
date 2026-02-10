/**
 * Email Scheduling via Zephyr
 *
 * Handles scheduling welcome sequences and individual emails
 * through the Zephyr email gateway, which passes through to
 * Resend's native `scheduled_at` parameter.
 *
 * @example
 * ```typescript
 * import { scheduleWelcomeSequence } from '@autumnsgrove/groveengine/email/schedule';
 *
 * await scheduleWelcomeSequence({
 *   email: 'wanderer@example.com',
 *   name: 'Wanderer',
 *   audienceType: 'rooted',
 *   zephyrApiKey: env.ZEPHYR_API_KEY,
 * });
 * ```
 */
import { ZephyrClient } from "$lib/zephyr/client.js";
import { GROVE_EMAILS } from "$lib/config/emails.js";
import { render } from "./render";
import { WelcomeEmail } from "./sequences/WelcomeEmail";
import { Day1Email } from "./sequences/Day1Email";
import { Day7Email } from "./sequences/Day7Email";
import { Day14Email } from "./sequences/Day14Email";
import { Day30Email } from "./sequences/Day30Email";
import { SEQUENCES, type AudienceType, type SendResult } from "./types";
import type { ReactElement } from "react";

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_FROM = GROVE_EMAILS.autumn.from;
const DEFAULT_ZEPHYR_URL = "https://grove-zephyr.m7jv4v7npb.workers.dev";

/**
 * Template component map for dynamic rendering
 */
const TEMPLATE_MAP: Record<string, (props: TemplateProps) => ReactElement> = {
  WelcomeEmail: (props) => WelcomeEmail(props as any),
  Day1Email: (props) => Day1Email(props as any),
  Day7Email: (props) => Day7Email(props as any),
  Day14Email: (props) => Day14Email(props as any),
  Day30Email: (props) => Day30Email(props as any),
};

interface TemplateProps {
  name?: string;
  audienceType: AudienceType;
}

// =============================================================================
// Schedule Welcome Sequence
// =============================================================================

export interface ScheduleSequenceOptions {
  /** Recipient email address */
  email: string;
  /** Recipient name (optional, for personalization) */
  name?: string;
  /** Which audience segment this user belongs to */
  audienceType: AudienceType;
  /** Zephyr API key */
  zephyrApiKey: string;
  /** Zephyr URL (optional, uses default if not provided) */
  zephyrUrl?: string;
  /** Custom from address (defaults to Autumn) */
  from?: string;
  /** Base URL for links (defaults to grove.place) */
  baseUrl?: string;
}

export interface ScheduleSequenceResult {
  success: boolean;
  scheduled: number;
  errors: string[];
  messageIds: string[];
}

/**
 * Schedule a complete welcome sequence for a new signup
 *
 * Uses Zephyr to queue all emails at once, with Resend's
 * native `scheduled_at` for delayed delivery.
 *
 * @example
 * ```typescript
 * const result = await scheduleWelcomeSequence({
 *   email: 'new-user@example.com',
 *   name: 'Wanderer',
 *   audienceType: 'rooted',
 *   zephyrApiKey: env.ZEPHYR_API_KEY,
 * });
 *
 * if (result.success) {
 *   console.log(`Scheduled ${result.scheduled} emails`);
 * }
 * ```
 */
export async function scheduleWelcomeSequence(
  options: ScheduleSequenceOptions,
): Promise<ScheduleSequenceResult> {
  const {
    email,
    name,
    audienceType,
    zephyrApiKey,
    zephyrUrl,
    from = DEFAULT_FROM,
  } = options;

  const zephyr = new ZephyrClient({
    baseUrl: zephyrUrl || DEFAULT_ZEPHYR_URL,
    apiKey: zephyrApiKey,
  });

  const sequence = SEQUENCES[audienceType];
  const now = new Date();

  // Generate idempotency key base from email + timestamp to prevent duplicate sequences
  const idempotencyBase = `${email}:${now.toISOString().split("T")[0]}`;

  const result: ScheduleSequenceResult = {
    success: true,
    scheduled: 0,
    errors: [],
    messageIds: [],
  };

  for (const { dayOffset, template, subject } of sequence) {
    try {
      // Get the template component
      const Template = TEMPLATE_MAP[template];
      if (!Template) {
        result.errors.push(`Unknown template: ${template}`);
        continue;
      }

      // Render the email
      const { html, text } = await render(Template({ name, audienceType }), {
        plainText: true,
      });

      // Calculate scheduled time (undefined for immediate)
      const scheduledAt =
        dayOffset === 0 ? undefined : addDays(now, dayOffset).toISOString();

      // Send via Zephyr
      const response = await zephyr.send({
        type: "sequence",
        template: "raw",
        to: email,
        subject,
        html,
        text,
        from,
        scheduledAt,
        idempotencyKey: `${idempotencyBase}:day${dayOffset}`,
      });

      if (!response.success) {
        result.errors.push(
          `Day ${dayOffset}: ${response.errorMessage || "Unknown error"}`,
        );
        result.success = false;
      } else if (response.messageId) {
        result.messageIds.push(response.messageId);
        result.scheduled++;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(`Day ${dayOffset}: ${message}`);
      result.success = false;
    }
  }

  return result;
}

// =============================================================================
// Send Single Email
// =============================================================================

export interface SendEmailOptions {
  /** Recipient email address */
  email: string;
  /** Email subject line */
  subject: string;
  /** Rendered HTML content */
  html: string;
  /** Plain text version (optional) */
  text?: string;
  /** Zephyr API key */
  zephyrApiKey: string;
  /** Zephyr URL (optional, uses default if not provided) */
  zephyrUrl?: string;
  /** Custom from address */
  from?: string;
  /** Schedule for later (ISO timestamp) */
  scheduledAt?: string;
  /** Idempotency key to prevent duplicates */
  idempotencyKey?: string;
}

/**
 * Send a single email via Zephyr
 *
 * Lower-level function for sending individual emails.
 * Use scheduleWelcomeSequence for automated sequences.
 */
export async function sendEmail(
  options: SendEmailOptions,
): Promise<SendResult> {
  const {
    email,
    subject,
    html,
    text,
    zephyrApiKey,
    zephyrUrl,
    from = DEFAULT_FROM,
    scheduledAt,
    idempotencyKey,
  } = options;

  const zephyr = new ZephyrClient({
    baseUrl: zephyrUrl || DEFAULT_ZEPHYR_URL,
    apiKey: zephyrApiKey,
  });

  const response = await zephyr.send({
    type: "sequence",
    template: "raw",
    to: email,
    subject,
    html,
    text,
    from,
    scheduledAt,
    idempotencyKey,
  });

  if (!response.success) {
    return {
      success: false,
      error: response.errorMessage || "Failed to send email",
    };
  }

  return {
    success: true,
    messageId: response.messageId,
  };
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Add days to a date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Calculate the next sequence stage based on current stage
 */
export function getNextStage(
  currentStage: number,
  audienceType: AudienceType,
): number {
  const sequence = SEQUENCES[audienceType];
  const stages = sequence.map((s) => s.dayOffset);

  // Find the next stage after current
  const nextStage = stages.find((s) => s > currentStage);

  // Return next stage or -1 if sequence complete
  return nextStage ?? -1;
}

/**
 * Check if a user should receive their next email
 *
 * @param lastEmailAt - ISO timestamp of last email sent
 * @param currentStage - Current sequence stage
 * @param audienceType - User's audience type
 * @returns True if enough time has passed for next email
 */
export function shouldSendNextEmail(
  lastEmailAt: string | null,
  currentStage: number,
  audienceType: AudienceType,
): boolean {
  // Sequence complete
  if (currentStage === -1) return false;

  // Never received an email
  if (!lastEmailAt) return true;

  const sequence = SEQUENCES[audienceType];
  const currentIndex = sequence.findIndex((s) => s.dayOffset === currentStage);
  const nextEmail = sequence[currentIndex + 1];

  // No more emails in sequence
  if (!nextEmail) return false;

  // Calculate days since last email
  const lastSent = new Date(lastEmailAt);
  const now = new Date();
  const daysSince = Math.floor(
    (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Should send if enough days have passed
  const daysNeeded = nextEmail.dayOffset - currentStage;
  return daysSince >= daysNeeded;
}
