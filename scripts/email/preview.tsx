/**
 * Email Template Preview
 *
 * Renders all Grove email templates to static HTML files for visual preview.
 * Opens an index page where you can browse every template, toggle mobile/desktop
 * widths, and see exactly what recipients will see.
 *
 * Usage:
 *   bun run email:preview                  # Render all templates
 *   bun run email:preview WelcomeEmail     # Filter by name (partial match)
 *   bun run email:preview --category seq   # Filter by category
 *
 * Output: .preview/email/index.html (open in browser)
 */

import * as React from "react";
import { render } from "@react-email/render";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

// ---------------------------------------------------------------------------
// Template imports (direct source paths — no build needed)
// ---------------------------------------------------------------------------

// Sequences
import { WelcomeEmail } from "../../libs/engine/src/lib/email/sequences/WelcomeEmail";
import { Day1Email } from "../../libs/engine/src/lib/email/sequences/Day1Email";
import { Day7Email } from "../../libs/engine/src/lib/email/sequences/Day7Email";
import { Day14Email } from "../../libs/engine/src/lib/email/sequences/Day14Email";
import { Day30Email } from "../../libs/engine/src/lib/email/sequences/Day30Email";

// Lifecycle
import { RenewalThankYou } from "../../libs/engine/src/lib/email/lifecycle/RenewalThankYou";
import { GentleNudge } from "../../libs/engine/src/lib/email/lifecycle/GentleNudge";

// Updates
import { PatchNotesEmail } from "../../libs/engine/src/lib/email/updates/PatchNotesEmail";
import { AnnouncementEmail } from "../../libs/engine/src/lib/email/updates/AnnouncementEmail";

// Invites
import { BetaInviteEmail } from "../../libs/engine/src/lib/email/sequences/BetaInviteEmail";

// Seasonal
import { SeasonalGreeting } from "../../libs/engine/src/lib/email/seasonal/SeasonalGreeting";

// Porch
import { PorchReplyEmail } from "../../libs/engine/src/lib/email/porch/PorchReplyEmail";

// ---------------------------------------------------------------------------
// Template registry — each entry becomes a previewable HTML file
// ---------------------------------------------------------------------------

interface TemplateEntry {
	name: string;
	category: string;
	description: string;
	element: React.ReactElement;
}

