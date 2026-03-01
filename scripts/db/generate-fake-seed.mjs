#!/usr/bin/env node
/**
 * generate-fake-seed.mjs — Random realistic blog data for Glimpse testing
 *
 * Uses @faker-js/faker (Cloudflare Workers compatible) to generate a
 * complete tenant with realistic blog posts, custom pages, and site
 * settings. Every run produces different content.
 *
 * Usage:
 *   node scripts/db/generate-fake-seed.mjs           # SQL to stdout
 *   node scripts/db/generate-fake-seed.mjs --seed 42  # Reproducible output
 *   node scripts/db/generate-fake-seed.mjs --posts 8  # Control post count
 *
 * The output is valid SQL that can be piped directly into SQLite or
 * executed via `glimpse seed --profile fake`.
 */

import { faker } from "@faker-js/faker";

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
function flag(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const seedValue = flag("seed", null);
if (seedValue) faker.seed(parseInt(seedValue, 10));

const postCount = parseInt(flag("posts", String(3 + Math.floor(Math.random() * 6))), 10); // 3–8
const pageCount = parseInt(flag("pages", String(2 + Math.floor(Math.random() * 3))), 10); // 2–4

// ---------------------------------------------------------------------------
// Identity — the person behind this grove
// ---------------------------------------------------------------------------
const groveStyles = [
  { adj: () => faker.color.human(), noun: () => faker.animal.bird().toLowerCase() },
  { adj: () => faker.word.adjective(), noun: () => faker.science.chemicalElement().name.toLowerCase() },
  { adj: () => faker.color.human(), noun: () => faker.animal.cat().toLowerCase().replace(/\s+/g, "-") },
  { adj: () => faker.word.adjective(), noun: () => faker.word.noun() },
  { adj: () => faker.hacker.adjective(), noun: () => faker.word.noun() },
];

const style = faker.helpers.arrayElement(groveStyles);
const rawName = `${style.adj()} ${style.noun()}`;
const displayName =
  "The " + rawName.split(" ").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
const subdomain = rawName
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "")
  .slice(0, 30);
const tenantId = `fake-${subdomain}`;
const email = faker.internet.email({ firstName: subdomain });
const accentColors = [
  "#6B8E23", "#CD853F", "#8B4513", "#2E8B57", "#B8860B",
  "#708090", "#9370DB", "#20B2AA", "#CD5C5C", "#DAA520",
];
const accentColor = faker.helpers.arrayElement(accentColors);

// ---------------------------------------------------------------------------
// Content generators — write like a human indie blogger
// ---------------------------------------------------------------------------

/** Weighted tag pool — tags that feel like they belong on a personal site */
const tagPool = [
  "personal", "reflection", "writing", "process", "craft",
  "indie-web", "small-web", "community", "tools", "design",
  "thoughts", "creative", "code", "nature", "reading",
  "music", "tea", "cooking", "journaling", "photography",
  "weeknotes", "retrospective", "tutorial", "behind-the-scenes",
];

function pickTags(min = 2, max = 5) {
  const count = faker.number.int({ min, max });
  return JSON.stringify(faker.helpers.arrayElements(tagPool, count));
}

/** Generate a markdown blog post body that reads like a real person wrote it */
function generatePostBody() {
  const sections = faker.number.int({ min: 2, max: 5 });
  const parts = [];

  // Opening paragraph — conversational
  parts.push(faker.lorem.paragraph({ min: 3, max: 6 }));
  parts.push("");

  for (let i = 0; i < sections; i++) {
    // Section header
    parts.push(`## ${faker.lorem.sentence({ min: 3, max: 7 }).replace(/\.$/, "")}`);
    parts.push("");

    // Mix of content types
    const contentType = faker.helpers.arrayElement([
      "paragraphs",
      "list",
      "paragraphs-with-emphasis",
      "quote-then-paragraph",
    ]);

    switch (contentType) {
      case "paragraphs":
        parts.push(faker.lorem.paragraph({ min: 3, max: 8 }));
        parts.push("");
        parts.push(faker.lorem.paragraph({ min: 2, max: 5 }));
        break;

      case "list": {
        parts.push(faker.lorem.paragraph({ min: 2, max: 4 }));
        parts.push("");
        const items = faker.number.int({ min: 3, max: 6 });
        for (let j = 0; j < items; j++) {
          const bold = faker.datatype.boolean(0.3);
          const text = faker.lorem.sentence({ min: 4, max: 12 });
          parts.push(bold ? `- **${text}**` : `- ${text}`);
        }
        break;
      }

      case "paragraphs-with-emphasis": {
        const para = faker.lorem.paragraph({ min: 4, max: 8 });
        // Sprinkle in some *emphasis* and **bold**
        const words = para.split(" ");
        const emphIdx = faker.number.int({ min: 2, max: words.length - 3 });
        words[emphIdx] = `*${words[emphIdx]}*`;
        const boldIdx = faker.number.int({ min: emphIdx + 2, max: Math.min(emphIdx + 6, words.length - 1) });
        words[boldIdx] = `**${words[boldIdx]}**`;
        parts.push(words.join(" "));
        parts.push("");
        parts.push(faker.lorem.paragraph({ min: 2, max: 5 }));
        break;
      }

      case "quote-then-paragraph":
        parts.push(`> ${faker.lorem.sentence({ min: 6, max: 15 })}`);
        parts.push("");
        parts.push(faker.lorem.paragraph({ min: 3, max: 6 }));
        break;
    }

    parts.push("");
  }

  // Closing thought
  parts.push(`*${faker.lorem.sentence({ min: 5, max: 12 })}*`);

  return parts.join("\n");
}

