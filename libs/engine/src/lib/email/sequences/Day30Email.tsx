/**
 * Day30Email - One month check-in
 *
 * Sent one month after signup.
 * Only for Wanderers: Gentle check-in, still curious?
 */
import * as React from "react";
import { GroveEmail } from "../components/GroveEmail";
import { GroveParagraph } from "../components/GroveText";
import type { AudienceType } from "../types";

export interface Day30EmailProps {
  name?: string;
  audienceType: Extract<AudienceType, "wanderer">;
}

const CONTENT = {
  wanderer: {
    subject: "Still there? 👋",
    preview: "No pressure. Just checking in.",
    paragraphs: [
      `It's been a month since you found your way here.`,
      `If you're still curious, wonderful. Grove is here whenever you're ready.`,
      `If your priorities shifted, no hard feelings. You can step away anytime using the link below.`,
      `Either way: thank you. It meant something.`,
    ],
  },
};

export function Day30Email({ name, audienceType }: Day30EmailProps) {
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

export default Day30Email;
