/**
 * Day1Email - First day follow-up
 *
 * Sent one day after signup.
 * Only for Rooted: Help them settle in, empower them to make it theirs
 */
import * as React from "react";
import { GroveEmail } from "../components/GroveEmail";
import { GroveButton } from "../components/GroveButton";
import { GroveParagraph, GroveList } from "../components/GroveText";
import { GROVE_URLS } from "../urls";
import type { AudienceType } from "../types";

export interface Day1EmailProps {
  name?: string;
  audienceType: Extract<AudienceType, "rooted">;
}

const CONTENT = {
  rooted: {
    subject: "Making it yours",
    preview: "A few things to help you settle in.",
    paragraphs: [
      `Now that you're here, I wanted to share a few things that might help you make your space feel like home.`,
    ],
    tips: [
      "Add a bio so visitors know who you are",
      "Pick a theme that feels right in Settings",
      "Set up your custom domain if you have one",
      "Write something. Anything. The first post is the hardest.",
    ],
    closing: `If you ever get stuck or have questions, just reply to this email. I read everything.`,
  },
};

export function Day1Email({ name, audienceType }: Day1EmailProps) {
  const content = CONTENT[audienceType];
  const greeting = name ? `Hey ${name},` : "Hey,";

  return (
    <GroveEmail previewText={content.preview}>
      <GroveParagraph>{greeting}</GroveParagraph>

      {content.paragraphs.map((paragraph, i) => (
        <GroveParagraph key={i}>{paragraph}</GroveParagraph>
      ))}

      <GroveList items={content.tips} variant="check" />

      <GroveParagraph>{content.closing}</GroveParagraph>

      <GroveButton href={GROVE_URLS.SETTINGS}>Go to settings</GroveButton>
    </GroveEmail>
  );
}

export default Day1Email;
