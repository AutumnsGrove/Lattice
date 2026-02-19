/**
 * Grove Email System Types
 *
 * Shared types for audience segmentation, sequences, and email tracking.
 */

// =============================================================================
// Audience Types
// =============================================================================

/**
 * User audience categories for email segmentation
 *
 * - wanderer: Signed up on landing page (grove.place), just curious
 * - promo: Signed up via Plant, showing intent but hasn't purchased
 * - rooted: Purchased a subscription, active member
 */
export type AudienceType = "wanderer" | "promo" | "rooted";

/**
 * Sequence stages representing which email in the sequence
 *
 * - 0: Welcome email (Day 0)
 * - 1: First follow-up (Day 1)
 * - 7: Week check-in (Day 7)
 * - 14: Two week follow-up (Day 14)
 * - 30: One month check-in (Day 30)
 * - -1: Sequence complete
 */
export type SequenceStage = 0 | 1 | 7 | 14 | 30 | -1;

// =============================================================================
// Email Signup Record
// =============================================================================

/**
 * Email signup record from D1 database
 */
export interface EmailSignup {
  id: number;
  email: string;
  name: string | null;
  created_at: string;
  confirmed_at: string | null;
  unsubscribed_at: string | null;
  source: string;

  // V2 audience segmentation
  audience_type: AudienceType;
  sequence_stage: SequenceStage;
  last_email_at: string | null;

  // Legacy fields (kept for backward compatibility)
  welcome_email_sent: number;
  day3_email_sent: number;
  day7_email_sent: number;
  day14_email_sent: number;
  onboarding_emails_unsubscribed: number;
}

// =============================================================================
// Sequence Configuration
// =============================================================================

/**
 * Configuration for a single email in a sequence
 */
export interface SequenceEmailConfig {
  /** Days after signup to send this email */
  dayOffset: number;
  /** Email subject line */
  subject: string;
  /** Template component name */
  template: string;
}

/**
 * Complete sequence configuration for an audience type
 */
export type SequenceConfig = {
  [K in AudienceType]: SequenceEmailConfig[];
};

/**
 * Default sequence configurations by audience type
 */
export const SEQUENCES: SequenceConfig = {
  wanderer: [
    {
      dayOffset: 0,
      template: "WelcomeEmail",
      subject: "Welcome to the Grove 🌿",
    },
    {
      dayOffset: 7,
      template: "Day7Email",
      subject: "What makes Grove different",
    },
    { dayOffset: 14, template: "Day14Email", subject: "Why Grove exists" },
    { dayOffset: 30, template: "Day30Email", subject: "Still there? 👋" },
  ],
  promo: [
    { dayOffset: 0, template: "WelcomeEmail", subject: "You found Grove 🌱" },
    {
      dayOffset: 7,
      template: "Day7Email",
      subject: "Still thinking about it?",
    },
    // Just 2 emails. Short. Honest. Done.
  ],
  rooted: [
    { dayOffset: 0, template: "WelcomeEmail", subject: "Welcome home 🏡" },
    { dayOffset: 1, template: "Day1Email", subject: "Making it yours" },
    { dayOffset: 7, template: "Day7Email", subject: "The blank page" },
    // Rooted users get ongoing patch notes instead of more sequence emails
  ],
};

// =============================================================================
// Scheduling
// =============================================================================

/**
 * Options for scheduling an email
 */
export interface ScheduleOptions {
  /** Send immediately if true, otherwise use scheduledAt */
  immediate?: boolean;
  /** ISO timestamp for scheduled delivery */
  scheduledAt?: string;
}

/**
 * Result from sending/scheduling an email
 */
export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}
