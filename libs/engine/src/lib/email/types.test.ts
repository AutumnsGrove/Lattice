/**
 * Email Types and Sequence Configuration Tests
 *
 * Tests for the email infrastructure type definitions and sequence config:
 * - Audience type coverage
 * - Sequence stage values
 * - Sequence configuration completeness
 * - Day offset consistency
 *
 * @vitest-environment node
 */

import { describe, it, expect } from "vitest";
import { SEQUENCES, type AudienceType, type SequenceStage } from "./types";

// =============================================================================
// AUDIENCE TYPE TESTS
// =============================================================================

describe("AudienceType", () => {
  const validAudiences: AudienceType[] = ["wanderer", "promo", "rooted"];

  it("should have exactly three audience types", () => {
    expect(Object.keys(SEQUENCES)).toHaveLength(3);
  });

  it.each(validAudiences)("should support '%s' audience type", (audience) => {
    expect(SEQUENCES).toHaveProperty(audience);
    expect(Array.isArray(SEQUENCES[audience])).toBe(true);
  });

  it("should have wanderer as the default landing page audience", () => {
    expect(SEQUENCES.wanderer).toBeDefined();
  });

  it("should have promo for Plant signups", () => {
    expect(SEQUENCES.promo).toBeDefined();
  });

  it("should have rooted for subscribers", () => {
    expect(SEQUENCES.rooted).toBeDefined();
  });
});

// =============================================================================
// SEQUENCE STAGE TESTS
// =============================================================================

describe("SequenceStage", () => {
  const validStages: SequenceStage[] = [0, 1, 7, 14, 30, -1];

  it("should include welcome stage (0)", () => {
    expect(validStages).toContain(0);
  });

  it("should include day 1 stage", () => {
    expect(validStages).toContain(1);
  });

  it("should include day 7 stage", () => {
    expect(validStages).toContain(7);
  });

  it("should include day 14 stage", () => {
    expect(validStages).toContain(14);
  });

  it("should include day 30 stage", () => {
    expect(validStages).toContain(30);
  });

  it("should include complete stage (-1)", () => {
    expect(validStages).toContain(-1);
  });
});

// =============================================================================
// WANDERER SEQUENCE TESTS
// =============================================================================

