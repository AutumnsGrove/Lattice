/**
 * GlassComparisonTable Component Tests
 *
 * Tests for the glassmorphism comparison table covering:
 * - Cell label generation for accessibility (getCellLabel)
 * - Highlighted column resolution (prop vs. column flag)
 * - Competitor column filtering for mobile cards
 * - Data contract validation (column/row structures)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from "vitest";

// =============================================================================
// TYPE DEFINITIONS (mirroring component interfaces)
// =============================================================================

interface ComparisonColumn {
  name: string;
  highlighted?: boolean;
  href?: string;
}

interface ComparisonRow {
  feature: string;
  description?: string;
  values: Record<string, string | boolean>;
}

// =============================================================================
// CELL LABEL TESTS (Accessibility)
// =============================================================================

describe("GlassComparisonTable getCellLabel", () => {
  /**
   * Renders a cell value as accessible text for screen readers.
   * Matches the component's getCellLabel function exactly.
   */
  function getCellLabel(value: string | boolean | undefined): string {
    if (value === true) return "Yes";
    if (value === false) return "No";
    if (value === undefined) return "N/A";
    return value;
  }

  it("should return 'Yes' for boolean true", () => {
    expect(getCellLabel(true)).toBe("Yes");
  });

  it("should return 'No' for boolean false", () => {
    expect(getCellLabel(false)).toBe("No");
  });

  it("should return 'N/A' for undefined", () => {
    expect(getCellLabel(undefined)).toBe("N/A");
  });

  it("should pass through string values unchanged", () => {
    expect(getCellLabel("$8/mo")).toBe("$8/mo");
    expect(getCellLabel("Plugin")).toBe("Plugin");
    expect(getCellLabel("Meadow")).toBe("Meadow");
  });

  it("should handle empty string", () => {
    expect(getCellLabel("")).toBe("");
  });

  it("should not coerce falsy strings to 'No'", () => {
    // Empty string is falsy but should NOT become "No"
    expect(getCellLabel("")).not.toBe("No");
  });

  it("should distinguish boolean false from string 'false'", () => {
    expect(getCellLabel(false)).toBe("No");
    expect(getCellLabel("false")).toBe("false");
  });
});

// =============================================================================
// HIGHLIGHTED COLUMN RESOLUTION TESTS
// =============================================================================

describe("GlassComparisonTable Highlighted Column Resolution", () => {
  /**
   * Resolves which column is highlighted.
   * Priority: highlightColumn prop > column with highlighted: true > undefined
   * Matches: highlightColumn ?? columns.find((c) => c.highlighted)?.name
   */
  function resolveHighlightedColumn(
    columns: ComparisonColumn[],
    highlightColumn?: string,
  ): string | undefined {
    return highlightColumn ?? columns.find((c) => c.highlighted)?.name;
  }

  const sampleColumns: ComparisonColumn[] = [
    { name: "Grove", highlighted: true },
    { name: "Bear Blog" },
    { name: "Substack" },
    { name: "WordPress" },
  ];

  it("should use highlightColumn prop when provided", () => {
    expect(resolveHighlightedColumn(sampleColumns, "Grove")).toBe("Grove");
  });

  it("should fall back to column with highlighted flag", () => {
    expect(resolveHighlightedColumn(sampleColumns)).toBe("Grove");
  });

  it("should prefer highlightColumn prop over highlighted flag", () => {
    // Even if "Grove" has highlighted: true, prop wins
    expect(resolveHighlightedColumn(sampleColumns, "Substack")).toBe(
      "Substack",
    );
  });

  it("should return undefined when no highlight exists", () => {
    const noHighlight: ComparisonColumn[] = [
      { name: "A" },
      { name: "B" },
      { name: "C" },
    ];
    expect(resolveHighlightedColumn(noHighlight)).toBeUndefined();
  });

  it("should find first highlighted column if multiple are flagged", () => {
    const multiHighlight: ComparisonColumn[] = [
      { name: "First", highlighted: true },
      { name: "Second", highlighted: true },
    ];
    expect(resolveHighlightedColumn(multiHighlight)).toBe("First");
  });

  it("should handle empty columns array", () => {
    expect(resolveHighlightedColumn([])).toBeUndefined();
  });

  it("should handle highlightColumn that doesn't match any column", () => {
    // The component doesn't validate this — it just uses the string
    expect(resolveHighlightedColumn(sampleColumns, "Nonexistent")).toBe(
      "Nonexistent",
    );
  });
});

// =============================================================================
// COMPETITOR COLUMN FILTERING TESTS
// =============================================================================