const TEMPLATES: TemplateEntry[] = [
	// ── Sequences (wanderer) ────────────────────────────────────────────
	{
		name: "WelcomeEmail-wanderer",
		category: "sequences",
		description: "Day 0 — Wanderer welcome",
		element: React.createElement(WelcomeEmail, {
			name: "Wanderer",
			audienceType: "wanderer",
		}),
	},
	{
		name: "WelcomeEmail-promo",
		category: "sequences",
		description: "Day 0 — Promo welcome",
		element: React.createElement(WelcomeEmail, {
			name: "Alex",
			audienceType: "promo",
		}),
	},
	{
		name: "WelcomeEmail-rooted",
		category: "sequences",
		description: "Day 0 — Rooted welcome",
		element: React.createElement(WelcomeEmail, {
			name: "River",
			audienceType: "rooted",
		}),
	},
	{
		name: "Day1Email-rooted",
		category: "sequences",
		description: "Day 1 — Making it yours (Rooted only)",
		element: React.createElement(Day1Email, {
			name: "River",
			audienceType: "rooted" as const,
		}),
	},
	{
		name: "Day7Email-wanderer",
		category: "sequences",
		description: "Day 7 — What makes Grove different",
		element: React.createElement(Day7Email, {
			name: "Wanderer",
			audienceType: "wanderer",
		}),
	},
	{
		name: "Day7Email-promo",
		category: "sequences",
		description: "Day 7 — Still thinking about it?",
		element: React.createElement(Day7Email, {
			name: "Alex",
			audienceType: "promo",
		}),
	},
	{
		name: "Day7Email-rooted",
		category: "sequences",
		description: "Day 7 — The blank page",
		element: React.createElement(Day7Email, {
			name: "River",
			audienceType: "rooted",
		}),
	},
	{
		name: "Day14Email-wanderer",
		category: "sequences",
		description: "Day 14 — Why Grove exists",
		element: React.createElement(Day14Email, {
			name: "Wanderer",
			audienceType: "wanderer" as const,
		}),
	},
	{
		name: "Day30Email-wanderer",
		category: "sequences",
		description: "Day 30 — Still there?",
		element: React.createElement(Day30Email, {
			name: "Wanderer",
			audienceType: "wanderer" as const,
		}),
	},

	// ── Invites ────────────────────────────────────────────────────────
	{
		name: "BetaInviteEmail-beta",
		category: "invites",
		description: "Beta invite — early access",
		element: React.createElement(BetaInviteEmail, {
			name: "Wanderer",
			tier: "seedling",
			inviteType: "beta",
		}),
	},
	{
		name: "BetaInviteEmail-comped",
		category: "invites",
		description: "Comped invite — gifted plan",
		element: React.createElement(BetaInviteEmail, {
			name: "River",
			tier: "canopy",
			inviteType: "comped",
		}),
	},
	{
		name: "BetaInviteEmail-custom-message",
		category: "invites",
		description: "Beta invite with personal message",
		element: React.createElement(BetaInviteEmail, {
			name: "Alex",
			tier: "seedling",
			inviteType: "beta",
			customMessage: "Loved your writing on indie web. I think you'd really enjoy building here.",
		}),
	},

	// ── Lifecycle ───────────────────────────────────────────────────────
	{
		name: "RenewalThankYou",
		category: "lifecycle",
		description: "Subscription renewal confirmation",
		element: React.createElement(RenewalThankYou, {
			name: "River",
			nextRenewalDate: "March 6, 2026",
		}),
	},
	{
		name: "GentleNudge",
		category: "lifecycle",
		description: "Check-in for quiet users",
		element: React.createElement(GentleNudge, {
			name: "River",
			timeSincePost: "a few weeks",
		}),
	},

	// ── Updates ─────────────────────────────────────────────────────────
	{
		name: "PatchNotesEmail",
		category: "updates",
		description: "Feature release notes",
		element: React.createElement(PatchNotesEmail, {
			version: "v0.9.98",
			date: "February 2026",
			notes: [
				{
					icon: "🎨",
					title: "Custom Themes",
					description:
						"Choose from six new color palettes or create your own. Your grove, your colors.",
					tag: "new" as const,
				},
				{
					icon: "📧",
					title: "Email Preview Tool",
					description: "Preview email templates before sending. See exactly what your readers see.",
					tag: "new" as const,
				},
				{
					icon: "🛡️",
					title: "Shade v3",
					description:
						"Updated crawler protection with two new detection layers. Your content stays yours.",
					tag: "improved" as const,
				},
				{
					icon: "🐛",
					title: "Timeline Rendering",
					description: "Fixed an issue where timeline entries could overlap on mobile viewports.",
					tag: "fixed" as const,
				},
			],
		}),
	},
	{
		name: "AnnouncementEmail",
		category: "updates",
		description: "General announcement",
		element: React.createElement(AnnouncementEmail, {
			title: "Grove is growing",
			preview: "Some news from the forest.",
			paragraphs: [
				"Something has been growing quietly in the background, and I wanted to share it with you first.",
				"Over the past month, Grove has welcomed 200 new Wanderers. That might not sound like much in a world of billions, but every one of them chose something different. Something quieter.",
				"Thank you for being here. For believing that the internet can still have places like this.",
			],
			cta: { text: "Visit the Grove", url: "https://grove.place" },
			closing: "More updates coming soon. As always, just reply if you want to talk.",
		}),
	},

	// ── Seasonal ────────────────────────────────────────────────────────
	{
		name: "SeasonalGreeting-spring",
		category: "seasonal",
		description: "Spring greeting",
		element: React.createElement(SeasonalGreeting, {
			name: "Wanderer",
			season: "spring",
		}),
	},
	{
		name: "SeasonalGreeting-summer",
		category: "seasonal",
		description: "Summer greeting",
		element: React.createElement(SeasonalGreeting, {
			name: "Wanderer",
			season: "summer",
		}),
	},
	{
		name: "SeasonalGreeting-autumn",
		category: "seasonal",
		description: "Autumn greeting",
		element: React.createElement(SeasonalGreeting, {
			name: "Wanderer",
			season: "autumn",
		}),
	},
	{
		name: "SeasonalGreeting-winter",
		category: "seasonal",
		description: "Winter greeting",
		element: React.createElement(SeasonalGreeting, {
			name: "Wanderer",
			season: "winter",
		}),
	},

	// ── Porch ───────────────────────────────────────────────────────────
	{
		name: "PorchReplyEmail",
		category: "porch",
		description: "Porch conversation reply notification",
		element: React.createElement(PorchReplyEmail, {
			recipientName: "River",
			replierName: "Autumn",
			replyContent:
				"Thank you for stopping by! I loved reading your thoughts on the latest post. The forest metaphor really resonated with me too \u2014 there\u2019s something about building in public that feels like tending a garden.\n\nLet me know if you\u2019d like to collaborate on something. Always happy to chat.",
			visitDate: "January 15, 2026",
			conversationUrl: "https://autumn.grove.place/porch/visit/abc123",
		}),
	},
];

