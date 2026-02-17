/**
 * Tests for Hum provider detection
 *
 * Verifies URL pattern matching for all supported music providers.
 * Security-critical: ensures only legitimate music URLs are detected.
 */

import { describe, it, expect } from "vitest";
import {
  detectProvider,
  isMusicUrl,
  getProviderInfo,
  HUM_PROVIDERS,
} from "$lib/ui/components/content/hum/providers";

// ============================================================================
// detectProvider
// ============================================================================

describe("detectProvider", () => {
  describe("Apple Music", () => {
    it.each([
      "https://music.apple.com/us/album/hounds-of-love/1558627166",
      "https://music.apple.com/us/album/running-up-that-hill/1558627166?i=1558627175",
      "https://music.apple.com/gb/playlist/favorites/pl.u-test123",
      "https://music.apple.com/us/artist/kate-bush/36270",
      "https://music.apple.com/us/music-video/running-up-that-hill/1558627999",
    ])("detects %s as apple-music", (url) => {
      expect(detectProvider(url)).toBe("apple-music");
    });
  });

  describe("Spotify", () => {
    it.each([
      "https://open.spotify.com/track/75FEaRjZTKLhTrFGsfMUXR",
      "https://open.spotify.com/album/1HrMmB5useeZ0F5lHrMvl0",
      "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
      "https://open.spotify.com/artist/1aSxMhuvixZ8h9dK9jIDwL",
      "https://open.spotify.com/episode/512ojhOo1ktJprKbVcKN9Q",
      "https://open.spotify.com/show/2mTUnDkuKUkhiueKcVWoP0",
    ])("detects %s as spotify", (url) => {
      expect(detectProvider(url)).toBe("spotify");
    });
  });

  describe("YouTube Music", () => {
    it.each([
      "https://music.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://music.youtube.com/playlist?list=OLAK5uy_test",
    ])("detects %s as youtube-music", (url) => {
      expect(detectProvider(url)).toBe("youtube-music");
    });

    it("does NOT match regular YouTube URLs", () => {
      expect(detectProvider("https://youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
        "unknown",
      );
      expect(
        detectProvider("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
      ).toBe("unknown");
    });
  });

  describe("SoundCloud", () => {
    it.each([
      "https://soundcloud.com/artist-name/track-name",
      "https://www.soundcloud.com/artist-name/track-name",
    ])("detects %s as soundcloud", (url) => {
      expect(detectProvider(url)).toBe("soundcloud");
    });

    it("does NOT match SoundCloud profile URLs", () => {
      // Profile URLs have only one path segment
      expect(detectProvider("https://soundcloud.com/artist-name")).toBe(
        "unknown",
      );
    });
  });

  describe("Tidal", () => {
    it.each([
      "https://tidal.com/browse/track/12345",
      "https://listen.tidal.com/album/12345",
      "https://www.tidal.com/browse/playlist/abc-123",
      "https://tidal.com/browse/artist/12345",
    ])("detects %s as tidal", (url) => {
      expect(detectProvider(url)).toBe("tidal");
    });
  });

  describe("Deezer", () => {
    it.each([
      "https://deezer.com/track/12345",
      "https://www.deezer.com/album/12345",
      "https://deezer.com/playlist/12345",
      "https://www.deezer.com/artist/12345",
    ])("detects %s as deezer", (url) => {
      expect(detectProvider(url)).toBe("deezer");
    });
  });

  describe("Bandcamp", () => {
    it.each([
      "https://artist-name.bandcamp.com/track/song-title",
      "https://artist-name.bandcamp.com/album/album-title",
    ])("detects %s as bandcamp", (url) => {
      expect(detectProvider(url)).toBe("bandcamp");
    });
  });

  describe("Amazon Music", () => {
    it.each([
      "https://music.amazon.com/albums/B0TEST123",
      "https://music.amazon.com/tracks/B0TEST123",
      "https://music.amazon.com/playlists/B0TEST123",
      "https://music.amazon.co.uk/albums/B0TEST123",
    ])("detects %s as amazon-music", (url) => {
      expect(detectProvider(url)).toBe("amazon-music");
    });
  });

  describe("Non-music URLs", () => {
    it.each([
      "https://example.com",
      "https://google.com/search?q=music",
      "https://twitter.com/user/status/123",
      "https://github.com/user/repo",
      "",
      "not-a-url",
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
    ])("returns unknown for %s", (url) => {
      expect(detectProvider(url)).toBe("unknown");
    });
  });
});

// ============================================================================
// isMusicUrl
// ============================================================================

describe("isMusicUrl", () => {
  it("returns true for recognized music URLs", () => {
    expect(isMusicUrl("https://open.spotify.com/track/abc123")).toBe(true);
    expect(isMusicUrl("https://music.apple.com/us/album/test/123")).toBe(true);
  });

  it("returns false for non-music URLs", () => {
    expect(isMusicUrl("https://example.com")).toBe(false);
    expect(isMusicUrl("")).toBe(false);
  });
});

// ============================================================================
// getProviderInfo
// ============================================================================

describe("getProviderInfo", () => {
  it("returns correct info for known providers", () => {
    const info = getProviderInfo("spotify");
    expect(info.name).toBe("Spotify");
    expect(info.color).toBe("#1db954");
  });

  it("returns fallback info for unknown provider", () => {
    const info = getProviderInfo("unknown");
    expect(info.name).toBe("Music");
  });
});