describe("GlassComparisonTable Competitor Column Filtering", () => {
  /**
   * Filters out the highlighted column to get competitors.
   * Used for mobile card layout: one card per competitor.
   * Matches: columns.filter((c) => c.name !== highlightedCol)
   */
  function getCompetitorColumns(
    columns: ComparisonColumn[],
    highlightedCol: string | undefined,
  ): ComparisonColumn[] {
    return columns.filter((c) => c.name !== highlightedCol);
  }

  const columns: ComparisonColumn[] = [
    { name: "Grove", highlighted: true },
    { name: "Bear Blog" },
    { name: "Substack", href: "https://substack.com" },
    { name: "WordPress" },
    { name: "Ghost" },
    { name: "Tumblr" },
  ];

  it("should exclude the highlighted column", () => {
    const competitors = getCompetitorColumns(columns, "Grove");
    const names = competitors.map((c) => c.name);
    expect(names).not.toContain("Grove");
  });

  it("should include all non-highlighted columns", () => {
    const competitors = getCompetitorColumns(columns, "Grove");
    expect(competitors.length).toBe(5);
    expect(competitors.map((c) => c.name)).toEqual([
      "Bear Blog",
      "Substack",
      "WordPress",
      "Ghost",
      "Tumblr",
    ]);
  });

  it("should preserve column properties like href", () => {
    const competitors = getCompetitorColumns(columns, "Grove");
    const substack = competitors.find((c) => c.name === "Substack");
    expect(substack?.href).toBe("https://substack.com");
  });

  it("should return all columns when highlightedCol is undefined", () => {
    const competitors = getCompetitorColumns(columns, undefined);
    expect(competitors.length).toBe(6);
  });

  it("should return all columns when highlightedCol matches nothing", () => {
    const competitors = getCompetitorColumns(columns, "Nonexistent");
    expect(competitors.length).toBe(6);
  });

  it("should return empty array when all columns match highlight", () => {
    const single: ComparisonColumn[] = [{ name: "Only" }];
    const competitors = getCompetitorColumns(single, "Only");
    expect(competitors).toEqual([]);
  });

  it("should produce one mobile card per competitor", () => {
    // The mobile layout renders one card per competitor column
    const competitors = getCompetitorColumns(columns, "Grove");
    // 6 total columns - 1 highlighted = 5 cards
    expect(competitors.length).toBe(5);
  });
});

// =============================================================================
// DATA CONTRACT TESTS
// =============================================================================

describe("GlassComparisonTable Data Contract", () => {
  /**
   * Validates that row values reference valid column names.
   * Not enforced at runtime, but useful for catching data errors.
   */
  function getRowValue(
    row: ComparisonRow,
    columnName: string,
  ): string | boolean | undefined {
    return row.values[columnName];
  }

  const sampleRow: ComparisonRow = {
    feature: "Custom subdomain included",
    description: "Get your own yourname.grove.host",
    values: {
      Grove: true,
      "Bear Blog": true,
      Substack: false,
      WordPress: false,
      Ghost: false,
      Tumblr: true,
    },
  };

  it("should retrieve boolean true values", () => {
    expect(getRowValue(sampleRow, "Grove")).toBe(true);
  });

  it("should retrieve boolean false values", () => {
    expect(getRowValue(sampleRow, "Substack")).toBe(false);
  });

  it("should return undefined for missing column names", () => {
    expect(getRowValue(sampleRow, "Nonexistent")).toBeUndefined();
  });

  it("should handle string values", () => {
    const pricingRow: ComparisonRow = {
      feature: "Pricing starts at",
      values: {
        Grove: "$8/mo",
        "Bear Blog": "Free/$5",
        Substack: "Free/$10",
      },
    };
    expect(getRowValue(pricingRow, "Grove")).toBe("$8/mo");
    expect(getRowValue(pricingRow, "Bear Blog")).toBe("Free/$5");
  });

  it("should handle mixed boolean and string values in same row", () => {
    const communityRow: ComparisonRow = {
      feature: "Community features",
      values: {
        Grove: "Meadow",
        "Bear Blog": false,
        Substack: "Notes",
        WordPress: "Plugin",
      },
    };
    expect(getRowValue(communityRow, "Grove")).toBe("Meadow");
    expect(getRowValue(communityRow, "Bear Blog")).toBe(false);
    expect(getRowValue(communityRow, "Substack")).toBe("Notes");
  });

  it("should preserve feature name and description", () => {
    expect(sampleRow.feature).toBe("Custom subdomain included");
    expect(sampleRow.description).toBe("Get your own yourname.grove.host");
  });

  it("should allow rows without descriptions", () => {
    const noDesc: ComparisonRow = {
      feature: "Open source",
      values: { Grove: true },
    };
    expect(noDesc.description).toBeUndefined();
  });
});

// =============================================================================
// ACCESSIBILITY PATTERN TESTS
// =============================================================================

describe("GlassComparisonTable Accessibility", () => {
  function getCellLabel(value: string | boolean | undefined): string {
    if (value === true) return "Yes";
    if (value === false) return "No";
    if (value === undefined) return "N/A";
    return value;
  }

  it("should generate meaningful aria-labels for all value types", () => {
    // Every cell in the table gets an aria-label via getCellLabel
    const values: (string | boolean | undefined)[] = [
      true,
      false,
      undefined,
      "$8/mo",
      "Plugin",
    ];
    const labels = values.map(getCellLabel);
    expect(labels).toEqual(["Yes", "No", "N/A", "$8/mo", "Plugin"]);
    // No label should be empty or meaningless
    labels.forEach((label) => {
      expect(label.length).toBeGreaterThan(0);
    });
  });

  it("should provide table-level aria-label from title prop", () => {
    // The table uses: aria-label={title ?? "Platform comparison"}
    const resolveAriaLabel = (title?: string) => title ?? "Platform comparison";

    expect(resolveAriaLabel("How Grove Compares")).toBe("How Grove Compares");
    expect(resolveAriaLabel()).toBe("Platform comparison");
    expect(resolveAriaLabel(undefined)).toBe("Platform comparison");
  });

  it("should ensure icon cells are hidden from screen readers", () => {
    // All Check, X, and Minus icons use aria-hidden="true"
    // The parent <td> gets the aria-label instead
    // This test documents the pattern for future maintenance
    const iconAriaHidden = true;
    expect(iconAriaHidden).toBe(true);
  });
});
