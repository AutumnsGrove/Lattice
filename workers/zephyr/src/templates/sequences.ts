/**
 * Sequence Email Templates
 *
 * Welcome/onboarding sequence emails sent over time.
 * These templates match the React Email versions in Engine
 * but are implemented as plain HTML for Worker compatibility.
 */

import { wrapEmail, paragraph, button, escapeHtml } from "./base";
import type { RenderResult } from "./index";

export type AudienceType = "wanderer" | "promo" | "rooted";

export interface SequenceData {
  /** Recipient's name */
  name?: string;
  /** Audience segment */
  audienceType?: AudienceType;
}

// =============================================================================
// Welcome Email (Day 0)
// =============================================================================

const WELCOME_CONTENT = {
  wanderer: {
    preview: "A quiet corner of the internet, waiting for you.",
    paragraphs: [
      "I'm Autumn. I built Grove. A quiet corner of the internet where your words are actually yours.",
      "No algorithms deciding who sees your work. No infinite scroll designed to trap you. No trackers learning your patterns to sell you things. Just a place to write. A place to be.",
      "Your content belongs to you. Download it anytime. If you ever leave, it gets emailed to you automatically. It never gets sold. Never scraped for AI training data. I built an entire protection system called Shade to make sure of that.",
      "I'll send you a few more notes over the coming weeks. What makes this place tick. Why it matters. Nothing spammy. Just honest updates.",
      "Welcome.",
    ],
    cta: null,
  },
  promo: {
    preview: "Thanks for showing interest.",
    paragraphs: [
      "You found your way to Plant, a part of Grove. That means you're thinking about having your own space here.",
      "I wanted to say thanks. And share what makes this place different.",
      "Grove is a blogging platform where your words stay yours. No algorithms. No tracking. No AI scraping your content for training data. I built a protection system called Shade with eight layers of defense against crawlers.",
      "Your content never gets sold. If you ever leave, it gets emailed to you automatically.",
      "Safe. Beautiful. Yours.",
      "Take your time looking around. I'm here if you have questions.",
    ],
    cta: null,
  },
  rooted: {
    preview: "You're part of the grove now.",
    paragraphs: [
      "You did it. You planted your own corner of the internet.",
      "Thank you for believing in what we're building here. Your support means everything. Not just financially, but because it tells me this matters to someone else too.",
      "Your space is ready. Write something. Customize it. Make it yours.",
      "I'll send you a few notes over the coming days to help you settle in. And if you ever need anything, just reply to this email. I read everything.",
      "Welcome home.",
    ],
    cta: { text: "Go to your grove", url: "https://arbor.grove.place" },
  },
};

function welcomeTemplate(data: SequenceData): RenderResult {
  const { name, audienceType = "wanderer" } = data;
  const content = WELCOME_CONTENT[audienceType];
  const greeting = name ? `Hey ${escapeHtml(name)},` : "Hey,";

  const paragraphs = content.paragraphs
    .map((p, i) => {
      if (i === 0) {
        return `${paragraph(greeting)}${paragraph(p)}`;
      }
      return paragraph(p);
    })
    .join("");

  const ctaHtml = content.cta ? button(content.cta.text, content.cta.url) : "";

  const html = wrapEmail({
    previewText: content.preview,
    content: paragraphs + ctaHtml,
  });

  const text = `${greeting}

${content.paragraphs.join("\n\n")}

${content.cta ? `${content.cta.text}: ${content.cta.url}` : ""}

— Autumn
Grove`;

  return { html, text };
}

// =============================================================================
// Day 1 Email (Rooted only)
// =============================================================================

function day1Template(data: SequenceData): RenderResult {
  const { name } = data;
  const greeting = name ? `Hey ${escapeHtml(name)},` : "Hey,";

  const paragraphs = [
    "How's the settling in going?",
    "A few things that might help:",
    "• Your admin panel is at arbor.grove.place — that's where you write, customize, and manage everything",
    "• Customize your colors, fonts, and layout in Settings → Appearance",
    "• The blank page can be intimidating. Start with anything. A sentence. A thought. It doesn't have to be perfect.",
    "Most people overthink their first post. Write something small. You can always edit or delete it later.",
    "I'm here if you need anything.",
  ];

  const contentHtml = `
    ${paragraph(greeting)}
    ${paragraphs.map((p) => paragraph(p)).join("")}
  `;

  const html = wrapEmail({
    previewText: "How's the settling in going?",
    content: contentHtml,
  });

  const text = `${greeting}

${paragraphs.join("\n\n")}

— Autumn
Grove`;

  return { html, text };
}

// =============================================================================
// Day 7 Email
// =============================================================================

