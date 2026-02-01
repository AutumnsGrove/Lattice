/**
 * Day7Email - One week follow-up (Day 7)
 *
 * Sent one week after signup to all audiences.
 * Content varies: product vision for waitlist, feature tips for trial/rooted.
 */
import * as React from "react";
import { GroveEmail } from "../components/GroveEmail";
import { GroveButton } from "../components/GroveButton";
import {
  GroveHeading,
  GroveParagraph,
  GroveLink,
} from "../components/GroveText";
import { GroveDivider } from "../components/GroveDivider";
import type { AudienceType } from "../types";

export interface Day7EmailProps {
  name?: string;
  audienceType: AudienceType;
}

const CONTENT = {
  waitlist: {
    subject: "What we're building",
    heading: "What we're building (and why)",
    paragraphs: [
      `A week ago, you signed up for Grove. I wanted to share more about what we're actually building here.`,
      `Grove is a blogging platform, yes. But it's also an experiment in building differently. No investor growth targets. No engagement algorithms. No dark patterns to keep you scrolling.`,
      `Just a quiet place where your words can live, and the people who care about them can find you.`,
      `We're building slowly, intentionally. Each feature is designed to help you write and share—nothing more. No follower counts. No viral mechanics. Just writing.`,
    ],
    closing: `If that resonates with you, I'd love to have you when we open our doors. Until then, I'll keep you posted on our progress.`,
    cta: "Learn more about Grove",
    ctaUrl: "https://grove.place/about",
  },
  trial: {
    subject: "Have you tried...?",
    heading: "A few features you might have missed",
    paragraphs: [
      `It's been a week since you planted your grove. How's it going so far?`,
      `I wanted to share a few features you might not have discovered yet:`,
    ],
    features: [
      { name: "Draft mode", desc: "Write privately, publish when ready" },
      { name: "Gutter notes", desc: "Add margin annotations to your posts" },
      { name: "Custom pages", desc: "Create an About page or portfolio" },
    ],
    closing: `Got questions? Just reply to this email. I'm always happy to help.`,
    cta: "Explore your dashboard",
    ctaUrl: "https://grove.place/dashboard",
  },
  rooted: {
    subject: "Feature spotlight",
    heading: "Feature spotlight: Gutter notes",
    paragraphs: [
      `One week in! I hope you're settling into your new space.`,
      `This week I wanted to highlight one of my favorite features: gutter notes.`,
      `They're small annotations that appear in the margin of your posts—perfect for asides, citations, or little jokes that don't fit in the main text.`,
      `To add one, just highlight some text in the editor and click the note icon. Your readers will see it floating elegantly beside your words.`,
    ],
    closing: `Have a feature you'd love to see? Reply and let me know. Your ideas shape what we build.`,
    cta: "Try gutter notes",
    ctaUrl: "https://grove.place/dashboard/posts/new",
  },
};

export function Day7Email({ name, audienceType }: Day7EmailProps) {
  const content = CONTENT[audienceType];
  const previewText = content.paragraphs[0].slice(0, 100);

  return (
    <GroveEmail previewText={previewText}>
      <GroveHeading>{content.heading}</GroveHeading>

      {name && <GroveParagraph>Hey {name},</GroveParagraph>}

      {content.paragraphs.map((p, i) => (
        <GroveParagraph key={i}>{p}</GroveParagraph>
      ))}

      {"features" in content && (
        <>
          <GroveDivider withLeaf spacing="sm" />
          {content.features.map((f, i) => (
            <GroveParagraph key={i}>
              <strong>{f.name}:</strong> {f.desc}
            </GroveParagraph>
          ))}
          <GroveDivider withLeaf spacing="sm" />
        </>
      )}

      <GroveParagraph>{content.closing}</GroveParagraph>

      <GroveButton href={content.ctaUrl}>{content.cta}</GroveButton>
    </GroveEmail>
  );
}

export default Day7Email;
