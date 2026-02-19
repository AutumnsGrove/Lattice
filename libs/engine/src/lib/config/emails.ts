/**
 * Operational Email Configuration
 *
 * All @grove.place email addresses used as senders or recipients,
 * with pre-formatted "From" strings for Resend/email APIs.
 *
 * Standalone workers (heartwood, clearing-monitor) keep their own
 * constants with a comment pointing here as the canonical source.
 */

export const GROVE_EMAILS = {
  /** Autumn's personal Grove email — feedback recipient, porch sender */
  autumn: {
    address: "autumn@grove.place",
    from: "Autumn <autumn@grove.place>",
  },

  /** General support — billing, account issues, public contact */
  support: {
    address: "hello@grove.place",
    from: "Grove <hello@grove.place>",
  },

  /** Authentication emails (verification, password reset) */
  auth: {
    address: "auth@grove.place",
    from: "GroveAuth <auth@grove.place>",
  },

  /** Feedback webhook recipient */
  feedback: {
    address: "feedback@grove.place",
    from: "Grove <feedback@grove.place>",
  },

  /** Porch (support conversations) */
  porch: {
    address: "porch@grove.place",
    fromSystem: "The Porch at Grove <porch@grove.place>",
    fromAutumn: "Autumn at Grove <porch@grove.place>",
  },

  /** Status page notifications */
  status: {
    address: "status@grove.place",
    from: "Grove Status <status@grove.place>",
  },

  /** Infrastructure alerts (clearing-monitor) */
  alerts: {
    address: "alerts@grove.place",
  },
} as const;

export type GroveEmailConfig = typeof GROVE_EMAILS;
