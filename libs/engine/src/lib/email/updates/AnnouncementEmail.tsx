/**
 * AnnouncementEmail - General announcements
 *
 * For important updates, new features, or community news.
 * More flexible than PatchNotesEmail for varied content.
 */
import * as React from "react";
import { GroveEmail } from "../components/GroveEmail";
import { GroveHeading, GroveParagraph } from "../components/GroveText";
import { GroveButton } from "../components/GroveButton";
import { GroveDivider } from "../components/GroveDivider";

export interface AnnouncementEmailProps {
  /** Email subject line (also used in heading) */
  title: string;
  /** Preview text for email clients */
  preview: string;
  /** Main content paragraphs */
  paragraphs: string[];
  /** Optional CTA button */
  cta?: {
    text: string;
    url: string;
  };
  /** Optional secondary content after the CTA */
  closing?: string;
}

export function AnnouncementEmail({
  title,
  preview,
  paragraphs,
  cta,
  closing,
}: AnnouncementEmailProps) {
  return (
    <GroveEmail previewText={preview}>
      <GroveHeading>{title}</GroveHeading>

      {paragraphs.map((paragraph, i) => (
        <GroveParagraph key={i}>{paragraph}</GroveParagraph>
      ))}

      {cta && (
        <>
          <GroveDivider spacing="md" />
          <GroveButton href={cta.url}>{cta.text}</GroveButton>
        </>
      )}

      {closing && (
        <>
          <GroveDivider spacing="md" />
          <GroveParagraph>{closing}</GroveParagraph>
        </>
      )}
    </GroveEmail>
  );
}

export default AnnouncementEmail;
