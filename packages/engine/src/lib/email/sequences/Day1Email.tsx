/**
 * Day1Email - First follow-up (Day 1)
 *
 * Sent one day after signup to trial and rooted users.
 * Provides a quick tip to help them get started.
 */
import * as React from "react";
import { GroveEmail } from "../components/GroveEmail";
import { GroveButton } from "../components/GroveButton";
import {
  GroveHeading,
  GroveParagraph,
  GroveList,
} from "../components/GroveText";
import { GroveHighlight } from "../components/GroveHighlight";
import type { AudienceType } from "../types";

export interface Day1EmailProps {
  name?: string;
  audienceType: Extract<AudienceType, "trial" | "rooted">;
}

const CONTENT = {
  trial: {
    subject: "Quick tip: your first post",
    heading: "Your first post doesn't need to be perfect",
    intro: `I know the blank page can feel intimidating. Here's a secret: your first post doesn't need to be a masterpiece. It just needs to exist.`,
    tips: [
      "Write about why you started this blog",
      "Share something you learned recently",
      "Post a photo you love and tell its story",
      "Just say hello and introduce yourself",
    ],
    closing: `The hardest part is hitting publish. Everything after that gets easier.`,
    cta: "Write your first post",
    ctaUrl: "https://grove.place/dashboard/posts/new",
  },
  rooted: {
    subject: "Getting started guide",
    heading: "A few things to help you settle in",
    intro: `Now that you're rooted, I wanted to share a few things that might help you make the most of your space.`,
    tips: [
      "Customize your theme in Settings → Appearance",
      "Add a bio so visitors know who you are",
      "Set up your custom domain (if you have one)",
      "Check out the patch notes to see what's new",
    ],
    closing: `If you ever get stuck or have questions, just reply to this email. I read every message.`,
    cta: "Explore your settings",
    ctaUrl: "https://grove.place/dashboard/settings",
  },
};

export function Day1Email({ name, audienceType }: Day1EmailProps) {
  const content = CONTENT[audienceType];
  const previewText = content.intro.slice(0, 100);

  return (
    <GroveEmail previewText={previewText}>
      <GroveHeading>{content.heading}</GroveHeading>

      {name && <GroveParagraph>Hey {name},</GroveParagraph>}

      <GroveParagraph>{content.intro}</GroveParagraph>

      <GroveHighlight variant="tip" icon="✨">
        <GroveList items={content.tips} variant="check" />
      </GroveHighlight>

      <GroveParagraph>{content.closing}</GroveParagraph>

      <GroveButton href={content.ctaUrl}>{content.cta}</GroveButton>
    </GroveEmail>
  );
}

export default Day1Email;
