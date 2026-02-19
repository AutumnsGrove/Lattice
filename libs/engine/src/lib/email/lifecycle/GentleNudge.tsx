/**
 * GentleNudge - Check-in for quiet users
 *
 * Sent to rooted users who haven't published in a while.
 * No pressure. No guilt. Just a friendly wave.
 */
import * as React from "react";
import { GroveEmail } from "../components/GroveEmail";
import { GroveParagraph } from "../components/GroveText";
import { GroveButton } from "../components/GroveButton";
import { GROVE_URLS } from "../urls";

export interface GentleNudgeProps {
  name?: string;
  /** How long since their last post (e.g., "a month", "a few weeks") */
  timeSincePost?: string;
}

export function GentleNudge({ name, timeSincePost }: GentleNudgeProps) {
  const greeting = name ? `Hey ${name},` : "Hey,";

  return (
    <GroveEmail previewText="Your grove is waiting.">
      <GroveParagraph>{greeting}</GroveParagraph>

      <GroveParagraph>
        {timeSincePost
          ? `It's been ${timeSincePost} since you last wrote something.`
          : "It's been a little while since you last wrote something."}
      </GroveParagraph>

      <GroveParagraph>
        No pressure. Sometimes the words aren't ready. Sometimes life gets busy.
        I get it.
      </GroveParagraph>

      <GroveParagraph>
        Your grove is still here whenever you need it. A quiet space for
        whenever you're ready to put words somewhere.
      </GroveParagraph>

      <GroveParagraph>
        And if you're stuck, it's okay to write something small. A thought. A
        quote. A single paragraph. Not everything has to be a polished piece.
      </GroveParagraph>

      <GroveButton href={GROVE_URLS.NEW_POST}>Write something</GroveButton>
    </GroveEmail>
  );
}

export default GentleNudge;