// ---------------------------------------------------------------------------
// Index page generator — the visual browser for all rendered templates
// ---------------------------------------------------------------------------

function generateIndexHtml(
	rendered: { name: string; category: string; description: string }[],
): string {
	const categories = [...new Set(rendered.map((r) => r.category))];

	const categoryLabels: Record<string, string> = {
		sequences: "Onboarding Sequences",
		invites: "Invites",
		lifecycle: "Lifecycle",
		updates: "Updates & Patch Notes",
		seasonal: "Seasonal Greetings",
		porch: "Porch Replies",
	};

	const sidebarItems = categories
		.map((cat) => {
			const items = rendered.filter((r) => r.category === cat);
			const links = items
				.map(
					(item) =>
						`<a href="#" class="template-link" data-src="${item.name}.html" title="${item.description}">${item.name}</a>`,
				)
				.join("\n          ");
			return `
        <div class="category">
          <h3>${categoryLabels[cat] || cat}</h3>
          ${links}
        </div>`;
		})
		.join("\n");

	const firstTemplate = rendered[0]?.name || "";

	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Grove Email Preview</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: Georgia, Cambria, "Times New Roman", serif;
      background: #fefdfb;
      color: #3d2914;
      display: flex;
      height: 100vh;
      overflow: hidden;
    }

    /* ── Sidebar ─────────────────────────────────────────────── */
    .sidebar {
      width: 280px;
      min-width: 280px;
      background: #f0fdf4;
      border-right: 1px solid #e2e8d8;
      overflow-y: auto;
      padding: 24px 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .sidebar h1 {
      font-size: 18px;
      font-weight: normal;
      margin-bottom: 4px;
      color: #3d2914;
    }

    .sidebar .subtitle {
      font-size: 12px;
      color: rgba(61, 41, 20, 0.5);
      margin-bottom: 16px;
    }

    .category h3 {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: rgba(61, 41, 20, 0.4);
      margin: 16px 0 6px 0;
      padding: 0 8px;
    }

    .template-link {
      display: block;
      padding: 8px 12px;
      font-size: 13px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #3d2914;
      text-decoration: none;
      border-radius: 6px;
      transition: background 0.15s;
    }

    .template-link:hover {
      background: rgba(22, 163, 74, 0.08);
    }

    .template-link.active {
      background: rgba(22, 163, 74, 0.12);
      font-weight: 600;
      color: #16a34a;
    }

    /* ── Main area ───────────────────────────────────────────── */
    .main {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* ── Toolbar ─────────────────────────────────────────────── */
    .toolbar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 20px;
      background: #fefdfb;
      border-bottom: 1px solid #e2e8d8;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .toolbar .template-name {
      font-size: 14px;
      font-weight: 600;
      color: #3d2914;
      flex: 1;
    }

    .toolbar .template-desc {
      font-size: 12px;
      color: rgba(61, 41, 20, 0.5);
      font-weight: normal;
      margin-left: 8px;
    }

    .width-toggle {
      display: flex;
      gap: 2px;
      background: #f0fdf4;
      border-radius: 6px;
      padding: 2px;
    }

    .width-toggle button {
      padding: 6px 12px;
      font-size: 12px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      border: none;
      background: transparent;
      border-radius: 4px;
      cursor: pointer;
      color: #3d2914;
      transition: all 0.15s;
    }

    .width-toggle button.active {
      background: #16a34a;
      color: white;
    }

    .width-toggle button:hover:not(.active) {
      background: rgba(22, 163, 74, 0.08);
    }

    .open-btn {
      padding: 6px 14px;
      font-size: 12px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      border: 1px solid #e2e8d8;
      background: white;
      border-radius: 6px;
      cursor: pointer;
      color: #3d2914;
      transition: all 0.15s;
    }

    .open-btn:hover {
      border-color: #16a34a;
      color: #16a34a;
    }

    /* ── Preview viewport ────────────────────────────────────── */
    .viewport {
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: 24px;
      background: #e8e4dc;
      overflow: auto;
    }

    .viewport iframe {
      background: white;
      border: none;
      border-radius: 8px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
      transition: width 0.3s ease;
      height: 100%;
      min-height: 600px;
    }

    /* ── Count badge ─────────────────────────────────────────── */
    .count {
      font-size: 11px;
      color: rgba(61, 41, 20, 0.4);
      text-align: center;
      padding: 16px 0;
      border-top: 1px solid #e2e8d8;
      margin-top: auto;
    }
  </style>
</head>
<body>
  <aside class="sidebar">
    <h1>Email Preview</h1>
    <p class="subtitle">Grove email templates</p>
    ${sidebarItems}
    <div class="count">${rendered.length} templates</div>
  </aside>

  <main class="main">
    <div class="toolbar">
      <span class="template-name" id="currentName">${firstTemplate}</span>
      <div class="width-toggle">
        <button data-width="375" title="Mobile (375px)">Mobile</button>
        <button data-width="600" class="active" title="Email client (600px)">Email</button>
        <button data-width="100%" title="Full width">Full</button>
      </div>
      <button class="open-btn" id="openBtn" title="Open in new tab">Open</button>
    </div>
    <div class="viewport">
      <iframe id="preview" src="${firstTemplate}.html" width="600"></iframe>
    </div>
  </main>

  <script>
    const iframe = document.getElementById('preview');
    const nameEl = document.getElementById('currentName');
    const openBtn = document.getElementById('openBtn');
    let currentSrc = '${firstTemplate}.html';

    // Template selection
    document.querySelectorAll('.template-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const src = link.dataset.src;
        const desc = link.title;
        currentSrc = src;
        iframe.src = src;
        nameEl.innerHTML = src.replace('.html', '') +
          '<span class="template-desc">' + desc + '</span>';

        document.querySelectorAll('.template-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
      });
    });

    // Activate first link
    const firstLink = document.querySelector('.template-link');
    if (firstLink) firstLink.classList.add('active');

    // Width toggle
    document.querySelectorAll('.width-toggle button').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.width-toggle button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const w = btn.dataset.width;
        iframe.style.width = w.includes('%') ? w : w + 'px';
      });
    });

    // Open in new tab
    openBtn.addEventListener('click', () => {
      window.open(currentSrc, '_blank');
    });
  </script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
	const args = process.argv.slice(2);
	const filter = args.find((a) => !a.startsWith("--"));
	const categoryFilter = args
		.find((a) => a.startsWith("--category"))
		?.split("=")[1]
		?.toLowerCase();

	const outDir = join(process.cwd(), ".preview", "email");
	mkdirSync(outDir, { recursive: true });

	// Filter templates
	let templates = TEMPLATES;
	if (filter) {
		templates = templates.filter((t) => t.name.toLowerCase().includes(filter.toLowerCase()));
	}
	if (categoryFilter) {
		templates = templates.filter((t) => t.category.toLowerCase().includes(categoryFilter));
	}

	if (templates.length === 0) {
		console.error(`No templates matched filter: ${filter || categoryFilter}`);
		console.error(`Available: ${TEMPLATES.map((t) => t.name).join(", ")}`);
		process.exit(1);
	}

	console.log(`Rendering ${templates.length} email templates...\n`);

	const rendered: { name: string; category: string; description: string }[] = [];

	for (const template of templates) {
		try {
			const html = await render(template.element, { pretty: true });
			const filePath = join(outDir, `${template.name}.html`);
			writeFileSync(filePath, html);
			rendered.push({
				name: template.name,
				category: template.category,
				description: template.description,
			});
			console.log(`  ${template.name}`);
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			console.error(`  FAILED: ${template.name} — ${msg}`);
		}
	}

	// Generate index viewer
	const indexHtml = generateIndexHtml(rendered);
	const indexPath = join(outDir, "index.html");
	writeFileSync(indexPath, indexHtml);

	console.log(`\n${rendered.length} templates rendered to .preview/email/`);
	console.log(`\nOpen in browser:`);
	console.log(`  ${indexPath}`);
}

main().catch((error) => {
	console.error("Preview failed:", error);
	process.exit(1);
});
