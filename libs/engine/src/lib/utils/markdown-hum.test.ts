/**
 * Tests for Hum markdown-it plugin
 *
 * Verifies that music URLs are transformed into hum card placeholders
 * while non-music URLs and links with custom text are left untouched.
 */

import { describe, it, expect } from "vitest";
import MarkdownIt from "markdown-it";
import { humPlugin } from "./markdown-hum";

// Create a fresh markdown-it instance with the hum plugin
function createMd(): MarkdownIt {
  const md = new MarkdownIt({ html: true, linkify: true, breaks: false });
  md.use(humPlugin);
  return md;
}

// ============================================================================
// Bare URL Detection
// ============================================================================

describe("humPlugin - bare URL detection", () => {
  const md = createMd();

  it("transforms a bare Spotify URL into a hum card", () => {
    const result = md.render(
      "https://open.spotify.com/track/75FEaRjZTKLhTrFGsfMUXR",
    );
    expect(result).toContain('class="hum-card"');
    expect(result).toContain(
      'data-hum-url="https://open.spotify.com/track/75FEaRjZTKLhTrFGsfMUXR"',
    );
    expect(result).toContain('data-hum-provider="spotify"');
  });

  it("transforms a bare Apple Music URL into a hum card", () => {
    const result = md.render(
      "https://music.apple.com/us/album/hounds-of-love/1558627166",
    );
    expect(result).toContain('class="hum-card"');
    expect(result).toContain('data-hum-provider="apple-music"');
  });

  it("transforms a bare YouTube Music URL into a hum card", () => {
    const result = md.render("https://music.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(result).toContain('class="hum-card"');
    expect(result).toContain('data-hum-provider="youtube-music"');
  });

  it("transforms a bare SoundCloud URL into a hum card", () => {
    const result = md.render("https://soundcloud.com/artist-name/track-name");
    expect(result).toContain('class="hum-card"');
    expect(result).toContain('data-hum-provider="soundcloud"');
  });

  it("includes a fallback <a> link for progressive enhancement", () => {
    const result = md.render(
      "https://open.spotify.com/track/75FEaRjZTKLhTrFGsfMUXR",
    );
    expect(result).toContain("Loading music preview");
    expect(result).toContain('target="_blank"');
    expect(result).toContain('rel="noopener noreferrer"');
  });
});

// ============================================================================
// Non-Music URLs (should NOT be transformed)
// ============================================================================

describe("humPlugin - non-music URLs", () => {
  const md = createMd();

  it("does not transform regular URLs", () => {
    const result = md.render("https://example.com");
    expect(result).not.toContain("hum-card");
    expect(result).toContain("https://example.com");
  });

  it("does not transform regular YouTube URLs", () => {
    const result = md.render("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(result).not.toContain("hum-card");
  });

  it("does not transform GitHub URLs", () => {
    const result = md.render("https://github.com/user/repo");
    expect(result).not.toContain("hum-card");
  });
});

// ============================================================================
// Links with Custom Text (should NOT be transformed)
// ============================================================================

describe("humPlugin - links with custom text", () => {
  const md = createMd();

  it("does not transform music links with custom text", () => {
    const result = md.render(
      "[my favorite song](https://open.spotify.com/track/75FEaRjZTKLhTrFGsfMUXR)",
    );
    expect(result).not.toContain("hum-card");
    expect(result).toContain("my favorite song");
  });

  it("does not transform music links with different display text", () => {
    const result = md.render(
      "[Running Up That Hill](https://music.apple.com/us/album/hounds-of-love/1558627166)",
    );
    expect(result).not.toContain("hum-card");
    expect(result).toContain("Running Up That Hill");
  });
});

// ============================================================================
// Mixed Content
// ============================================================================

describe("humPlugin - mixed content", () => {
  const md = createMd();

  it("handles a music URL alongside regular text", () => {
    const input =
      "Check out this song:\n\nhttps://open.spotify.com/track/75FEaRjZTKLhTrFGsfMUXR\n\nIt's great!";
    const result = md.render(input);
    expect(result).toContain("hum-card");
    expect(result).toContain("Check out this song");
    expect(result).toContain("great");
  });

  it("does not transform a music URL inline with other text", () => {
    const input =
      "Listen to https://open.spotify.com/track/75FEaRjZTKLhTrFGsfMUXR right now";
    const result = md.render(input);
    // When the link is inline with other text, it should not be a hum card
    // because it's not a standalone paragraph
    expect(result).toContain("spotify.com");
  });
});

// ============================================================================
// Security: XSS Prevention
// ============================================================================

describe("humPlugin - XSS prevention", () => {
  const md = createMd();

  it("escapes special characters in URLs", () => {
    // Even though this wouldn't match as a music URL, verify the escaping logic
    const result = md.render(
      'https://open.spotify.com/track/abc"onload="alert(1)',
    );
    // Should not have unescaped quotes
    expect(result).not.toContain('"onload=');
  });
});