const DAY7_CONTENT = {
  wanderer: {
    preview: "What makes this place tick.",
    paragraphs: [
      "I wanted to share what makes Grove different.",
      "Most platforms treat you as the product. Your attention. Your data. Your content. All packaged and sold to advertisers.",
      "Grove doesn't do that. There are no ads. No tracking. No algorithms. Your words don't get scraped for AI training. I built an entire protection system called Shade to keep the bots out.",
      "It's funded by people who use it. Subscriptions. That's it.",
      "Simple, maybe. But simple is sustainable. Simple means your space stays yours.",
      "If you ever want your own corner here, I'd love to have you.",
    ],
    cta: { text: "Learn more", url: "https://plant.grove.place" },
  },
  promo: {
    preview: "Still thinking about it?",
    paragraphs: [
      "No pressure. Just checking in.",
      "If you're on the fence about Grove, I get it. There are a lot of platforms out there.",
      "Here's what I can promise: your words stay yours. No algorithms. No ads. No data harvesting. If you ever leave, you get everything emailed to you automatically.",
      "It's a quiet corner of the internet. Nothing more, nothing less.",
      "If you have questions, just reply to this email. I read everything.",
    ],
    cta: null,
  },
  rooted: {
    preview: "The blank page doesn't have to be scary.",
    paragraphs: [
      "Writing is hard. The blank page is intimidating.",
      "Here's what I've learned: the first draft is never the final one. Write badly first. Edit later.",
      "Some ideas that might help:",
      "• Write about something you learned this week",
      "• Share a recommendation — a book, a song, a place",
      "• Describe something you're working on",
      "• Tell a story from your past",
      "The best posts aren't perfect. They're honest.",
      "Write something small today. Just a paragraph. See how it feels.",
    ],
    cta: { text: "Start writing", url: "https://arbor.grove.place/write" },
  },
};

function day7Template(data: SequenceData): RenderResult {
  const { name, audienceType = "wanderer" } = data;
  const content = DAY7_CONTENT[audienceType];
  const greeting = name ? `Hey ${escapeHtml(name)},` : "Hey,";

  const paragraphsHtml = content.paragraphs
    .map((p, i) =>
      i === 0 ? `${paragraph(greeting)}${paragraph(p)}` : paragraph(p),
    )
    .join("");

  const ctaHtml = content.cta ? button(content.cta.text, content.cta.url) : "";

  const html = wrapEmail({
    previewText: content.preview,
    content: paragraphsHtml + ctaHtml,
  });

  const text = `${greeting}

${content.paragraphs.join("\n\n")}

${content.cta ? `${content.cta.text}: ${content.cta.url}` : ""}

— Autumn
Grove`;

  return { html, text };
}

// =============================================================================
// Day 14 Email (Wanderer only)
// =============================================================================

function day14Template(data: SequenceData): RenderResult {
  const { name } = data;
  const greeting = name ? `Hey ${escapeHtml(name)},` : "Hey,";

  const paragraphs = [
    "Two weeks. Still here.",
    "I wanted to share why I built Grove.",
    "I was tired of platforms that treated me as a product. Tired of algorithms deciding who saw my work. Tired of corporate spaces that felt hostile to anything personal or genuine.",
    "So I built something different. A place where the walls aren't covered in ads. Where your data isn't for sale. Where you can write something honest and know it'll stay yours.",
    "It's small. It's quiet. And that's the point.",
    "If you're looking for your own corner of the internet, I'd be honored to have you.",
  ];

  const contentHtml = `
    ${paragraph(greeting)}
    ${paragraphs.map((p) => paragraph(p)).join("")}
    ${button("See what Grove offers", "https://plant.grove.place")}
  `;

  const html = wrapEmail({
    previewText: "Why Grove exists.",
    content: contentHtml,
  });

  const text = `${greeting}

${paragraphs.join("\n\n")}

See what Grove offers: https://plant.grove.place

— Autumn
Grove`;

  return { html, text };
}

// =============================================================================
// Day 30 Email (Wanderer only)
// =============================================================================

function day30Template(data: SequenceData): RenderResult {
  const { name } = data;
  const greeting = name ? `Hey ${escapeHtml(name)},` : "Hey,";

  const paragraphs = [
    "A month already.",
    "This is the last email in this sequence. I'm not going to spam you.",
    "If Grove isn't for you, that's okay. I hope you found something useful here.",
    "If you ever do want your own space — somewhere quiet, somewhere yours — I'll be here.",
    "Take care of yourself.",
  ];

  const contentHtml = `
    ${paragraph(greeting)}
    ${paragraphs.map((p) => paragraph(p)).join("")}
  `;

  const html = wrapEmail({
    previewText: "Still there?",
    content: contentHtml,
  });

  const text = `${greeting}

${paragraphs.join("\n\n")}

— Autumn
Grove`;

  return { html, text };
}

// =============================================================================
// Export All Sequence Templates
// =============================================================================

export const sequenceTemplates = {
  welcome: welcomeTemplate,
  day1: day1Template,
  day7: day7Template,
  day14: day14Template,
  day30: day30Template,
};
