/**
 * Greenhouse Features Article Generator
 *
 * Reads .github/graft-inventory.json and generates a help center article
 * listing all greenhouse features grouped by maturity stage.
 *
 * Run: bun run tools/generate-greenhouse-article.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

interface GraftFlag {
	id: string;
	name: string;
	type: string;
	greenhouseOnly: boolean;
	migration: string;
	description: string;
	deprecated?: boolean;
	maturity?: string;
}

interface GraftInventory {
	flags: GraftFlag[];
}

const ROOT = join(import.meta.dir, "..");
const INVENTORY_PATH = join(ROOT, ".github/graft-inventory.json");
const OUTPUT_PATH = join(ROOT, "docs/help-center/articles/greenhouse-features.md");

const MATURITY_ORDER = ["experimental", "beta", "stable", "graduated"] as const;

const MATURITY_LABELS: Record<string, string> = {
	experimental: "Experimental",
	beta: "Beta",
	stable: "Stable",
	graduated: "Graduated",
};

const MATURITY_DESCRIPTIONS: Record<string, string> = {
	experimental:
		"These are the newest additions—fresh from the greenhouse. They're functional but still finding their shape. Expect changes.",
	beta: "These features have been through early testing and are approaching their final form. They're reliable but may still evolve.",
	stable:
		"Proven and polished. These features have graduated from testing and are available to all greenhouse members.",
	graduated:
		"These features have left the greenhouse entirely and are now part of Grove for everyone. They're listed here for reference.",
};

function generateArticle(inventory: GraftInventory): string {
	const today = new Date().toISOString().split("T")[0];

	// Filter to greenhouse-only flags (or graduated ones worth mentioning)
	const greenhouseFlags = inventory.flags.filter(
		(f) => f.greenhouseOnly || f.maturity === "graduated",
	);

	// Group by maturity
	const grouped = new Map<string, GraftFlag[]>();
	for (const flag of greenhouseFlags) {
		const maturity = flag.maturity || "experimental";
		if (!grouped.has(maturity)) grouped.set(maturity, []);
		grouped.get(maturity)!.push(flag);
	}

	// Build feature sections
	const sections: string[] = [];
	for (const maturity of MATURITY_ORDER) {
		const flags = grouped.get(maturity);
		if (!flags || flags.length === 0) continue;

		const label = MATURITY_LABELS[maturity];
		const description = MATURITY_DESCRIPTIONS[maturity];

		sections.push(`## ${label} Features\n`);
		sections.push(`${description}\n`);

		for (const flag of flags.sort((a, b) => a.name.localeCompare(b.name))) {
			const deprecated = flag.deprecated ? " *(deprecated)*" : "";
			sections.push(`- **${flag.name}**${deprecated} — ${flag.description}`);
		}

		sections.push("");
	}

	const activeCount = greenhouseFlags.filter(
		(f) => f.maturity !== "graduated" && !f.deprecated,
	).length;

	return `---
title: Greenhouse Features
description: What's growing in the greenhouse — experimental and beta features you can try today
category: help
section: how-it-works
lastUpdated: '${today}'
keywords:
  - greenhouse
  - features
  - experimental
  - beta
  - early access
order: 71
---

# Greenhouse Features

The greenhouse is where new features take root before they're ready for the open air. If you're a greenhouse member, these are the features you can explore right now.

Currently there are **${activeCount} active features** in the greenhouse at various stages of growth.

For more about how the greenhouse program works, see [[greenhouse|What is Greenhouse?]].

${sections.join("\n")}
## How maturity works

Every feature in the greenhouse follows a lifecycle:

1. **Experimental** — Brand new, actively being shaped. Things might change.
2. **Beta** — Tested and approaching final form. Reliable but still evolving.
3. **Stable** — Proven through use. Available to all greenhouse members.
4. **Graduated** — Shipped to everyone. No longer greenhouse-exclusive.

You can toggle greenhouse features on or off for your site in your [[grafts|settings]]. Your preferences are saved per-feature, and you can always reset to defaults.

## Related

- [[greenhouse|What is Greenhouse?]] — How the program works
- [[grafts|What are Grafts?]] — How features get enabled
- [[porch|What is Porch?]] — Where to send feedback

---

*Every feature starts as a seedling. The greenhouse gives it room to grow.*
`;
}

// Main
const raw = readFileSync(INVENTORY_PATH, "utf-8");
const inventory = JSON.parse(raw) as GraftInventory;
const article = generateArticle(inventory);
writeFileSync(OUTPUT_PATH, article);

const flagCount = inventory.flags.filter((f) => f.greenhouseOnly).length;
console.log(`Generated greenhouse-features.md with ${flagCount} greenhouse flags`);
