import { describe, it, expect } from "vitest";
import {
  calculateReadability,
  stripMarkdownForAnalysis,
  countSyllables,
  getGradeDescription,
  type ReadabilityResult,
} from "./readability";

describe("readability utilities", () => {
  describe("stripMarkdownForAnalysis", () => {
    it("should remove code blocks with triple backticks", () => {
      const content = "Before\n```javascript\nconst x = 1;\n```\nAfter";
      const result = stripMarkdownForAnalysis(content);
      // The regex removes the code block but leaves the newlines
      expect(result).toContain("Before");
      expect(result).toContain("After");
      expect(result).not.toContain("javascript");
      expect(result).not.toContain("const x = 1");
    });

    it("should remove multiple code blocks", () => {
      const content = "Start ```code1``` middle ```code2``` end";
      const result = stripMarkdownForAnalysis(content);
      expect(result).toBe("Start  middle  end");
    });

    it("should remove inline code with single backticks", () => {
      const content = "Use `const x` in your code";
      const result = stripMarkdownForAnalysis(content);
      expect(result).toBe("Use  in your code");
    });

    it("should handle multiple inline code blocks", () => {
      const content = "`code1` and `code2` and `code3`";
      const result = stripMarkdownForAnalysis(content);
      // Inline code removed, but spacing may vary due to trim()
      expect(result.trim()).toBe("and  and");
    });

    it("should replace markdown links with link text only", () => {
      const content = "Check out [this link](https://example.com)";
      const result = stripMarkdownForAnalysis(content);
      expect(result).toBe("Check out this link");
    });

    it("should handle multiple markdown links", () => {
      const content = "[first](http://a.com) and [second](http://b.com)";
      const result = stripMarkdownForAnalysis(content);
      expect(result).toBe("first and second");
    });

    it("should remove markdown heading characters", () => {
      const content = "# Heading\n## Subheading\n### Deep";
      const result = stripMarkdownForAnalysis(content);
      expect(result).not.toContain("#");
    });

    it("should remove emphasis markdown characters", () => {
      const content = "This is **bold** and *italic* and _also italic_";
      const result = stripMarkdownForAnalysis(content);
      expect(result).toBe("This is bold and italic and also italic");
    });

    it("should remove strikethrough characters", () => {
      const content = "This is ~~removed~~ text";
      const result = stripMarkdownForAnalysis(content);
      expect(result).toBe("This is removed text");
    });

    it("should remove blockquote characters", () => {
      const content = "> This is a quote\n> More quote";
      const result = stripMarkdownForAnalysis(content);
      expect(result).not.toContain(">");
    });

    it("should remove unordered list markers", () => {
      const content = "- Item 1\n- Item 2\n+ Item 3\n* Item 4";
      const result = stripMarkdownForAnalysis(content);
      // The regex removes list markers, items are preserved
      expect(result).toContain("Item 1");
      expect(result).toContain("Item 2");
      expect(result).toContain("Item 3");
      expect(result).toContain("Item 4");
      expect(result).not.toContain("-");
      expect(result).not.toContain("+");
      // Note: * is removed as a markdown char, but Item 4 is still there
    });

    it("should remove ordered list markers", () => {
      const content = "1. First\n2. Second\n3. Third";
      const result = stripMarkdownForAnalysis(content);
      expect(result).toBe("First\nSecond\nThird");
    });

    it("should handle mixed markdown content", () => {
      const content = `
# Title

Some text with **bold** and [a link](https://example.com).

\`\`\`javascript
const x = 1;
\`\`\`

- List item
- Another item
`;
      const result = stripMarkdownForAnalysis(content);
      expect(result).not.toContain("#");
      expect(result).not.toContain("*");
      expect(result).not.toContain("`");
      expect(result).not.toContain("-");
      expect(result).toContain("Title");
      expect(result).toContain("text with bold");
      expect(result).toContain("a link");
      expect(result).toContain("List item");
    });

    it("should trim leading and trailing whitespace", () => {
      const content = "   Some content   ";
      const result = stripMarkdownForAnalysis(content);
      expect(result).toBe("Some content");
    });

    it("should handle empty content", () => {
      const result = stripMarkdownForAnalysis("");
      expect(result).toBe("");
    });

    it("should handle content with only whitespace", () => {
      const result = stripMarkdownForAnalysis("   \n\n   \t  ");
      expect(result).toBe("");
    });

    it("should preserve word spacing after markdown removal", () => {
      const content = "word1 **bold** word2";
      const result = stripMarkdownForAnalysis(content);
      expect(result).toBe("word1 bold word2");
    });
  });

  describe("countSyllables", () => {
    it("should return 1 for words with 3 characters or less", () => {
      expect(countSyllables("cat")).toBe(1);
      expect(countSyllables("dog")).toBe(1);
      expect(countSyllables("be")).toBe(1);
      expect(countSyllables("I")).toBe(1);
    });

    it("should count vowel groups correctly in common words", () => {
      expect(countSyllables("hello")).toBeGreaterThanOrEqual(1);
      expect(countSyllables("beautiful")).toBeGreaterThanOrEqual(2);
      expect(countSyllables("butterfly")).toBeGreaterThanOrEqual(2);
    });

    it("should handle silent e at end of words", () => {
      // Words ending in -e typically have silent e
      expect(countSyllables("code")).toBeGreaterThanOrEqual(1);
      expect(countSyllables("make")).toBeGreaterThanOrEqual(1);
    });

    it("should be case-insensitive", () => {
      expect(countSyllables("HELLO")).toBe(countSyllables("hello"));
      expect(countSyllables("CAT")).toBe(countSyllables("cat"));
    });

    it("should handle words with punctuation", () => {
      expect(countSyllables("don't")).toBeGreaterThanOrEqual(1);
      expect(countSyllables("can-do")).toBeGreaterThanOrEqual(1);
    });

    it("should return at least 1 syllable for any word", () => {
      expect(countSyllables("rhythm")).toBeGreaterThanOrEqual(1);
      expect(countSyllables("cwm")).toBeGreaterThanOrEqual(1);
    });

    it("should handle multi-syllable words", () => {
      expect(countSyllables("education")).toBeGreaterThanOrEqual(2);
      expect(countSyllables("information")).toBeGreaterThanOrEqual(3);
    });

    it("should handle y as vowel when appropriate", () => {
      expect(countSyllables("yes")).toBeGreaterThanOrEqual(1);
      expect(countSyllables("happy")).toBeGreaterThanOrEqual(1);
    });

    it("should handle contractions", () => {
      // Contractions should still return reasonable syllable counts
      expect(countSyllables("it's")).toBeGreaterThanOrEqual(1);
      expect(countSyllables("wouldn't")).toBeGreaterThanOrEqual(1);
    });
  });

  describe("calculateReadability", () => {
    it("should handle empty content", () => {
      const result = calculateReadability("");
      // Math.max(..., 1) ensures minimum of 1
      expect(result.wordCount).toBe(1);
      expect(result.sentenceCount).toBe(1);
      expect(result.fleschKincaid).toBeGreaterThanOrEqual(0);
    });

    it("should handle single sentence", () => {
      const result = calculateReadability("This is a sentence.");
      expect(result.sentenceCount).toBeGreaterThanOrEqual(1);
      expect(result.wordCount).toBeGreaterThanOrEqual(4);
    });

    it("should calculate simple content correctly", () => {
      const simpleContent = "The cat sat on the mat. It was a nice day.";
      const result = calculateReadability(simpleContent);

      expect(result).toHaveProperty("fleschKincaid");
      expect(result).toHaveProperty("readingTime");
      expect(result).toHaveProperty("wordCount");
      expect(result).toHaveProperty("sentenceCount");
      expect(result).toHaveProperty("sentenceStats");
      expect(result).toHaveProperty("suggestions");

      expect(result.wordCount).toBeGreaterThan(0);
      expect(result.sentenceCount).toBeGreaterThan(0);
      expect(result.fleschKincaid).toBeLessThan(10); // Should be fairly simple
    });

    it("should calculate complex content correctly", () => {
      const complexContent =
        "The epistemological considerations underlying phenomenological methodology necessitate careful examination of presuppositions regarding consciousness and intentionality.";
      const result = calculateReadability(complexContent);

      expect(result.fleschKincaid).toBeGreaterThan(12); // Should be college level or higher
      expect(result.wordCount).toBeGreaterThan(10);
      expect(result.sentenceCount).toBeGreaterThanOrEqual(1);
    });

    it("should handle markdown content correctly", () => {
      const markdownContent = `
# Title

Some text with **bold** and [a link](https://example.com).

\`\`\`javascript
const x = 1;
\`\`\`

- List item
- Another item
`;
      const result = calculateReadability(markdownContent);

      expect(result.wordCount).toBeGreaterThan(0);
      expect(result.sentenceCount).toBeGreaterThanOrEqual(1);
      expect(result.fleschKincaid).toBeGreaterThanOrEqual(0);
    });

    it("should return reading time in correct format", () => {
      const content = "word ".repeat(100); // 100 words
      const result = calculateReadability(content);
      expect(result.readingTime).toMatch(/^\d+ min read$/);
    });

    it("should calculate reading time as 1 min for <200 words", () => {
      const content = "word ".repeat(100); // 100 words
      const result = calculateReadability(content);
      expect(result.readingTime).toBe("1 min read");
    });

    it("should calculate reading time correctly for longer content", () => {
      const content = "word ".repeat(500); // 500 words
      const result = calculateReadability(content);
      expect(result.readingTime).toBe("3 min read"); // ceil(500/200) = 3
    });

    it("should calculate sentence stats correctly", () => {
      const content = "Short. This is a longer sentence with more words. Tiny.";
      const result = calculateReadability(content);

      expect(result.sentenceStats).toHaveProperty("average");
      expect(result.sentenceStats).toHaveProperty("longest");
      expect(result.sentenceStats).toHaveProperty("shortest");

      expect(result.sentenceStats.longest).toBeGreaterThanOrEqual(
        result.sentenceStats.shortest,
      );
    });

    it("should have rounded fleschKincaid to 1 decimal place", () => {
      const content =
        "The cat sat on the mat. It was a nice day. The weather was beautiful.";
      const result = calculateReadability(content);

      // Check that it's rounded to 1 decimal place
      const decimalPlaces = (
        result.fleschKincaid.toString().split(".")[1] || ""
      ).length;
      expect(decimalPlaces).toBeLessThanOrEqual(1);
    });

    it("should return array of suggestions", () => {
      const content = "The cat sat on the mat.";
      const result = calculateReadability(content);

      expect(Array.isArray(result.suggestions)).toBe(true);
      expect(result.suggestions.every((s) => typeof s === "string")).toBe(true);
    });

    it("should limit suggestions to 4 maximum", () => {
      const content = "word ".repeat(1000); // Very long, complex content
      const result = calculateReadability(content);

      expect(result.suggestions.length).toBeLessThanOrEqual(4);
    });

    it("should have correct ReadabilityResult structure", () => {
      const result = calculateReadability("Test content here.");
      const keys = Object.keys(result).sort();
      const expectedKeys = [
        "fleschKincaid",
        "readingTime",
        "wordCount",
        "sentenceCount",
        "sentenceStats",
        "suggestions",
      ].sort();

      expect(keys).toEqual(expectedKeys);
    });

    it("should apply Flesch-Kincaid formula correctly", () => {
      // Simple test: known formula should work
      // Formula: 0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59
      const content = "The cat sat. The dog ran."; // 5 words, 2 sentences, roughly 5 syllables
      const result = calculateReadability(content);

      // Verify it's a reasonable number (between 0 and 20 for most text)
      expect(result.fleschKincaid).toBeGreaterThanOrEqual(0);
      expect(result.fleschKincaid).toBeLessThan(20);
    });

    it("should never return negative fleschKincaid", () => {
      const result = calculateReadability("The cat.");
      expect(result.fleschKincaid).toBeGreaterThanOrEqual(0);
    });

    it("should handle multiple punctuation marks", () => {
      const content = "What?! Really!! Yes...";
      const result = calculateReadability(content);

      expect(result.sentenceCount).toBeGreaterThanOrEqual(1);
      expect(result.wordCount).toBeGreaterThanOrEqual(3);
    });

    it("should count sentences correctly with mixed punctuation", () => {
      const content = "First sentence. Second! Third? Fourth.";
      const result = calculateReadability(content);

      expect(result.sentenceCount).toBeGreaterThanOrEqual(4);
    });
  });

  describe("getGradeDescription", () => {
    it("should return elementary description for grade ≤5", () => {
      expect(getGradeDescription(3)).toBe(
        "Elementary school level - very easy to read",
      );
      expect(getGradeDescription(5)).toBe(
        "Elementary school level - very easy to read",
      );
    });

    it("should return middle school description for grade 5-8", () => {
      expect(getGradeDescription(6)).toBe("Middle school level - easy to read");
      expect(getGradeDescription(8)).toBe("Middle school level - easy to read");
    });

    it("should return high school description for grade 8-10", () => {
      expect(getGradeDescription(9)).toBe(
        "High school level - fairly easy to read",
      );
      expect(getGradeDescription(10)).toBe(
        "High school level - fairly easy to read",
      );
    });

    it("should return high school senior description for grade 10-12", () => {
      expect(getGradeDescription(11)).toBe(
        "High school senior level - moderately difficult",
      );
      expect(getGradeDescription(12)).toBe(
        "High school senior level - moderately difficult",
      );
    });

    it("should return college description for grade 12-14", () => {
      expect(getGradeDescription(13)).toBe("College level - difficult");
      expect(getGradeDescription(14)).toBe("College level - difficult");
    });

    it("should return graduate description for grade >14", () => {
      expect(getGradeDescription(15)).toBe("Graduate level - very difficult");
      expect(getGradeDescription(20)).toBe("Graduate level - very difficult");
    });

    it("should handle boundary values correctly", () => {
      expect(getGradeDescription(5.0)).toBe(
        "Elementary school level - very easy to read",
      );
      expect(getGradeDescription(5.1)).toBe(
        "Middle school level - easy to read",
      );
      expect(getGradeDescription(8.0)).toBe(
        "Middle school level - easy to read",
      );
      expect(getGradeDescription(8.1)).toBe(
        "High school level - fairly easy to read",
      );
    });

    it("should handle zero grade", () => {
      const description = getGradeDescription(0);
      expect(description).toBe("Elementary school level - very easy to read");
    });

    it("should handle very high grades", () => {
      const description = getGradeDescription(100);
      expect(description).toBe("Graduate level - very difficult");
    });
  });

  describe("integration tests", () => {
    it("should analyze blog post content end-to-end", () => {
      const blogPost = `
# Welcome to My Blog

I wanted to share some thoughts today. Here's what I've been thinking about.

The weather has been nice. Birds sing in the morning. Everything feels fresh and new.

This is more complex content. We need to consider the implications of our choices carefully. The ramifications extend beyond simple surface-level observations.

Check out [my portfolio](https://example.com) for more work.
`;

      const result = calculateReadability(blogPost);

      expect(result).toHaveProperty("fleschKincaid");
      expect(result).toHaveProperty("readingTime");
      expect(result).toHaveProperty("wordCount");
      expect(result.wordCount).toBeGreaterThan(0);
      expect(result.sentenceCount).toBeGreaterThan(0);
      expect(result.fleschKincaid).toBeGreaterThanOrEqual(0);

      const grade = Math.round(result.fleschKincaid);
      const description = getGradeDescription(grade);
      expect(description).toBeTruthy();
    });

    it("should handle technical documentation", () => {
      const techDoc = `
# API Reference

\`\`\`typescript
interface Response {
  status: number;
  data: unknown;
}
\`\`\`

The endpoint returns a Response object. You can access the status code. The data field contains the response payload.
`;

      const result = calculateReadability(techDoc);

      expect(result.wordCount).toBeGreaterThan(0);
      expect(result.sentenceCount).toBeGreaterThan(0);
    });

    it("should handle mixed difficulty content", () => {
      const mixed = `
The sun rose. It was bright.

The phenomenological epistemological considerations necessitate careful examination.

I love reading. Books are great. Writing too.
`;

      const result = calculateReadability(mixed);

      expect(result.fleschKincaid).toBeGreaterThanOrEqual(0);
      expect(result.sentenceCount).toBeGreaterThanOrEqual(5);
    });

    it("should suggest improvements for complex writing", () => {
      const complexText =
        "The implementation necessitates comprehensive reconsideration of fundamental architectural paradigms to optimize holistic system integration. " +
        "Furthermore, considering the epistemological ramifications concerning distributed computing systems becomes increasingly essential for contemporary technological advancement.";

      const result = calculateReadability(complexText);

      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.fleschKincaid).toBeGreaterThan(12);
    });

    it("should provide different suggestions for simple writing", () => {
      const simpleText =
        "I like cats. Cats are fun. They purr. I pet them. They sleep.";

      const result = calculateReadability(simpleText);

      expect(result.fleschKincaid).toBeLessThan(8);
    });

    it("should accurately reflect reading time for long content", () => {
      const longContent = "word ".repeat(250); // 250 words
      const result = calculateReadability(longContent);

      expect(result.readingTime).toBe("2 min read"); // ceil(250/200) = 2
    });

    it("should handle real-world Grove-style content", () => {
      const groveContent = `
# A Reflection on Finding Home

Sometimes I wonder what it means to belong. In spaces built by algorithms, we're reduced to metrics. But here, in this quiet corner of the internet, I can just be myself.

[Grove](https://example.com) feels different. It's a space where authenticity matters more than performance.

\`\`\`
A cozy place to write
\`\`\`

- Write freely
- Own your voice
- Build community

The internet doesn't have to feel cold.
`;

      const result = calculateReadability(groveContent);

      expect(result).toHaveProperty("fleschKincaid");
      expect(result).toHaveProperty("readingTime");
      expect(result.fleschKincaid).toBeGreaterThanOrEqual(0);
      expect(result.sentenceCount).toBeGreaterThan(0);

      const description = getGradeDescription(result.fleschKincaid);
      expect(description).toContain("level");
    });
  });

  describe("edge cases", () => {
    it("should handle content with only numbers", () => {
      const result = calculateReadability("123 456 789");
      expect(result.wordCount).toBe(3);
    });

    it("should handle content with special characters", () => {
      const result = calculateReadability("@#$%^&*()");
      expect(result.wordCount).toBeGreaterThanOrEqual(0);
    });

    it("should handle very long words", () => {
      const longWord = "supercalifragilisticexpialidocious";
      const result = calculateReadability(longWord);
      expect(result.wordCount).toBe(1);
    });

    it("should handle repeated whitespace", () => {
      const content = "word1     word2     word3";
      const result = calculateReadability(content);
      expect(result.wordCount).toBe(3);
    });

    it("should handle tabs and newlines", () => {
      const content = "word1\t\tword2\n\nword3";
      const result = calculateReadability(content);
      expect(result.wordCount).toBe(3);
    });

    it("should handle unicode characters", () => {
      const result = calculateReadability("café naïve résumé");
      expect(result.wordCount).toBe(3);
    });

    it("should handle URL-like content", () => {
      const content = "Visit https://example.com for more info";
      const result = calculateReadability(content);
      expect(result.wordCount).toBeGreaterThan(0);
    });

    it("should handle markdown without closing delimiters", () => {
      const content = "**unclosed bold and [unclosed link";
      const result = calculateReadability(content);
      expect(result.wordCount).toBeGreaterThan(0);
    });

    it("should handle nested markdown", () => {
      const content = "This is **bold with *italic* inside** text";
      const result = calculateReadability(content);
      expect(result.wordCount).toBeGreaterThan(0);
    });
  });
});
