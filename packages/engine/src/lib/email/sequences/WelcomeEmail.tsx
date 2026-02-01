/**
 * WelcomeEmail - Day 0 email for all audiences
 *
 * The first email someone receives when they join Grove.
 * Content varies based on how they joined:
 * - Waitlist: "Welcome to Grove" - curious, learning
 * - Trial: "You planted something" - getting started
 * - Rooted: "Welcome home" - celebration, gratitude
 */
import * as React from "react";
import { GroveEmail } from "../components/GroveEmail";
import { GroveButton } from "../components/GroveButton";
import { GroveHeading, GroveParagraph } from "../components/GroveText";
import { GroveHighlight } from "../components/GroveHighlight";

export type AudienceType = "waitlist" | "trial" | "rooted";

export interface WelcomeEmailProps {
  /** User's name (optional) */
  name?: string;
  /** Which audience this user belongs to */
  audienceType: AudienceType;
}

// Content variations by audience
const CONTENT = {
  waitlist: {
    emoji: "🌿",
    heading: (name?: string) =>
      name ? `Welcome, ${name}` : "Welcome to the Grove",
    body: `You've just planted something special. I'm Autumn, and I'm building Grove—a cozy corner of the internet where your words have a home.

No algorithms deciding who sees your work. No engagement metrics to chase. Just a quiet space where you can write, and the people who care can find you.`,
    highlight: `I'll send you occasional updates as Grove grows. Nothing spammy—just honest notes about what we're building and why.`,
    cta: "Learn more about Grove",
    ctaUrl: "https://grove.place/about",
  },
  trial: {
    emoji: "🌱",
    heading: () => "You planted something",
    body: `Welcome to Grove! You've taken your first step toward having your own space online.

Over the next few days, I'll share some tips to help you get the most out of your new home. For now, take a moment to explore—write something, customize your space, make it feel like yours.`,
    highlight: `Tip: Your grove is at your-username.grove.place. Share it with someone you trust and ask what they think!`,
    cta: "Explore your grove",
    ctaUrl: "https://grove.place/dashboard",
  },
  rooted: {
    emoji: "🏡",
    heading: () => "Welcome home",
    body: `You're officially rooted! Thank you for believing in what we're building. Your support means everything—not just financially, but because it tells me that this matters to someone else too.

Grove is still growing, and you're part of shaping what it becomes. I'd love to hear what brought you here and what you hope to create.`,
    highlight: null,
    cta: "Get started",
    ctaUrl: "https://grove.place/dashboard",
  },
};

export function WelcomeEmail({ name, audienceType }: WelcomeEmailProps) {
  const content = CONTENT[audienceType];
  const heading = `${content.heading(name)} ${content.emoji}`;
  const previewText = content.body.slice(0, 100).replace(/\n/g, " ");

  return (
    <GroveEmail previewText={previewText}>
      <GroveHeading>{heading}</GroveHeading>

      {content.body.split("\n\n").map((paragraph, i) => (
        <GroveParagraph key={i}>{paragraph}</GroveParagraph>
      ))}

      {content.highlight && (
        <GroveHighlight variant="tip" icon="💡">
          <GroveParagraph>{content.highlight}</GroveParagraph>
        </GroveHighlight>
      )}

      <GroveButton href={content.ctaUrl}>{content.cta}</GroveButton>
    </GroveEmail>
  );
}

export default WelcomeEmail;
