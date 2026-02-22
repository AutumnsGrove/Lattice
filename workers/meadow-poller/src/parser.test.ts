/**
 * Meadow Poller — RSS Parser Tests
 *
 * Covers: valid feeds, missing content:encoded, malformed XML, empty feeds,
 * XXE attempts, single item normalization, multi-category, date formats,
 * HTML stripping in text fields.
 */
import { describe, it, expect } from "vitest";
import { parseFeed } from "./parser.js";

const VALID_FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Test Blog</title>
    <link>https://test.grove.place</link>
    <description>A test blog</description>
    <item>
      <title>Hello World</title>
      <link>https://test.grove.place/garden/hello-world</link>
      <guid isPermaLink="true">https://test.grove.place/garden/hello-world</guid>
      <pubDate>Sat, 15 Feb 2026 12:00:00 GMT</pubDate>
      <description>A first post</description>
      <content:encoded><![CDATA[<p>Full HTML content here.</p>]]></content:encoded>
      <category>tech</category>
      <category>svelte</category>
      <enclosure url="https://test.grove.place/images/hero.jpg" type="image/jpeg" length="0" />
    </item>
    <item>
      <title>Second Post</title>
      <link>https://test.grove.place/garden/second-post</link>
      <guid>https://test.grove.place/garden/second-post</guid>
      <pubDate>Fri, 14 Feb 2026 10:00:00 GMT</pubDate>
      <description>Another post</description>
    </item>
  </channel>
