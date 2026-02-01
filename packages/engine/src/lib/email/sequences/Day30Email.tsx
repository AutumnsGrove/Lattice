/**
 * Day30Email - One month follow-up (Day 30)
 *
 * Sent one month after signup to waitlist and trial users.
 * Waitlist: gentle check-in. Trial: last chance to subscribe.
 */
import * as React from "react";
import { GroveEmail } from "../components/GroveEmail";
import { GroveButton } from "../components/GroveButton";
import { GroveHeading, GroveParagraph } from "../components/GroveText";
import { GroveHighlight } from "../components/GroveHighlight";
import { GroveDivider } from "../components/GroveDivider";
import type { AudienceType } from "../types";

export interface Day30EmailProps {
  name?: string;
  audienceType: Extract<AudienceType, "waitlist" | "trial">;
}

const CONTENT = {
  waitlist: {
    subject: "A quick check-in",
    heading: "Still there? 👋",
    paragraphs: [
      `It's been a month since you signed up for the Grove waitlist. I wanted to check in and see if you're still interested.`,
      `We've been making steady progress. The platform is taking shape, and we're getting closer to opening our doors.`,
      `If you're still curious about Grove, wonderful—you'll be among the first to know when we launch.`,
    ],
    closing: `If your priorities have shifted or this isn't for you anymore, no hard feelings. You can unsubscribe anytime using the link below.`,
    note: `Either way, thank you for giving Grove a moment of your attention. It meant something.`,
    cta: "Stay on the waitlist",
    ctaUrl: "https://grove.place",
  },
  trial: {
    subject: "Last chance to take root",
    heading: "Your trial is ending soon",
    paragraphs: [
      `A month ago, you planted something in Grove. Your trial period is coming to an end.`,
      `I hope you've had a chance to explore and maybe even publish a post or two. If Grove feels like home, I'd love to have you stay.`,
    ],
    offer: `Your EARLYBIRD code (20% off your first year) is still valid—but not for much longer.`,
    closing: `If now isn't the right time, I understand. Your content isn't going anywhere, and you can always come back later.`,
    note: `Thank you for trying Grove. Whatever you decide, I hope you keep writing somewhere.`,
    cta: "Choose a plan",
    ctaUrl: "https://grove.place/pricing",
  },
};

export function Day30Email({ name, audienceType }: Day30EmailProps) {
  const content = CONTENT[audienceType];
  const previewText = content.paragraphs[0].slice(0, 100);

  return (
    <GroveEmail previewText={previewText}>
      <GroveHeading>{content.heading}</GroveHeading>

      {name && <GroveParagraph>Hey {name},</GroveParagraph>}

      {content.paragraphs.map((p, i) => (
        <GroveParagraph key={i}>{p}</GroveParagraph>
      ))}

      {"offer" in content && (
        <GroveHighlight variant="special" icon="⏰">
          <GroveParagraph>{content.offer}</GroveParagraph>
        </GroveHighlight>
      )}

      <GroveParagraph>{content.closing}</GroveParagraph>

      <GroveDivider withLeaf spacing="md" />

      <GroveParagraph muted>{content.note}</GroveParagraph>

      <GroveButton href={content.ctaUrl}>{content.cta}</GroveButton>
    </GroveEmail>
  );
}

export default Day30Email;
