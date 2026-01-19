import { describe, it, expect } from "vitest";
import {
  hashString,
  selectStarterPrompt,
  estimateTokens,
  estimateConversationTokens,
  isConversationTooLong,
  canDraft,
  generateConversationId,
  isValidConversationId,
  generateMessageId,
  type FiresideMessage,
  STARTER_PROMPTS,
  MIN_MESSAGES_FOR_DRAFT,
  MIN_TOKENS_FOR_DRAFT,
  CHARS_PER_TOKEN,
  MAX_CONVERSATION_TOKENS,
} from "./fireside";

describe("Fireside pure functions", () => {
  // ============================================================================
  // hashString Tests
  // ============================================================================

  describe("hashString", () => {
    it("returns consistent hash for same input", () => {
      const hash1 = hashString("test-user:2024-01-15");
      const hash2 = hashString("test-user:2024-01-15");
      expect(hash1).toBe(hash2);
    });

    it("returns different hashes for different inputs", () => {
      const hash1 = hashString("user-a:2024-01-15");
      const hash2 = hashString("user-b:2024-01-15");
      expect(hash1).not.toBe(hash2);
    });

    it("returns non-negative numbers", () => {
      const testStrings = [
        "short",
        "a much longer string with more characters",
        "special!@#$%^&*()",
        "unicode: 你好世界",
        "",
      ];

      for (const str of testStrings) {
        expect(hashString(str)).toBeGreaterThanOrEqual(0);
      }
    });

    it("handles empty string", () => {
      const hash = hashString("");
      expect(hash).toBe(0);
    });
  });

  // ============================================================================
  // selectStarterPrompt Tests
  // ============================================================================

  describe("selectStarterPrompt", () => {
    it("returns a prompt from the STARTER_PROMPTS array", () => {
      const prompt = selectStarterPrompt("user-123", "2024-01-15");
      expect(STARTER_PROMPTS).toContain(prompt);
    });

    it("returns same prompt for same user on same day", () => {
      const prompt1 = selectStarterPrompt("user-123", "2024-01-15");
      const prompt2 = selectStarterPrompt("user-123", "2024-01-15");
      expect(prompt1).toBe(prompt2);
    });

    it("returns different prompts for same user on different days", () => {
      // Note: This test could theoretically fail if two days hash to the same prompt
      // but it's unlikely given the number of prompts
      const prompts = new Set<string>();
      for (let day = 1; day <= 30; day++) {
        const date = `2024-01-${day.toString().padStart(2, "0")}`;
        prompts.add(selectStarterPrompt("consistent-user", date));
      }
      // Should have at least a few different prompts over 30 days
      expect(prompts.size).toBeGreaterThan(1);
    });

    it("returns different prompts for different users on same day", () => {
      const prompt1 = selectStarterPrompt("user-alice", "2024-01-15");
      const prompt2 = selectStarterPrompt("user-bob", "2024-01-15");
      // These could theoretically be the same, but it's unlikely
      // We're mainly testing that the function runs without error
      expect(STARTER_PROMPTS).toContain(prompt1);
      expect(STARTER_PROMPTS).toContain(prompt2);
    });
  });

  // ============================================================================
  // estimateTokens Tests
  // ============================================================================

  describe("estimateTokens", () => {
    it("estimates tokens based on character count", () => {
      // 4 characters = 1 token
      expect(estimateTokens("test")).toBe(1);
      expect(estimateTokens("testtest")).toBe(2);
    });

    it("rounds up for partial tokens", () => {
      // 5 characters should round up to 2 tokens
      expect(estimateTokens("hello")).toBe(2);
      // 1 character should round up to 1 token
      expect(estimateTokens("a")).toBe(1);
    });

    it("returns 0 for empty string", () => {
      expect(estimateTokens("")).toBe(0);
    });

    it("handles longer text correctly", () => {
      const text = "a".repeat(100); // 100 characters
      expect(estimateTokens(text)).toBe(25); // 100 / 4 = 25
    });

    it("uses correct CHARS_PER_TOKEN ratio", () => {
      const chars = 100;
      const text = "x".repeat(chars);
      expect(estimateTokens(text)).toBe(Math.ceil(chars / CHARS_PER_TOKEN));
    });
  });

  // ============================================================================
  // estimateConversationTokens Tests
  // ============================================================================

  describe("estimateConversationTokens", () => {
    it("sums tokens across all messages", () => {
      const conversation: FiresideMessage[] = [
        { role: "wisp", content: "test", timestamp: "2024-01-01T00:00:00Z" }, // 1 token
        { role: "user", content: "testtest", timestamp: "2024-01-01T00:00:01Z" }, // 2 tokens
      ];
      expect(estimateConversationTokens(conversation)).toBe(3);
    });

    it("returns 0 for empty conversation", () => {
      expect(estimateConversationTokens([])).toBe(0);
    });

    it("includes both wisp and user messages", () => {
      const conversation: FiresideMessage[] = [
        { role: "wisp", content: "a".repeat(40), timestamp: "2024-01-01T00:00:00Z" }, // 10 tokens
        { role: "user", content: "b".repeat(80), timestamp: "2024-01-01T00:00:01Z" }, // 20 tokens
        { role: "wisp", content: "c".repeat(40), timestamp: "2024-01-01T00:00:02Z" }, // 10 tokens
      ];
      expect(estimateConversationTokens(conversation)).toBe(40);
    });
  });

  // ============================================================================
  // isConversationTooLong Tests
  // ============================================================================

  describe("isConversationTooLong", () => {
    it("returns false for empty conversation", () => {
      expect(isConversationTooLong([])).toBe(false);
    });

    it("returns false for short conversation", () => {
      const conversation: FiresideMessage[] = [
        { role: "wisp", content: "Hello!", timestamp: "2024-01-01T00:00:00Z" },
        { role: "user", content: "Hi there!", timestamp: "2024-01-01T00:00:01Z" },
      ];
      expect(isConversationTooLong(conversation)).toBe(false);
    });

    it("returns true when conversation exceeds MAX_CONVERSATION_TOKENS", () => {
      // Create a conversation that exceeds 120k tokens
      // 120k tokens * 4 chars = 480k characters
      const longContent = "x".repeat(500000); // Well over the limit
      const conversation: FiresideMessage[] = [
        { role: "user", content: longContent, timestamp: "2024-01-01T00:00:00Z" },
      ];
      expect(isConversationTooLong(conversation)).toBe(true);
    });

    it("returns false just under the limit", () => {
      // Just under the limit
      const underLimit = "x".repeat((MAX_CONVERSATION_TOKENS * CHARS_PER_TOKEN) - 10);
      const conversation: FiresideMessage[] = [
        { role: "user", content: underLimit, timestamp: "2024-01-01T00:00:00Z" },
      ];
      expect(isConversationTooLong(conversation)).toBe(false);
    });
  });

  // ============================================================================
  // canDraft Tests
  // ============================================================================

  describe("canDraft", () => {
    it("returns false for empty conversation", () => {
      expect(canDraft([])).toBe(false);
    });

    it("returns false with only wisp messages", () => {
      const conversation: FiresideMessage[] = [
        { role: "wisp", content: "What's on your mind?", timestamp: "2024-01-01T00:00:00Z" },
        { role: "wisp", content: "Tell me more.", timestamp: "2024-01-01T00:00:01Z" },
        { role: "wisp", content: "That's interesting!", timestamp: "2024-01-01T00:00:02Z" },
      ];
      expect(canDraft(conversation)).toBe(false);
    });

    it("returns false with insufficient user messages", () => {
      const conversation: FiresideMessage[] = [
        { role: "wisp", content: "What's on your mind?", timestamp: "2024-01-01T00:00:00Z" },
        { role: "user", content: "I have thoughts.", timestamp: "2024-01-01T00:00:01Z" },
        { role: "wisp", content: "Tell me more.", timestamp: "2024-01-01T00:00:02Z" },
        { role: "user", content: "More thoughts here.", timestamp: "2024-01-01T00:00:03Z" },
      ];
      // Only 2 user messages, need MIN_MESSAGES_FOR_DRAFT (3)
      expect(canDraft(conversation)).toBe(false);
    });

    it("returns false with enough messages but insufficient tokens", () => {
      const conversation: FiresideMessage[] = [
        { role: "wisp", content: "What's on your mind?", timestamp: "2024-01-01T00:00:00Z" },
        { role: "user", content: "Hi", timestamp: "2024-01-01T00:00:01Z" }, // 1 token
        { role: "wisp", content: "Tell me more.", timestamp: "2024-01-01T00:00:02Z" },
        { role: "user", content: "Ok", timestamp: "2024-01-01T00:00:03Z" }, // 1 token
        { role: "wisp", content: "And?", timestamp: "2024-01-01T00:00:04Z" },
        { role: "user", content: "Bye", timestamp: "2024-01-01T00:00:05Z" }, // 1 token
      ];
      // 3 user messages but only ~3 tokens, need MIN_TOKENS_FOR_DRAFT (150)
      expect(canDraft(conversation)).toBe(false);
    });

    it("returns true with sufficient messages and tokens", () => {
      // Need MIN_MESSAGES_FOR_DRAFT messages and MIN_TOKENS_FOR_DRAFT tokens
      const substantialContent = "x".repeat(MIN_TOKENS_FOR_DRAFT * CHARS_PER_TOKEN);
      const conversation: FiresideMessage[] = [
        { role: "wisp", content: "What's on your mind?", timestamp: "2024-01-01T00:00:00Z" },
        { role: "user", content: substantialContent, timestamp: "2024-01-01T00:00:01Z" },
        { role: "wisp", content: "Tell me more.", timestamp: "2024-01-01T00:00:02Z" },
        { role: "user", content: "More thoughts.", timestamp: "2024-01-01T00:00:03Z" },
        { role: "wisp", content: "That's interesting.", timestamp: "2024-01-01T00:00:04Z" },
        { role: "user", content: "Final thought.", timestamp: "2024-01-01T00:00:05Z" },
      ];
      expect(canDraft(conversation)).toBe(true);
    });

    it("only counts user messages, not wisp messages", () => {
      // Even if wisp has lots of content, it shouldn't count toward canDraft
      const conversation: FiresideMessage[] = [
        { role: "wisp", content: "x".repeat(1000), timestamp: "2024-01-01T00:00:00Z" },
        { role: "user", content: "short", timestamp: "2024-01-01T00:00:01Z" },
        { role: "wisp", content: "x".repeat(1000), timestamp: "2024-01-01T00:00:02Z" },
        { role: "user", content: "short", timestamp: "2024-01-01T00:00:03Z" },
        { role: "wisp", content: "x".repeat(1000), timestamp: "2024-01-01T00:00:04Z" },
        { role: "user", content: "short", timestamp: "2024-01-01T00:00:05Z" },
      ];
      // 3 user messages but very few tokens from user
      expect(canDraft(conversation)).toBe(false);
    });
  });

  // ============================================================================
  // generateConversationId Tests
  // ============================================================================

  describe("generateConversationId", () => {
    it("generates a string", () => {
      const id = generateConversationId();
      expect(typeof id).toBe("string");
    });

    it("includes a timestamp component", () => {
      const before = Date.now();
      const id = generateConversationId();
      const after = Date.now();

      const timestampPart = parseInt(id.split("-")[0], 10);
      expect(timestampPart).toBeGreaterThanOrEqual(before);
      expect(timestampPart).toBeLessThanOrEqual(after);
    });

    it("generates unique IDs", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateConversationId());
      }
      // All 100 IDs should be unique
      expect(ids.size).toBe(100);
    });

    it("follows expected format (timestamp-random)", () => {
      const id = generateConversationId();
      const parts = id.split("-");
      expect(parts.length).toBe(2);
      expect(parts[0]).toMatch(/^\d+$/); // Timestamp is numeric
      expect(parts[1]).toMatch(/^[a-z0-9]+$/); // Random part is alphanumeric
    });
  });

  // ============================================================================
  // isValidConversationId Tests
  // ============================================================================

  describe("isValidConversationId", () => {
    it("returns true for valid IDs generated by generateConversationId", () => {
      const id = generateConversationId();
      expect(isValidConversationId(id)).toBe(true);
    });

    it("returns true for valid ID format", () => {
      expect(isValidConversationId("1704067200000-abc123xyz")).toBe(true);
      expect(isValidConversationId("1704067200000-abcdefghij")).toBe(true);
    });

    it("returns false for undefined or null", () => {
      expect(isValidConversationId(undefined)).toBe(false);
      expect(isValidConversationId(null as unknown as string)).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isValidConversationId("")).toBe(false);
    });

    it("returns false for malicious input", () => {
      // SQL injection attempts
      expect(isValidConversationId("'; DROP TABLE users; --")).toBe(false);
      expect(isValidConversationId("1' OR '1'='1")).toBe(false);

      // XSS attempts
      expect(isValidConversationId("<script>alert('xss')</script>")).toBe(false);
      expect(isValidConversationId("javascript:alert(1)")).toBe(false);

      // Path traversal
      expect(isValidConversationId("../../../etc/passwd")).toBe(false);

      // Unicode/special chars
      expect(isValidConversationId("1704067200000-αβγ")).toBe(false);
      expect(isValidConversationId("1704067200000-a b c")).toBe(false);
    });

    it("returns false for incorrect format", () => {
      // Missing timestamp
      expect(isValidConversationId("abc123")).toBe(false);

      // Missing random part
      expect(isValidConversationId("1704067200000-")).toBe(false);

      // Timestamp too short
      expect(isValidConversationId("123-abc123xyz")).toBe(false);

      // Random part too short
      expect(isValidConversationId("1704067200000-abc")).toBe(false);

      // Random part too long
      expect(isValidConversationId("1704067200000-abcdefghijklmnop")).toBe(false);

      // Wrong separator
      expect(isValidConversationId("1704067200000_abc123xyz")).toBe(false);
    });
  });

  // ============================================================================
  // generateMessageId Tests
  // ============================================================================

  describe("generateMessageId", () => {
    it("generates a valid UUID", () => {
      const id = generateMessageId();
      // UUID v4 format: 8-4-4-4-12 hex characters
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(id).toMatch(uuidPattern);
    });

    it("generates unique IDs", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateMessageId());
      }
      expect(ids.size).toBe(100);
    });

    it("generates different ID each call", () => {
      const id1 = generateMessageId();
      const id2 = generateMessageId();
      expect(id1).not.toBe(id2);
    });
  });
});