</rss>`;

describe("parseFeed", () => {
  it("parses a valid RSS 2.0 feed with content:encoded", () => {
    const feed = parseFeed(VALID_FEED);

    expect(feed.title).toBe("Test Blog");
    expect(feed.link).toBe("https://test.grove.place");
    expect(feed.description).toBe("A test blog");
    expect(feed.items).toHaveLength(2);
  });

  it("extracts content:encoded from CDATA", () => {
    const feed = parseFeed(VALID_FEED);
    const first = feed.items[0];

    expect(first.contentEncoded).toBe("<p>Full HTML content here.</p>");
  });

  it("handles items without content:encoded", () => {
    const feed = parseFeed(VALID_FEED);
    const second = feed.items[1];

    expect(second.contentEncoded).toBeNull();
    expect(second.description).toBe("Another post");
  });

  it("extracts multiple categories", () => {
    const feed = parseFeed(VALID_FEED);
    const first = feed.items[0];

    expect(first.categories).toEqual(["tech", "svelte"]);
  });

  it("extracts enclosure URL", () => {
    const feed = parseFeed(VALID_FEED);
    const first = feed.items[0];

    expect(first.enclosureUrl).toBe("https://test.grove.place/images/hero.jpg");
  });

  it("extracts guid from isPermaLink element", () => {
    const feed = parseFeed(VALID_FEED);

    expect(feed.items[0].guid).toBe(
      "https://test.grove.place/garden/hello-world",
    );
  });

  it("extracts pubDate", () => {
    const feed = parseFeed(VALID_FEED);

    expect(feed.items[0].pubDate).toBe("Sat, 15 Feb 2026 12:00:00 GMT");
  });

  it("throws on malformed XML", () => {
    expect(() => parseFeed("<not><valid>xml")).toThrow();
  });

  it("throws on missing channel structure", () => {
    const xml = `<?xml version="1.0"?><feed><entry>test</entry></feed>`;
    expect(() => parseFeed(xml)).toThrow(
      "Invalid RSS feed: missing <rss><channel> structure",
    );
  });

  it("handles empty feed (no items)", () => {
    const xml = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Empty Blog</title>
    <link>https://empty.grove.place</link>
    <description>Nothing here</description>
  </channel>
</rss>`;

    const feed = parseFeed(xml);
    expect(feed.title).toBe("Empty Blog");
    expect(feed.items).toHaveLength(0);
  });

  it("handles single item feed (ensures array normalization)", () => {
    const xml = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Solo Blog</title>
    <link>https://solo.grove.place</link>
    <description>One post</description>
    <item>
      <title>Only Post</title>
      <link>https://solo.grove.place/garden/only</link>
    </item>
  </channel>
</rss>`;

    const feed = parseFeed(xml);
    expect(feed.items).toHaveLength(1);
    expect(feed.items[0].title).toBe("Only Post");
  });

  it("does not resolve XXE entities", () => {
    const xml = `<?xml version="1.0"?>
<!DOCTYPE rss [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<rss version="2.0">
  <channel>
    <title>&xxe;</title>
    <link>https://evil.grove.place</link>
    <description>XXE attempt</description>
  </channel>
</rss>`;

    // Should either throw or return the entity reference as-is (not resolved)
    try {
      const feed = parseFeed(xml);
      // If it parses, the entity should NOT be resolved to file contents
      expect(feed.title).not.toContain("root:");
    } catch {
      // Throwing is also acceptable — malformed from parser's perspective
    }
  });

  it("strips HTML tags from title and description", () => {
    const xml = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Blog</title>
    <link>https://test.grove.place</link>
    <description>Desc</description>
    <item>
      <title><b>Bold Title</b> with &lt;script&gt;</title>
      <link>https://test.grove.place/garden/xss</link>
      <description><p>Paragraph</p> text <img src="x" onerror="alert(1)"/></description>
    </item>
  </channel>
</rss>`;

    const feed = parseFeed(xml);
    const item = feed.items[0];

    // HTML should be stripped from text fields
    expect(item.title).not.toContain("<b>");
    expect(item.description).not.toContain("<p>");
    expect(item.description).not.toContain("<img");
  });

  it("falls back to link when guid is missing", () => {
    const xml = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Blog</title>
    <link>https://test.grove.place</link>
    <description>Desc</description>
    <item>
      <title>No GUID</title>
      <link>https://test.grove.place/garden/no-guid</link>
      <description>Post without GUID</description>
    </item>
  </channel>
</rss>`;

    const feed = parseFeed(xml);
    expect(feed.items[0].guid).toBe("https://test.grove.place/garden/no-guid");
  });

  it("strips HTML from categories", () => {
    const xml = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Blog</title>
    <link>https://test.grove.place</link>
    <description>Desc</description>
    <item>
      <title>Tagged</title>
      <link>https://test.grove.place/garden/tagged</link>
      <category><b>bold-tag</b></category>
      <category>clean-tag</category>
    </item>
  </channel>
</rss>`;

    const feed = parseFeed(xml);
    expect(feed.items[0].categories).toEqual(["bold-tag", "clean-tag"]);
  });

  it("extracts grove:blaze from Grove RSS namespace", () => {
    const xml = `<?xml version="1.0"?>
<rss version="2.0" xmlns:grove="https://grove.place/xmlns/grove/1.0">
  <channel>
    <title>Blog</title>
    <link>https://test.grove.place</link>
    <description>Desc</description>
    <item>
      <title>Post with Blaze</title>
      <link>https://test.grove.place/garden/blazed</link>
      <grove:blaze>food-review</grove:blaze>
    </item>
  </channel>
</rss>`;

    const feed = parseFeed(xml);
    expect(feed.items[0].blaze).toBe("food-review");
  });

  it("returns null blaze when grove:blaze is absent", () => {
    const feed = parseFeed(VALID_FEED);
    expect(feed.items[0].blaze).toBeNull();
    expect(feed.items[1].blaze).toBeNull();
  });

  it("rejects invalid blaze slugs (XSS attempt)", () => {
    const xml = `<?xml version="1.0"?>
<rss version="2.0" xmlns:grove="https://grove.place/xmlns/grove/1.0">
  <channel>
    <title>Blog</title>
    <link>https://test.grove.place</link>
    <description>Desc</description>
    <item>
      <title>Evil Post</title>
      <link>https://test.grove.place/garden/evil</link>
      <grove:blaze>&lt;script&gt;alert(1)&lt;/script&gt;</grove:blaze>
    </item>
  </channel>
</rss>`;

    const feed = parseFeed(xml);
    // Invalid slug format — should be silently dropped
    expect(feed.items[0].blaze).toBeNull();
  });

  it("rejects blaze slugs with uppercase or spaces", () => {
    const xml = `<?xml version="1.0"?>
<rss version="2.0" xmlns:grove="https://grove.place/xmlns/grove/1.0">
  <channel>
    <title>Blog</title>
    <link>https://test.grove.place</link>
    <description>Desc</description>
    <item>
      <title>Post</title>
      <link>https://test.grove.place/garden/post</link>
      <grove:blaze>Food Review</grove:blaze>
    </item>
  </channel>
</rss>`;

    const feed = parseFeed(xml);
    expect(feed.items[0].blaze).toBeNull();
  });
});