describe("Wanderer Sequence", () => {
  const wandererSequence = SEQUENCES.wanderer;

  it("should have 4 emails in the sequence", () => {
    expect(wandererSequence).toHaveLength(4);
  });

  it("should start with welcome email on day 0", () => {
    expect(wandererSequence[0].dayOffset).toBe(0);
    expect(wandererSequence[0].template).toBe("WelcomeEmail");
  });

  it("should have day 7 follow-up", () => {
    const day7 = wandererSequence.find((e) => e.dayOffset === 7);
    expect(day7).toBeDefined();
    expect(day7?.template).toBe("Day7Email");
  });

  it("should have day 14 philosophy email", () => {
    const day14 = wandererSequence.find((e) => e.dayOffset === 14);
    expect(day14).toBeDefined();
    expect(day14?.template).toBe("Day14Email");
  });

  it("should have day 30 check-in", () => {
    const day30 = wandererSequence.find((e) => e.dayOffset === 30);
    expect(day30).toBeDefined();
    expect(day30?.template).toBe("Day30Email");
  });

  it("should have emails in ascending day order", () => {
    const offsets = wandererSequence.map((e) => e.dayOffset);
    const sorted = [...offsets].sort((a, b) => a - b);
    expect(offsets).toEqual(sorted);
  });

  it("should have subjects for all emails", () => {
    wandererSequence.forEach((email) => {
      expect(email.subject).toBeTruthy();
      expect(email.subject.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// PROMO SEQUENCE TESTS
// =============================================================================

describe("Promo Sequence", () => {
  const promoSequence = SEQUENCES.promo;

  it("should have only 2 emails (short and honest)", () => {
    expect(promoSequence).toHaveLength(2);
  });

  it("should start with welcome email on day 0", () => {
    expect(promoSequence[0].dayOffset).toBe(0);
    expect(promoSequence[0].template).toBe("WelcomeEmail");
  });

  it("should have a single follow-up on day 7", () => {
    expect(promoSequence[1].dayOffset).toBe(7);
    expect(promoSequence[1].template).toBe("Day7Email");
  });

  it("should not have day 14 or day 30 emails", () => {
    const hasDay14 = promoSequence.some((e) => e.dayOffset === 14);
    const hasDay30 = promoSequence.some((e) => e.dayOffset === 30);
    expect(hasDay14).toBe(false);
    expect(hasDay30).toBe(false);
  });

  it("should have distinct subject from wanderer welcome", () => {
    expect(promoSequence[0].subject).not.toBe(SEQUENCES.wanderer[0].subject);
  });
});

// =============================================================================
// ROOTED SEQUENCE TESTS
// =============================================================================

describe("Rooted Sequence", () => {
  const rootedSequence = SEQUENCES.rooted;

  it("should have 3 emails", () => {
    expect(rootedSequence).toHaveLength(3);
  });

  it("should start with welcome email on day 0", () => {
    expect(rootedSequence[0].dayOffset).toBe(0);
    expect(rootedSequence[0].template).toBe("WelcomeEmail");
  });

  it("should have day 1 settling-in email (unique to rooted)", () => {
    const day1 = rootedSequence.find((e) => e.dayOffset === 1);
    expect(day1).toBeDefined();
    expect(day1?.template).toBe("Day1Email");
  });

  it("should have day 7 email", () => {
    const day7 = rootedSequence.find((e) => e.dayOffset === 7);
    expect(day7).toBeDefined();
    expect(day7?.template).toBe("Day7Email");
  });

  it("should not have day 14 or day 30 (gets patch notes instead)", () => {
    const hasDay14 = rootedSequence.some((e) => e.dayOffset === 14);
    const hasDay30 = rootedSequence.some((e) => e.dayOffset === 30);
    expect(hasDay14).toBe(false);
    expect(hasDay30).toBe(false);
  });

  it("should have 'Welcome home' subject", () => {
    expect(rootedSequence[0].subject).toContain("home");
  });
});

// =============================================================================
// CROSS-SEQUENCE CONSISTENCY TESTS
// =============================================================================

describe("Sequence Consistency", () => {
  const allSequences = Object.values(SEQUENCES);

  it("all sequences should start with welcome email on day 0", () => {
    allSequences.forEach((sequence) => {
      expect(sequence[0].dayOffset).toBe(0);
      expect(sequence[0].template).toBe("WelcomeEmail");
    });
  });

  it("all sequences should have non-empty template names", () => {
    allSequences.forEach((sequence) => {
      sequence.forEach((email) => {
        expect(email.template).toBeTruthy();
        expect(email.template.length).toBeGreaterThan(0);
      });
    });
  });

  it("all sequences should have non-empty subjects", () => {
    allSequences.forEach((sequence) => {
      sequence.forEach((email) => {
        expect(email.subject).toBeTruthy();
        expect(email.subject.length).toBeGreaterThan(0);
      });
    });
  });

  it("no sequence should have duplicate day offsets", () => {
    allSequences.forEach((sequence) => {
      const offsets = sequence.map((e) => e.dayOffset);
      const uniqueOffsets = new Set(offsets);
      expect(uniqueOffsets.size).toBe(offsets.length);
    });
  });

  it("all day offsets should be non-negative", () => {
    allSequences.forEach((sequence) => {
      sequence.forEach((email) => {
        expect(email.dayOffset).toBeGreaterThanOrEqual(0);
      });
    });
  });
});

// =============================================================================
// TEMPLATE NAMING TESTS
// =============================================================================

describe("Template Naming Convention", () => {
  const allTemplates = Object.values(SEQUENCES)
    .flat()
    .map((e) => e.template);

  it("all templates should use PascalCase", () => {
    allTemplates.forEach((template) => {
      expect(template).toMatch(/^[A-Z][a-zA-Z0-9]*$/);
    });
  });

  it("all templates should end with 'Email'", () => {
    allTemplates.forEach((template) => {
      expect(template).toMatch(/Email$/);
    });
  });

  it("should have unique template names within each audience", () => {
    Object.values(SEQUENCES).forEach((sequence) => {
      const templates = sequence.map((e) => e.template);
      const uniqueTemplates = new Set(templates);
      expect(uniqueTemplates.size).toBe(templates.length);
    });
  });
});
