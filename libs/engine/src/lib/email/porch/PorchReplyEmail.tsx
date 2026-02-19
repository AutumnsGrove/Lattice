/**
 * Porch Reply Email Template
 *
 * Email sent when someone replies to a Porch visit.
 * Shows visit info, reply content, and link back to conversation.
 */

import * as React from "react";
import { Text, Heading, Section, Link, Hr } from "@react-email/components";
import { GroveEmail } from "../components/GroveEmail";

export interface PorchReplyEmailProps {
  /** Recipient name */
  recipientName?: string;

  /** Name of the person who replied */
  replierName: string;

  /** The reply message content (plain text) */
  replyContent: string;

  /** When the visit occurred */
  visitDate: string;

  /** URL to view the full conversation */
  conversationUrl: string;

  /** URL to unsubscribe */
  unsubscribeUrl?: string;
}

export function PorchReplyEmail({
  recipientName,
  replierName,
  replyContent,
  visitDate,
  conversationUrl,
}: PorchReplyEmailProps) {
  const greeting = recipientName ? `Hello ${recipientName},` : "Hello,";

  return (
    <GroveEmail
      previewText={`${replierName} replied to your Porch visit`}
      signature={`— ${replierName}`}
    >
      <Section>
        <Text
          style={{
            fontSize: "16px",
            lineHeight: "1.6",
            color: "#3d3d3d",
            margin: "0 0 20px 0",
          }}
        >
          {greeting}
        </Text>

        <Text
          style={{
            fontSize: "16px",
            lineHeight: "1.6",
            color: "#3d3d3d",
            margin: "0 0 24px 0",
          }}
        >
          <strong>{replierName}</strong> replied to your Porch visit from{" "}
          <em>{visitDate}</em>.
        </Text>

        <Hr
          style={{
            border: "none",
            borderTop: "1px solid #e8e4dc",
            margin: "24px 0",
          }}
        />

        <Heading
          as="h2"
          style={{
            fontSize: "14px",
            fontWeight: "600",
            color: "#5c6b5c",
            margin: "0 0 12px 0",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Their reply
        </Heading>

        <Text
          style={{
            fontSize: "15px",
            lineHeight: "1.7",
            color: "#4a4a4a",
            margin: "0 0 24px 0",
            padding: "16px",
            backgroundColor: "#f8f6f1",
            borderRadius: "8px",
            whiteSpace: "pre-wrap",
          }}
        >
          {replyContent}
        </Text>

        <Hr
          style={{
            border: "none",
            borderTop: "1px solid #e8e4dc",
            margin: "24px 0",
          }}
        />

        <Section style={{ textAlign: "center", margin: "32px 0" }}>
          <Link
            href={conversationUrl}
            style={{
              display: "inline-block",
              padding: "12px 24px",
              backgroundColor: "#5c6b5c",
              color: "#ffffff",
              textDecoration: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "500",
            }}
          >
            View full conversation
          </Link>
        </Section>

        <Text
          style={{
            fontSize: "13px",
            lineHeight: "1.5",
            color: "#6b6b6b",
            margin: "24px 0 0 0",
            fontStyle: "italic",
          }}
        >
          Porch is a quiet space for meaningful conversation. Take your time
          responding—there's no rush here.
        </Text>
      </Section>
    </GroveEmail>
  );
}

export default PorchReplyEmail;
