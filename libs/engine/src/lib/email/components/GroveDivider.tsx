/**
 * GroveDivider - Decorative section divider
 *
 * A subtle divider that can optionally include a leaf emoji
 * for that Grove nature touch.
 */
import { Hr, Text } from "@react-email/components";
import * as React from "react";
import { GROVE_EMAIL_COLORS } from "./styles";

export interface GroveDividerProps {
  /** Show a decorative leaf in the center */
  withLeaf?: boolean;
  /** Spacing around the divider */
  spacing?: "sm" | "md" | "lg";
}

export function GroveDivider({
  withLeaf = false,
  spacing = "md",
}: GroveDividerProps) {
  const paddingMap = {
    sm: "12px 0",
    md: "24px 0",
    lg: "36px 0",
  };

  if (withLeaf) {
    return (
      <table
        role="presentation"
        cellPadding={0}
        cellSpacing={0}
        style={{ width: "100%", padding: paddingMap[spacing] }}
      >
        <tbody>
          <tr>
            <td style={styles.lineCell}>
              <Hr style={styles.line} />
            </td>
            <td style={styles.leafCell}>
              <Text style={styles.leaf}>🌿</Text>
            </td>
            <td style={styles.lineCell}>
              <Hr style={styles.line} />
            </td>
          </tr>
        </tbody>
      </table>
    );
  }

  return <Hr style={{ ...styles.simpleLine, margin: paddingMap[spacing] }} />;
}

const styles = {
  lineCell: {
    width: "45%",
    verticalAlign: "middle" as const,
  },
  leafCell: {
    width: "10%",
    textAlign: "center" as const,
    verticalAlign: "middle" as const,
  },
  line: {
    borderTop: `1px solid ${GROVE_EMAIL_COLORS.barkBrown}`,
    opacity: 0.15,
    margin: 0,
  },
  leaf: {
    margin: 0,
    fontSize: "16px",
    lineHeight: 1,
  },
  simpleLine: {
    borderTop: `1px solid ${GROVE_EMAIL_COLORS.barkBrown}`,
    opacity: 0.15,
  },
};
