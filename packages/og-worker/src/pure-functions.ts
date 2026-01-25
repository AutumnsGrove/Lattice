/**
 * Pure functions for OG image generation and metadata extraction.
 *
 * These functions are separated from index.ts to enable testing without
 * loading the workers-og WASM dependency (which only works in Workers runtime).
 */

// =============================================================================
// HTML UTILITIES
// =============================================================================

export function escapeHtml(text: string): string {
  // Only escape characters that could inject HTML tags
  // Apostrophes and quotes are safe - Satori renders them as-is
  // (Satori doesn't interpret HTML entities, so &#039; would show literally)
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
  };
  return text.replace(/[&<>]/g, (m) => map[m]);
}

export function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
  };
  return text.replace(
    /&(?:amp|lt|gt|quot|#39|apos|nbsp);/g,
    (match) => entities[match] || match,
  );
}

// =============================================================================
// WORD-AWARE TEXT SPLITTING
// =============================================================================

export interface LineSplit {
  line1: string;
  line2: string;
  line3: string;
  line4: string;
}

/**
 * Splits preview text into lines respecting word boundaries.
 * Used for the fading glass card effect in OG images.
 * Lines get progressively shorter to account for the fade effect.
 */
export function splitPreviewIntoLines(
  text: string | null | undefined,
  maxCharsPerLine: number[] = [55, 55, 45, 35],
): LineSplit {
  const empty = { line1: "", line2: "", line3: "", line4: "" };
  if (!text?.trim()) return empty;

  // Normalize whitespace (collapse multiple spaces, trim)
  const normalized = text.replace(/\s+/g, " ").trim();
  const words = normalized.split(" ");
  const lines: string[] = ["", "", "", ""];
  let currentLine = 0;

  for (const word of words) {
    if (currentLine >= 4) break;

    const wouldBe = lines[currentLine] ? `${lines[currentLine]} ${word}` : word;

    if (wouldBe.length <= maxCharsPerLine[currentLine]) {
      lines[currentLine] = wouldBe;
    } else if (lines[currentLine] === "") {
      // Word too long for empty line - truncate with ellipsis
      lines[currentLine] =
        word.slice(0, maxCharsPerLine[currentLine] - 3) + "...";
      currentLine++;
    } else {
      // Current line is full, move to next line
      currentLine++;
      if (currentLine < 4) {
        // Check if word fits on new line, truncate if needed
        if (word.length <= maxCharsPerLine[currentLine]) {
          lines[currentLine] = word;
        } else {
          lines[currentLine] =
            word.slice(0, maxCharsPerLine[currentLine] - 3) + "...";
        }
      }
    }
  }

  return {
    line1: lines[0],
    line2: lines[1],
    line3: lines[2],
    line4: lines[3],
  };
}

// =============================================================================
// PALETTE - Synced from landing/src/lib/components/nature/palette.ts
// =============================================================================

const greens = {
  darkForest: "#0d4a1c",
  deepGreen: "#166534",
  grove: "#16a34a",
  meadow: "#22c55e",
  spring: "#4ade80",
  mint: "#86efac",
  pale: "#bbf7d0",
} as const;

const autumn = {
  rust: "#9a3412",
  ember: "#c2410c",
  pumpkin: "#ea580c",
  amber: "#d97706",
  gold: "#eab308",
  honey: "#facc15",
  straw: "#fde047",
} as const;

const midnightBloom = {
  deepPlum: "#581c87",
  purple: "#7c3aed",
  violet: "#8b5cf6",
  amber: "#f59e0b",
  warmCream: "#fef3c7",
  softGold: "#fcd34d",
} as const;

const accents = {
  sky: {
    dayLight: "#e0f2fe",
    dayMid: "#7dd3fc",
    night: "#1e293b",
    star: "#fefce8",
  },
  water: {
    surface: "#7dd3fc",
    deep: "#0284c7",
    shallow: "#bae6fd",
  },
} as const;

const slate = {
  900: "#0f172a",
  800: "#1e293b",
  700: "#334155",
  400: "#94a3b8",
  200: "#e2e8f0",
  50: "#f8fafc",
} as const;

// =============================================================================
// VARIANT COLOR SCHEMES
// =============================================================================

export type Variant =
  | "default"
  | "forest"
  | "workshop"
  | "midnight"
  | "knowledge";

export interface ColorScheme {
  bgFrom: string;
  bgTo: string;
  accent: string;
  text: string;
  muted: string;
  glass: string;
  glassBorder: string;
}

