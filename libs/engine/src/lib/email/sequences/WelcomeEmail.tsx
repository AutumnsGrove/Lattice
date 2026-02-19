/**
 * WelcomeEmail - Day 0 email for all audiences
 *
 * The first email someone receives when they join Grove.
 * Content varies based on how they joined:
 * - Wanderer: Signed up on landing, curious
 * - Promo: Signed up on Plant, showing intent
 * - Rooted: Purchased a subscription, welcome home
 */
import * as React from "react";
import { GroveEmail } from "../components/GroveEmail";
import { GroveButton } from "../components/GroveButton";
import { GroveHeading, GroveParagraph } from "../components/GroveText";
import { GROVE_URLS } from "../urls";
import type { AudienceType } from "../types";

export interface WelcomeEmailProps {
  name?: string;
  audienceType: AudienceType;
}

const CONTENT = {
  wanderer: {
    subject: "Welcome to the Grove 🌿",
    preview: "A quiet corner of the internet, waiting for you.",
    greeting: "Hey,",
    paragraphs: [
      `I'm Autumn. I built Grove. A quiet corner of the internet where your words are actually yours.`,
      `No algorithms deciding who sees your work. No infinite scroll designed to trap you. No trackers learning your patterns to sell you things. Just a place to write. A place to be.`,
      `Your content belongs to you. Download it anytime. If you ever leave, it gets emailed to you automatically. It never gets sold. Never scraped for AI training data. I built an entire protection system called Shade to make sure of that.`,
      `I'll send you a few more notes over the coming weeks. What makes this place tick. Why it matters. Nothing spammy. Just honest updates.`,
      `Welcome.`,
    ],
    cta: null,
    ctaUrl: null,
  },
  promo: {
    subject: "You found Grove 🌱",
    preview: "Thanks for showing interest.",
    greeting: "Hey,",
    paragraphs: [
      `You found your way to Plant, a part of Grove. That means you're thinking about having your own space here.`,
      `I wanted to say thanks. And share what makes this place different.`,
      `Grove is a blogging platform where your words stay yours. No algorithms. No tracking. No AI scraping your content for training data. I built a protection system called Shade with eight layers of defense against crawlers.`,
      `Your content never gets sold. If you ever leave, it gets emailed to you automatically.`,
      `Safe. Beautiful. Yours.`,
      `Take your time looking around. I'm here if you have questions.`,
    ],
    cta: null,
    ctaUrl: null,
  },
  rooted: {
    subject: "Welcome home 🏡",
    preview: "You're part of the grove now.",
    greeting: "Hey,",
    paragraphs: [
      `You did it. You planted your own corner of the internet.`,
      `Thank you for believing in what we're building here. Your support means everything. Not just financially, but because it tells me this matters to someone else too.`,
      `Your space is ready. Write something. Customize it. Make it yours.`,
      `I'll send you a few notes over the coming days to help you settle in. And if you ever need anything, just reply to this email. I read everything.`,
      `Welcome home.`,
    ],
    cta: "Go to your grove",
    ctaUrl: GROVE_URLS.ARBOR_PANEL,
  },
};

export function WelcomeEmail({ name, audienceType }: WelcomeEmailProps) {
  const content = CONTENT[audienceType];
  const greeting = name ? `Hey ${name},` : content.greeting;

  return (
    <GroveEmail previewText={content.preview}>
      {content.paragraphs.map((paragraph, i) => {
        if (i === 0) {
          return (
            <React.Fragment key={i}>
              <GroveParagraph>{greeting}</GroveParagraph>
              <GroveParagraph>{paragraph}</GroveParagraph>
            </React.Fragment>
          );
        }
        return <GroveParagraph key={i}>{paragraph}</GroveParagraph>;
      })}

      {content.cta && content.ctaUrl && (
        <GroveButton href={content.ctaUrl}>{content.cta}</GroveButton>
      )}
    </GroveEmail>
  );
}

export default WelcomeEmail;
