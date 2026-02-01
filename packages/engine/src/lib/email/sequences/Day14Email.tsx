/**
 * Day14Email - Two week follow-up (Day 14)
 *
 * Sent two weeks after signup to waitlist and trial users.
 * Waitlist: why Grove exists (mission). Trial: special offer to convert.
 */
import * as React from "react";
import { GroveEmail } from "../components/GroveEmail";
import { GroveButton } from "../components/GroveButton";
import { GroveHeading, GroveParagraph } from "../components/GroveText";
import { GroveHighlight } from "../components/GroveHighlight";
import type { AudienceType } from "../types";

export interface Day14EmailProps {
  name?: string;
  audienceType: Extract<AudienceType, "waitlist" | "trial">;
}

const CONTENT = {
  waitlist: {
    subject: "Why Grove exists",
    heading: "Why I'm building Grove",
    paragraphs: [
      `Two weeks ago, you joined our waitlist. I wanted to share something more personal: why I'm building this.`,
      `I've watched the internet change over the past decade. Social platforms that once felt like communities became engagement machines. Personal blogs gave way to algorithmic feeds. Our words became content to be optimized.`,
      `Grove is my small rebellion against that trajectory.`,
      `It's a place where you own your words. Where there's no algorithm deciding who sees them. Where the goal isn't engagement—it's expression.`,
      `I believe we need more quiet corners on the internet. Places that feel like home, not performance venues.`,
    ],
    closing: `Thank you for being curious about what we're building. It means more than you know.`,
    cta: "Read more about our philosophy",
    ctaUrl: "https://grove.place/about",
  },
  trial: {
    subject: "Something special for you",
    heading: "A little something for you 🎁",
    paragraphs: [
      `You've been exploring Grove for two weeks now. I hope it's starting to feel like home.`,
      `I wanted to reach out personally and see how things are going. Have you published anything yet? Run into any questions?`,
    ],
    offer: `As a thank you for trying Grove, I'd like to offer you 20% off your first year if you decide to take root. Just use code EARLYBIRD at checkout.`,
    closing: `No pressure—Grove will be here whenever you're ready. But I wanted you to know the offer's there.`,
    cta: "See pricing plans",
    ctaUrl: "https://grove.place/pricing",
  },
};

export function Day14Email({ name, audienceType }: Day14EmailProps) {
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
        <GroveHighlight variant="special" icon="🎁">
          <GroveParagraph>{content.offer}</GroveParagraph>
        </GroveHighlight>
      )}

      <GroveParagraph>{content.closing}</GroveParagraph>

      <GroveButton href={content.ctaUrl}>{content.cta}</GroveButton>
    </GroveEmail>
  );
}

export default Day14Email;
