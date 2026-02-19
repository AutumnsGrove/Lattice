/**
 * Day7Email - One week follow-up
 *
 * Sent one week after signup.
 * - Wanderer: What makes Grove different (the details)
 * - Promo: Gentle check-in, still interested?
 * - Rooted: Inspiration to write
 */
import * as React from "react";
import { GroveEmail } from "../components/GroveEmail";
import { GroveButton } from "../components/GroveButton";
import { GroveHeading, GroveParagraph } from "../components/GroveText";
import { GROVE_URLS } from "../urls";
import type { AudienceType } from "../types";

export interface Day7EmailProps {
  name?: string;
  audienceType: AudienceType;
}

const CONTENT = {
  wanderer: {
    subject: "What makes Grove different",
    preview: "No algorithms. No tracking. Just writing.",
    paragraphs: [
      `A week ago, you found your way here. I wanted to share more about how Grove actually works.`,
      `Most platforms track everything. How long you look at posts. What you almost clicked. What made you stop scrolling. They feed that into algorithms that predict what will keep you engaged longest. Engagement means ads. Ads mean revenue.`,
      `Grove works differently.`,
      `**No tracking.** I don't measure your scroll behavior or dwell time. Your attention isn't a dataset.`,
      `**No algorithm.** Posts appear chronologically from people you follow. That's it. No "recommended for you." No controversy amplification.`,
      `**No infinite scroll.** When you've read everything new, you're done. The feed ends.`,
      `**No AI scraping.** Shade keeps crawlers out. Eight layers of protection. Your words stay yours.`,
      `I charge for the service instead of selling your attention. You're the customer.`,
    ],
    cta: null,
    ctaUrl: null,
  },
  promo: {
    subject: "Still thinking about it?",
    preview: "No pressure. Just checking in.",
    paragraphs: [
      `A week ago, you found your way to Plant.`,
      `No pressure. Just wanted to check in.`,
      `If you have questions about how Grove works, or what it would look like to have your own space here, just reply to this email. I read everything.`,
      `If now isn't the right time, that's okay too. The grove isn't going anywhere.`,
    ],
    cta: null,
    ctaUrl: null,
  },
  rooted: {
    subject: "The blank page",
    preview: "It's not as scary as it looks.",
    paragraphs: [
      `A week ago, you planted your grove.`,
      `Have you written anything yet?`,
      `The blank page can feel intimidating. Here's the thing: your first post doesn't need to be good. It just needs to exist.`,
      `Write about why you started. Share something you learned recently. Post a photo and tell its story. Just say hello.`,
      `The hardest part is hitting publish. Everything after that gets easier.`,
      `Your space is waiting.`,
    ],
    cta: "Write something",
    ctaUrl: GROVE_URLS.NEW_POST,
  },
};

export function Day7Email({ name, audienceType }: Day7EmailProps) {
  const content = CONTENT[audienceType];
  const greeting = name ? `Hey ${name},` : null;

  return (
    <GroveEmail previewText={content.preview}>
      {greeting && <GroveParagraph>{greeting}</GroveParagraph>}

      {content.paragraphs.map((paragraph, i) => (
        <GroveParagraph key={i}>{paragraph}</GroveParagraph>
      ))}

      {content.cta && content.ctaUrl && (
        <GroveButton href={content.ctaUrl}>{content.cta}</GroveButton>
      )}
    </GroveEmail>
  );
}

export default Day7Email;
