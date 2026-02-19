/**
 * RenewalThankYou - Subscription renewal confirmation
 *
 * Sent when a rooted user's subscription renews.
 * Simple, warm acknowledgment. No upsells, no gimmicks.
 */
import * as React from "react";
import { GroveEmail } from "../components/GroveEmail";
import { GroveParagraph } from "../components/GroveText";
import { GroveButton } from "../components/GroveButton";
import { GROVE_URLS } from "../urls";

export interface RenewalThankYouProps {
  name?: string;
  /** Next renewal date in readable format (e.g., "February 1, 2026") */
  nextRenewalDate?: string;
}

export function RenewalThankYou({
  name,
  nextRenewalDate,
}: RenewalThankYouProps) {
  const greeting = name ? `Hey ${name},` : "Hey,";

  return (
    <GroveEmail previewText="Thank you for staying rooted.">
      <GroveParagraph>{greeting}</GroveParagraph>

      <GroveParagraph>
        Your membership just renewed. Thank you for staying rooted.
      </GroveParagraph>

      <GroveParagraph>
        Your support keeps Grove independent. No investors, no ads, no data
        harvesting. Just this quiet corner of the internet, built for people who
        want to own their words.
      </GroveParagraph>

      {nextRenewalDate && (
        <GroveParagraph muted>Next renewal: {nextRenewalDate}</GroveParagraph>
      )}

      <GroveParagraph>
        If you ever have questions or need anything, just reply to this email.
      </GroveParagraph>

      <GroveButton href={GROVE_URLS.ARBOR_PANEL}>Visit your grove</GroveButton>
    </GroveEmail>
  );
}

export default RenewalThankYou;