export function getColors(variant: Variant): ColorScheme {
  switch (variant) {
    case "forest":
      return {
        bgFrom: greens.darkForest,
        bgTo: greens.deepGreen,
        accent: greens.mint,
        text: greens.pale,
        muted: greens.spring,
        glass: "rgba(13, 74, 28, 0.6)",
        glassBorder: "rgba(134, 239, 172, 0.2)",
      };

    case "workshop":
      return {
        bgFrom: slate[900],
        bgTo: slate[800],
        accent: autumn.gold,
        text: autumn.straw,
        muted: autumn.honey,
        glass: "rgba(15, 23, 42, 0.6)",
        glassBorder: "rgba(234, 179, 8, 0.2)",
      };

    case "midnight":
      return {
        bgFrom: midnightBloom.deepPlum,
        bgTo: midnightBloom.purple,
        accent: midnightBloom.amber,
        text: midnightBloom.warmCream,
        muted: midnightBloom.softGold,
        glass: "rgba(88, 28, 135, 0.6)",
        glassBorder: "rgba(245, 158, 11, 0.2)",
      };

    case "knowledge":
      return {
        bgFrom: accents.sky.night,
        bgTo: accents.water.deep,
        accent: accents.water.surface,
        text: accents.sky.dayLight,
        muted: accents.water.shallow,
        glass: "rgba(30, 41, 59, 0.6)",
        glassBorder: "rgba(125, 211, 252, 0.2)",
      };

    default:
      return {
        bgFrom: slate[900],
        bgTo: slate[800],
        accent: greens.grove,
        text: slate[50],
        muted: slate[400],
        glass: "rgba(15, 23, 42, 0.6)",
        glassBorder: "rgba(22, 163, 74, 0.2)",
      };
  }
}

// =============================================================================
// SSRF PREVENTION - URL VALIDATION
// =============================================================================

const ALLOWED_DOMAINS = new Set([
  "grove.place",
  "cdn.grove.place",
  "imagedelivery.net",
]);

export function isAllowedUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);

    if (url.protocol !== "https:") {
      return false;
    }

    const hostname = url.hostname;
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.") ||
      hostname.endsWith(".local")
    ) {
      return false;
    }

    if (ALLOWED_DOMAINS.has(hostname) || hostname.endsWith(".grove.place")) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

const BLOCKED_EXTERNAL_PATTERNS = [
  /^https?:\/\/localhost/i,
  /^https?:\/\/127\./,
  /^https?:\/\/0\./,
  /^https?:\/\/10\./,
  /^https?:\/\/172\.(1[6-9]|2\d|3[01])\./,
  /^https?:\/\/192\.168\./,
  /^https?:\/\/169\.254\./,
  /^https?:\/\/169\.254\.169\.254/,
  /^https?:\/\/metadata\./i,
  /^https?:\/\/metadata-/i,
  /^https?:\/\/\[::1\]/,
  /^https?:\/\/\[fe80:/i,
  /^https?:\/\/\[fc/i,
  /^https?:\/\/\[fd/i,
  /^file:/i,
  /^data:/i,
];

export function isBlockedExternalUrl(urlString: string): boolean {
  for (const pattern of BLOCKED_EXTERNAL_PATTERNS) {
    if (pattern.test(urlString)) {
      return true;
    }
  }
  return false;
}

// =============================================================================
// URL UTILITIES
// =============================================================================

export function extractDomain(url: URL): string {
  return url.hostname.replace(/^www\./, "");
}

export function resolveExternalUrl(
  base: URL,
  relative: string | undefined,
): string | undefined {
  if (!relative) return undefined;
  if (relative.startsWith("//")) {
    return `${base.protocol}${relative}`;
  }
  try {
    return new URL(relative, base.href).href;
  } catch {
    return undefined;
  }
}

// =============================================================================
// OG METADATA EXTRACTION
// =============================================================================

export interface OGMetadata {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  siteName?: string;
  favicon?: string;
  domain: string;
  type?: string;
  fetchedAt: string;
}

export function extractExternalMetaContent(
  html: string,
  property: string,
): string | undefined {
  const ogPatterns = [
    new RegExp(
      `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`,
      "i",
    ),
  ];

  for (const pattern of ogPatterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeHtmlEntities(match[1].trim());
    }
  }

  const namePatterns = [
    new RegExp(
      `<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`,
      "i",
    ),
  ];

  for (const pattern of namePatterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeHtmlEntities(match[1].trim());
    }
  }

  return undefined;
}

export function extractExternalTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1] ? decodeHtmlEntities(match[1].trim()) : undefined;
}

export function extractExternalFavicon(
  html: string,
  baseUrl: URL,
): string | undefined {
  const patterns = [
    /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["']/i,
    /<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return resolveExternalUrl(baseUrl, match[1]);
    }
  }

  return `${baseUrl.protocol}//${baseUrl.host}/favicon.ico`;
}

export function parseExternalOGMetadata(
  html: string,
  url: URL,
): Omit<OGMetadata, "fetchedAt"> {
  return {
    url: url.href,
    domain: extractDomain(url),
    title:
      extractExternalMetaContent(html, "og:title") ||
      extractExternalTitle(html),
    description:
      extractExternalMetaContent(html, "og:description") ||
      extractExternalMetaContent(html, "description"),
    image: resolveExternalUrl(
      url,
      extractExternalMetaContent(html, "og:image"),
    ),
    imageAlt: extractExternalMetaContent(html, "og:image:alt"),
    siteName: extractExternalMetaContent(html, "og:site_name"),
    type: extractExternalMetaContent(html, "og:type"),
    favicon: extractExternalFavicon(html, url),
  };
}
