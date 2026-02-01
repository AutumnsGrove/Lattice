/**
 * GrovePatchNote - Feature update block for patch notes emails
 *
 * Displays a single feature or update with an icon, title,
 * and description. Perfect for changelog-style emails.
 */
import { Section, Text } from "@react-email/components";
import * as React from "react";
import { GROVE_EMAIL_COLORS } from "./styles";

export interface GrovePatchNoteProps {
  /** Emoji or icon for the feature */
  icon: string;
  /** Feature title */
  title: string;
  /** Feature description */
  children: React.ReactNode;
  /** Tag like "New", "Improved", "Fixed" */
  tag?: "new" | "improved" | "fixed";
}

export function GrovePatchNote({
  icon,
  title,
  children,
  tag,
}: GrovePatchNoteProps) {
  const tagStyles = {
    new: { backgroundColor: "#dcfce7", color: "#166534" },
    improved: { backgroundColor: "#dbeafe", color: "#1e40af" },
    fixed: { backgroundColor: "#fef3c7", color: "#92400e" },
  };

  const tagLabels = {
    new: "New",
    improved: "Improved",
    fixed: "Fixed",
  };

  return (
    <Section style={styles.container}>
      <table
        role="presentation"
        cellPadding={0}
        cellSpacing={0}
        style={{ width: "100%" }}
      >
        <tbody>
          <tr>
            <td style={styles.iconCell}>
              <Text style={styles.icon}>{icon}</Text>
            </td>
            <td style={styles.contentCell}>
              <Text style={styles.titleRow}>
                <span style={styles.title}>{title}</span>
                {tag && (
                  <span style={{ ...styles.tag, ...tagStyles[tag] }}>
                    {tagLabels[tag]}
                  </span>
                )}
              </Text>
              <Text style={styles.description}>{children}</Text>
            </td>
          </tr>
        </tbody>
      </table>
    </Section>
  );
}

const styles = {
  container: {
    padding: "16px 0",
    borderBottom: `1px solid rgba(61, 41, 20, 0.1)`,
  },
  iconCell: {
    width: "48px",
    verticalAlign: "top" as const,
  },
  icon: {
    margin: 0,
    fontSize: "28px",
    lineHeight: 1,
  },
  contentCell: {
    verticalAlign: "top" as const,
  },
  titleRow: {
    margin: "0 0 6px 0",
    display: "block",
  },
  title: {
    fontSize: "17px",
    fontWeight: 600,
    color: GROVE_EMAIL_COLORS.barkBrown,
  },
  tag: {
    display: "inline-block",
    marginLeft: "8px",
    padding: "2px 8px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  },
  description: {
    margin: 0,
    fontSize: "15px",
    lineHeight: 1.5,
    color: GROVE_EMAIL_COLORS.barkBrown,
    opacity: 0.85,
  },
};
