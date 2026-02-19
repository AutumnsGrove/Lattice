/**
 * GroveText - Typography components for emails
 *
 * Pre-styled text components that maintain Grove's warm,
 * readable aesthetic across all email clients.
 */
import { Text, Link } from "@react-email/components";
import * as React from "react";
import { GROVE_EMAIL_COLORS, TEXT_STYLES } from "./styles";

// ─────────────────────────────────────────────────────────────
// Heading
// ─────────────────────────────────────────────────────────────

export interface GroveHeadingProps {
  children: React.ReactNode;
  /** Heading level for semantics (visual size) */
  as?: "h1" | "h2" | "h3";
}

export function GroveHeading({ children, as = "h1" }: GroveHeadingProps) {
  const sizeStyles = {
    h1: { fontSize: "28px", marginBottom: "20px" },
    h2: { fontSize: "22px", marginBottom: "16px" },
    h3: { fontSize: "18px", marginBottom: "12px" },
  };

  return (
    <Text style={{ ...TEXT_STYLES.heading, ...sizeStyles[as] }}>
      {children}
    </Text>
  );
}

// ─────────────────────────────────────────────────────────────
// Paragraph
// ─────────────────────────────────────────────────────────────

export interface GroveParagraphProps {
  children: React.ReactNode;
  /** Smaller text for secondary content */
  muted?: boolean;
}

export function GroveParagraph({
  children,
  muted = false,
}: GroveParagraphProps) {
  const style = muted ? TEXT_STYLES.small : TEXT_STYLES.body;
  return <Text style={style}>{children}</Text>;
}

// ─────────────────────────────────────────────────────────────
// Link
// ─────────────────────────────────────────────────────────────

export interface GroveLinkProps {
  href: string;
  children: React.ReactNode;
}

export function GroveLink({ href, children }: GroveLinkProps) {
  return (
    <Link href={href} style={styles.link}>
      {children}
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────
// List
// ─────────────────────────────────────────────────────────────

export interface GroveListProps {
  items: React.ReactNode[];
  /** Bullet style */
  variant?: "bullet" | "check" | "arrow";
}

export function GroveList({ items, variant = "bullet" }: GroveListProps) {
  const bullets = {
    bullet: "•",
    check: "✓",
    arrow: "→",
  };

  return (
    <table
      role="presentation"
      cellPadding={0}
      cellSpacing={0}
      style={styles.list}
    >
      <tbody>
        {items.map((item, i) => (
          <tr key={i}>
            <td style={styles.bulletCell}>{bullets[variant]}</td>
            <td style={styles.itemCell}>{item}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const styles = {
  link: {
    color: GROVE_EMAIL_COLORS.groveGreen,
    textDecoration: "underline",
  },
  list: {
    margin: "16px 0",
    width: "100%",
  },
  bulletCell: {
    width: "24px",
    verticalAlign: "top" as const,
    paddingTop: "2px",
    paddingBottom: "8px",
    color: GROVE_EMAIL_COLORS.groveGreen,
    fontSize: "14px",
    fontWeight: 600,
  },
  itemCell: {
    verticalAlign: "top" as const,
    paddingBottom: "8px",
    fontSize: "16px",
    lineHeight: 1.5,
    color: GROVE_EMAIL_COLORS.barkBrown,
  },
};
