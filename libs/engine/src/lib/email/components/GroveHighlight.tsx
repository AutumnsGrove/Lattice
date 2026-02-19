/**
 * GroveHighlight - Callout box for important information
 *
 * A subtle highlighted section that draws attention without
 * being aggressive. Perfect for tips, notes, or special offers.
 */
import { Section, Text } from "@react-email/components";
import * as React from "react";
import { GROVE_EMAIL_COLORS } from "./styles";

export interface GroveHighlightProps {
  children: React.ReactNode;
  /** Optional emoji icon to display */
  icon?: string;
  /** Visual variant */
  variant?: "info" | "tip" | "special";
}

export function GroveHighlight({
  children,
  icon,
  variant = "info",
}: GroveHighlightProps) {
  const variantStyles = {
    info: {
      backgroundColor: "rgba(22, 163, 74, 0.08)", // Soft grove green
      borderLeft: `3px solid ${GROVE_EMAIL_COLORS.groveGreen}`,
    },
    tip: {
      backgroundColor: "rgba(61, 41, 20, 0.05)", // Soft bark brown
      borderLeft: `3px solid ${GROVE_EMAIL_COLORS.barkBrown}`,
    },
    special: {
      backgroundColor: "rgba(234, 179, 8, 0.1)", // Soft golden
      borderLeft: "3px solid #eab308",
    },
  };

  const defaultIcons = {
    info: "💡",
    tip: "✨",
    special: "🎁",
  };

  const displayIcon = icon ?? defaultIcons[variant];

  return (
    <Section style={{ ...styles.container, ...variantStyles[variant] }}>
      {displayIcon && <Text style={styles.icon}>{displayIcon}</Text>}
      <div style={styles.content}>{children}</div>
    </Section>
  );
}

const styles = {
  container: {
    padding: "16px 20px",
    borderRadius: "0 8px 8px 0",
    margin: "20px 0",
  },
  icon: {
    margin: "0 0 8px 0",
    fontSize: "20px",
    lineHeight: 1,
  },
  content: {
    fontSize: "15px",
    lineHeight: 1.5,
    color: GROVE_EMAIL_COLORS.barkBrown,
  },
};
