/**
 * BetaInviteEmail - Invite email for beta testers and comped users
 *
 * Sent when the Wayfinder creates a comped/beta invite from the admin panel.
 * Content varies based on invite type:
 * - Beta: "Join the beta" tone, emphasizes feedback and early access
 * - Comped: "You've been invited" tone, emphasizes the gift
 *
 * Supports an optional custom message from the inviter, displayed
 * as a styled blockquote within the email.
 */
import * as React from "react";
import { Section, Text } from "@react-email/components";
import { GroveEmail } from "../components/GroveEmail";
import { GroveButton } from "../components/GroveButton";
import { GroveHeading, GroveParagraph } from "../components/GroveText";
import { GROVE_EMAIL_COLORS } from "../components/styles";

export interface BetaInviteEmailProps {
  name?: string;
  tier?: string;
  inviteType?: "beta" | "comped";
  customMessage?: string;
  inviteUrl?: string;
}

function displayTier(tier: string): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

const CONTENT = {
  beta: {
    subject: "You're invited to the Grove beta",
    preview:
      "A quiet corner of the internet, and we'd love you to try it first.",
    heading: "You're invited to the beta",
    intro:
      "We're building something different — a quiet corner of the internet where your words actually belong to you. No algorithms, no ads, no tracking.",
    middle: "We'd love for you to be one of the first to try it.",
    feedback:
      "As a beta tester, your feedback helps shape what Grove becomes. Every rough edge you find makes this place better for everyone who comes after.",
    cta: "Join the Beta",
  },
  comped: {
    subject: "You've been invited to Grove",
    preview: "Someone saved you a spot in the grove.",
    heading: "You've been invited",
    intro:
      "Someone believes you deserve your own corner of the internet — a quiet space where your words can grow without algorithms, ads, or tracking.",
    middle: "Your space is waiting whenever you're ready.",
    feedback: null,
    cta: "Claim Your Invite",
  },
};

export function BetaInviteEmail({
  name,
  tier = "seedling",
  inviteType = "beta",
  customMessage,
  inviteUrl = "https://plant.grove.place/invited",
}: BetaInviteEmailProps) {
  const content = CONTENT[inviteType] || CONTENT.beta;
  const tierName = displayTier(tier);
  const greeting = name ? `Hey ${name},` : "Hey,";

  return (
    <GroveEmail previewText={content.preview}>
      <GroveParagraph>{greeting}</GroveParagraph>
      <GroveParagraph>{content.intro}</GroveParagraph>

      {customMessage && (
        <Section style={styles.quoteSection}>
          <Text style={styles.quoteText}>"{customMessage}"</Text>
        </Section>
      )}

      <GroveParagraph>{content.middle}</GroveParagraph>

      <GroveParagraph>
        You're getting the{" "}
        <strong style={{ color: GROVE_EMAIL_COLORS.groveGreen }}>
          {tierName}
        </strong>{" "}
        plan, completely free.
      </GroveParagraph>

      {content.feedback && (
        <GroveParagraph muted>{content.feedback}</GroveParagraph>
      )}

      <GroveButton href={inviteUrl}>{content.cta}</GroveButton>

      <GroveParagraph muted>
        This link is just for you. Click it whenever you're ready — no rush.
      </GroveParagraph>
    </GroveEmail>
  );
}

const styles = {
  quoteSection: {
    margin: "8px 0 16px 0",
    padding: "16px 20px",
    borderLeft: `3px solid ${GROVE_EMAIL_COLORS.groveGreen}`,
    backgroundColor: "rgba(22, 163, 74, 0.05)",
    borderRadius: "0 8px 8px 0",
  },
  quoteText: {
    margin: 0,
    fontSize: "15px",
    lineHeight: 1.6,
    color: GROVE_EMAIL_COLORS.barkBrown,
    fontStyle: "italic" as const,
  },
};

export default BetaInviteEmail;