/** Generate a page body (shorter, more structured than a post) */
function generatePageBody(slug) {
  const parts = [];

  if (slug === "about") {
    parts.push(faker.lorem.paragraph({ min: 3, max: 6 }));
    parts.push("");
    parts.push("## What This Place Is");
    parts.push("");
    parts.push(faker.lorem.paragraph({ min: 4, max: 8 }));
    parts.push("");
    parts.push("## Who I Am");
    parts.push("");
    parts.push(faker.lorem.paragraph({ min: 3, max: 6 }));
    parts.push("");
    parts.push(`*${faker.lorem.sentence({ min: 5, max: 10 })}*`);
  } else if (slug === "now") {
    parts.push("*A [/now page](https://nownownow.com/about) — what I'm focused on right now.*");
    parts.push("");
    parts.push(`Last updated: ${faker.date.recent({ days: 14 }).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`);
    parts.push("");
    parts.push("## Currently");
    parts.push("");
    const items = faker.number.int({ min: 3, max: 6 });
    for (let i = 0; i < items; i++) {
      parts.push(`- ${faker.lorem.sentence({ min: 5, max: 12 })}`);
    }
    parts.push("");
    parts.push("## Reading");
    parts.push("");
    parts.push(`- *${faker.lorem.words({ min: 2, max: 5 })}* by ${faker.person.fullName()}`);
    parts.push(`- *${faker.lorem.words({ min: 2, max: 4 })}* by ${faker.person.fullName()}`);
  } else if (slug === "colophon") {
    parts.push("This site is built with care and intention.");
    parts.push("");
    parts.push("## Stack");
    parts.push("");
    parts.push("- Built on [Grove](https://grove.place)");
    parts.push(`- Fonts: ${faker.helpers.arrayElement(["Lexend", "Inter", "Literata", "Source Serif Pro"])}`);
    parts.push(`- Season: whatever feels right`);
    parts.push("");
    parts.push("## Philosophy");
    parts.push("");
    parts.push(faker.lorem.paragraph({ min: 3, max: 6 }));
  } else if (slug === "links") {
    parts.push("Places I love on the web:");
    parts.push("");
    const links = faker.number.int({ min: 4, max: 8 });
    for (let i = 0; i < links; i++) {
      parts.push(`- [${faker.lorem.words({ min: 2, max: 4 })}](${faker.internet.url()}) — ${faker.lorem.sentence({ min: 3, max: 8 })}`);
    }
  } else {
    // Generic page
    parts.push(faker.lorem.paragraph({ min: 3, max: 6 }));
    parts.push("");
    parts.push(`## ${faker.lorem.sentence({ min: 3, max: 6 }).replace(/\.$/, "")}`);
    parts.push("");
    parts.push(faker.lorem.paragraph({ min: 4, max: 8 }));
  }

  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// SQL helpers
// ---------------------------------------------------------------------------
/** Escape a string for SQL single-quote literals */
function esc(s) {
  if (s == null) return "NULL";
  return "'" + String(s).replace(/'/g, "''") + "'";
}

function unixNow() {
  return Math.floor(Date.now() / 1000);
}

// ---------------------------------------------------------------------------
// Generate SQL
// ---------------------------------------------------------------------------
const lines = [];
const now = unixNow();

lines.push(`-- ==========================================================`);
lines.push(`-- Fake seed: ${displayName} (${subdomain})`);
lines.push(`-- Generated by generate-fake-seed.mjs at ${new Date().toISOString()}`);
lines.push(`-- ${postCount} posts, ${pageCount + 1} pages (including home)`);
lines.push(`-- ==========================================================`);
lines.push(``);

// Clean up any previous fake tenant data
lines.push(`DELETE FROM posts WHERE tenant_id = ${esc(tenantId)};`);
lines.push(`DELETE FROM pages WHERE tenant_id = ${esc(tenantId)};`);
lines.push(`DELETE FROM site_settings WHERE tenant_id = ${esc(tenantId)};`);
lines.push(`DELETE FROM tenants WHERE id = ${esc(tenantId)};`);
lines.push(``);

// ---- Tenant ----
lines.push(`INSERT INTO tenants (id, subdomain, display_name, email, plan, theme, accent_color, active, post_count, created_at, updated_at)`);
lines.push(`VALUES (${esc(tenantId)}, ${esc(subdomain)}, ${esc(displayName)}, ${esc(email)}, 'seedling', 'default', ${esc(accentColor)}, 1, ${postCount}, ${now - 86400 * 90}, ${now});`);
lines.push(``);

// ---- Site settings ----
const tagline = faker.lorem.sentence({ min: 4, max: 10 }).replace(/\.$/, "");
lines.push(`INSERT INTO site_settings (tenant_id, setting_key, setting_value, updated_at) VALUES (${esc(tenantId)}, 'tagline', ${esc(tagline)}, ${now});`);
lines.push(``);

// ---- Home page ----
const heroSubtitle = faker.lorem.sentence({ min: 4, max: 8 }).replace(/\.$/, "");
const heroJSON = JSON.stringify({
  title: displayName.replace("The ", ""),
  subtitle: heroSubtitle,
  cta: { text: "Read the Blog", link: "/garden" },
});

const homeContent = [
  `# Welcome`,
  ``,
  faker.lorem.paragraph({ min: 4, max: 8 }),
  ``,
  `## What You'll Find Here`,
  ``,
  faker.lorem.paragraph({ min: 3, max: 6 }),
  ``,
  `- ${faker.lorem.sentence({ min: 4, max: 8 })}`,
  `- ${faker.lorem.sentence({ min: 4, max: 8 })}`,
  `- ${faker.lorem.sentence({ min: 4, max: 8 })}`,
  ``,
  `*${faker.lorem.sentence({ min: 5, max: 10 })}*`,
].join("\n");

lines.push(`INSERT INTO pages (id, tenant_id, slug, title, type, markdown_content, hero, created_at, updated_at)`);
lines.push(`VALUES (${esc(tenantId + "-home")}, ${esc(tenantId)}, 'home', ${esc(displayName)}, 'home', ${esc(homeContent)}, ${esc(heroJSON)}, ${now - 86400 * 90}, ${now});`);
lines.push(``);

// ---- Custom pages ----
const pageOptions = ["about", "now", "colophon", "links"];
const chosenPages = faker.helpers.arrayElements(pageOptions, pageCount);

for (const slug of chosenPages) {
  const title = slug[0].toUpperCase() + slug.slice(1);
  const body = generatePageBody(slug);
  const pageId = `${tenantId}-page-${slug}`;
  const createdAt = now - 86400 * faker.number.int({ min: 10, max: 80 });

  lines.push(`INSERT INTO pages (id, tenant_id, slug, title, type, markdown_content, show_in_nav, nav_order, created_at, updated_at)`);
  lines.push(`VALUES (${esc(pageId)}, ${esc(tenantId)}, ${esc(slug)}, ${esc(title)}, 'page', ${esc(body)}, 1, ${chosenPages.indexOf(slug) + 1}, ${createdAt}, ${now});`);
  lines.push(``);
}

// ---- Blog posts ----
for (let i = 0; i < postCount; i++) {
  // Post title — a mix of styles
  const titleStyle = faker.helpers.arrayElement([
    () => faker.lorem.sentence({ min: 4, max: 8 }).replace(/\.$/, ""),
    () => `On ${faker.lorem.words({ min: 1, max: 3 })}`,
    () => `Why ${faker.lorem.sentence({ min: 3, max: 6 }).replace(/\.$/, "")}`,
    () => `${faker.lorem.words({ min: 2, max: 4 })}`,
    () => `Notes on ${faker.lorem.words({ min: 1, max: 3 })}`,
    () => `${faker.number.int({ min: 3, max: 12 })} ${faker.lorem.words({ min: 1, max: 3 })}`,
  ]);
  const title = titleStyle();
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  const description = faker.lorem.sentence({ min: 6, max: 15 });
  const body = generatePostBody();
  const tags = pickTags();
  const wordCount = body.split(/\s+/).length;
  const readingTime = Math.max(1, Math.round(wordCount / 200));

  // Spread posts over the last ~60 days
  const daysAgo = Math.floor((postCount - i) * (60 / postCount)) + faker.number.int({ min: 0, max: 3 });
  const publishedAt = now - 86400 * daysAgo;
  const createdAt = publishedAt - 86400 * faker.number.int({ min: 0, max: 3 });

  const postId = `${tenantId}-post-${i}`;

  lines.push(`INSERT INTO posts (id, tenant_id, slug, title, description, markdown_content, tags, status, word_count, reading_time, published_at, created_at, updated_at)`);
  lines.push(`VALUES (${esc(postId)}, ${esc(tenantId)}, ${esc(slug)}, ${esc(title)}, ${esc(description)}, ${esc(body)}, ${esc(tags)}, 'published', ${wordCount}, ${readingTime}, ${publishedAt}, ${createdAt}, ${now});`);
  lines.push(``);
}

// Output
console.log(lines.join("\n"));
