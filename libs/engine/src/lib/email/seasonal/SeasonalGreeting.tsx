/**
 * SeasonalGreeting - Seasonal messages
 *
 * Warm, brief messages for seasonal check-ins.
 * Not holidays. Seasons. The forest changes, so do we.
 */
import * as React from "react";
import { GroveEmail } from "../components/GroveEmail";
import { GroveParagraph } from "../components/GroveText";

export type Season = "spring" | "summer" | "autumn" | "winter";

export interface SeasonalGreetingProps {
  name?: string;
  season: Season;
  /** Optional custom message (overrides default seasonal message) */
  customMessage?: string;
}

const SEASONAL_CONTENT: Record<
  Season,
  { preview: string; paragraphs: string[] }
> = {
  spring: {
    preview: "The forest wakes.",
    paragraphs: [
      "The forest is waking up. New leaves. Fresh paths. Room to grow.",
      "Spring is a good time to start something new. A draft you've been avoiding. A thought you've been holding. A page you've been meaning to write.",
      "Your grove is here when you're ready.",
    ],
  },
  summer: {
    preview: "Long days ahead.",
    paragraphs: [
      "The days are long. The light lingers.",
      "Summer is for slowing down. For reading in hammocks. For thoughts that don't need to become anything.",
      "If you write something, wonderful. If you don't, that's okay too. The grove will be here.",
    ],
  },
  autumn: {
    preview: "The leaves are turning.",
    paragraphs: [
      "The leaves are turning. There's a stillness in the air.",
      "Autumn is for harvest. For looking back at what you've grown. For letting go of what no longer serves you.",
      "Maybe it's time to revisit an old draft. Or archive something you've outgrown. Or just sit with what you've built.",
    ],
  },
  winter: {
    preview: "The forest rests.",
    paragraphs: [
      "The forest rests. The world slows down.",
      "Winter is for reflection. For warmth indoors. For words that come slowly, if they come at all.",
      "Your grove is a quiet place to be. No pressure. No expectations. Just you and your thoughts, whenever you need them.",
    ],
  },
};

export function SeasonalGreeting({
  name,
  season,
  customMessage,
}: SeasonalGreetingProps) {
  const content = SEASONAL_CONTENT[season];
  const greeting = name ? `Hey ${name},` : null;

  return (
    <GroveEmail previewText={content.preview}>
      {greeting && <GroveParagraph>{greeting}</GroveParagraph>}

      {customMessage ? (
        <GroveParagraph>{customMessage}</GroveParagraph>
      ) : (
        content.paragraphs.map((paragraph, i) => (
          <GroveParagraph key={i}>{paragraph}</GroveParagraph>
        ))
      )}
    </GroveEmail>
  );
}

export default SeasonalGreeting;
