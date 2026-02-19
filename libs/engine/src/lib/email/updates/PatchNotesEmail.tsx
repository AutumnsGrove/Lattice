/**
 * PatchNotesEmail - Feature updates for rooted users
 *
 * Sent to subscribers when new features are released.
 * Uses the GrovePatchNote component for each feature.
 */
import * as React from "react";
import { GroveEmail } from "../components/GroveEmail";
import { GroveHeading, GroveParagraph } from "../components/GroveText";
import { GrovePatchNote } from "../components/GrovePatchNote";
import { GroveDivider } from "../components/GroveDivider";
import { GroveButton } from "../components/GroveButton";

export interface PatchNote {
  icon: string;
  title: string;
  description: string;
  tag?: "new" | "improved" | "fixed";
}

export interface PatchNotesEmailProps {
  version?: string;
  date?: string;
  intro?: string;
  notes: PatchNote[];
  /** Optional CTA to see full changelog */
  changelogUrl?: string;
}

export function PatchNotesEmail({
  version,
  date,
  intro,
  notes,
  changelogUrl = "https://grove.place/changelog",
}: PatchNotesEmailProps) {
  const heading = version ? `What's new in ${version}` : "What's new in Grove";

  const defaultIntro = `Here's what I've been working on. These updates are shaped by your feedback. Thank you for being part of this.`;

  const previewText =
    notes.length > 0
      ? `${notes[0].title}: ${notes[0].description.slice(0, 60)}...`
      : "New updates from Grove";

  return (
    <GroveEmail previewText={previewText}>
      <GroveHeading>{heading}</GroveHeading>

      {date && <GroveParagraph muted>{date}</GroveParagraph>}

      <GroveParagraph>{intro || defaultIntro}</GroveParagraph>

      <GroveDivider withLeaf spacing="md" />

      {notes.map((note, i) => (
        <GrovePatchNote
          key={i}
          icon={note.icon}
          title={note.title}
          tag={note.tag}
        >
          {note.description}
        </GrovePatchNote>
      ))}

      <GroveDivider spacing="md" />

      <GroveParagraph>
        Got feedback? Just reply to this email. I read every message.
      </GroveParagraph>

      <GroveButton href={changelogUrl} variant="secondary">
        View full changelog
      </GroveButton>
    </GroveEmail>
  );
}

export default PatchNotesEmail;
