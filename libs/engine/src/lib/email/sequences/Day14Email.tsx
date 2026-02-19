/**
 * Day14Email - Two week follow-up
 *
 * Sent two weeks after signup.
 * Only for Wanderers: Why Grove exists (the philosophy)
 */
import * as React from "react";
import { GroveEmail } from "../components/GroveEmail";
import { GroveParagraph } from "../components/GroveText";
import type { AudienceType } from "../types";

export interface Day14EmailProps {
  name?: string;
  audienceType: Extract<AudienceType, "wanderer">;
}

const CONTENT = {
  wanderer: {
    subject: "Why Grove exists",
    preview:
      "The internet changed. This is one small corner where it works differently.",
    paragraphs: [
      `Two weeks ago, you found your way here. I wanted to share something more personal.`,
      `I've watched the internet change. Social platforms that once felt like communities became engagement machines. Personal blogs gave way to algorithmic feeds. Our words became content to be optimized, scraped, fed into training data.`,
      `There are entire platforms now where it's just AI bots talking to AI bots. No humans at all. Machines performing "thought" for nobody.`,
      `Grove is my small rebellion.`,
      `Your voice matters more than being numbers to a machine. Writing is something humans do to connect with other humans. The internet can still have quiet corners where things work differently.`,
      `Safe. Beautiful. Yours.`,
      `That's the vision.`,
    ],
  },
};

export function Day14Email({ name, audienceType }: Day14EmailProps) {
  const content = CONTENT[audienceType];
  const greeting = name ? `Hey ${name},` : null;

  return (
    <GroveEmail previewText={content.preview}>
      {greeting && <GroveParagraph>{greeting}</GroveParagraph>}

      {content.paragraphs.map((paragraph, i) => (
        <GroveParagraph key={i}>{paragraph}</GroveParagraph>
      ))}
    </GroveEmail>
  );
}

export default Day14Email;
