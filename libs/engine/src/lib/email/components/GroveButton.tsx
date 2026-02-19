/**
 * GroveButton - CTA button for emails
 *
 * A prominent, accessible button with Grove's signature green.
 * Uses table-based centering for maximum email client compatibility.
 */
import { Button } from "@react-email/components";
import * as React from "react";
import { GROVE_EMAIL_COLORS } from "./styles";

export interface GroveButtonProps {
  href: string;
  children: React.ReactNode;
  /** Visual style variant */
  variant?: "primary" | "secondary";
  /** Center the button (default: true) */
  centered?: boolean;
}

export function GroveButton({
  href,
  children,
  variant = "primary",
  centered = true,
}: GroveButtonProps) {
  const buttonStyle = variant === "primary" ? styles.primary : styles.secondary;

  const button = (
    <Button href={href} style={buttonStyle}>
      {children}
    </Button>
  );

  if (!centered) {
    return button;
  }

  // Center using table layout for email compatibility
  return (
    <table
      role="presentation"
      cellPadding={0}
      cellSpacing={0}
      style={{ margin: "24px 0", width: "100%" }}
    >
      <tbody>
        <tr>
          <td align="center">{button}</td>
        </tr>
      </tbody>
    </table>
  );
}

const baseButtonStyle = {
  display: "inline-block",
  padding: "14px 28px",
  borderRadius: "8px",
  textDecoration: "none",
  fontSize: "16px",
  fontWeight: 600,
  textAlign: "center" as const,
};

const styles = {
  primary: {
    ...baseButtonStyle,
    backgroundColor: GROVE_EMAIL_COLORS.groveGreen,
    color: "#ffffff",
  },
  secondary: {
    ...baseButtonStyle,
    backgroundColor: "transparent",
    color: GROVE_EMAIL_COLORS.groveGreen,
    border: `2px solid ${GROVE_EMAIL_COLORS.groveGreen}`,
  },
};
