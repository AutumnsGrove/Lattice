import type { CairnIndex } from "../index.ts";
import { renderMarkdown } from "../render.ts";
import { readFileSync } from "fs";
import { join } from "path";
import { escHtml, emptyState } from "./layout.ts";

const PROJECT_ROOT = join(import.meta.dir, "..", "..", "..");

// Skill packs — groupings for the ecosystem view
const SKILL_PACKS: { label: string; icon: string; skills: string[] }[] = [
	{
		label: "Security Pack",
		icon: "🛡️",
		skills: ["spider-weave", "raccoon-audit", "turtle-harden", "raven-investigate", "hawk-survey"],
	},
	{
		label: "Build Pack",
		icon: "🔨",
		skills: ["elephant-build", "beaver-build", "mole-debug", "fox-optimize"],
	},
	{
		label: "Architecture Pack",
		icon: "🏛️",
		skills: ["eagle-architect", "crow-reason", "swan-design"],
	},
	{
		label: "Planning Pack",
		icon: "📋",
		skills: ["bloodhound-scout", "bee-collect", "badger-triage", "groundhog-surface"],
	},
	{
		label: "Documentation Pack",
		icon: "📖",
		skills: ["owl-archive", "museum-documentation", "grove-documentation", "grove-spec-writing"],
	},
	{
		label: "UI Pack",
		icon: "🎨",
		skills: ["chameleon-adapt", "deer-sense", "grove-ui-design", "svelte5-development"],
	},
	{
		label: "Gathering (Multi-Animal)",
		icon: "🌲",
		skills: [
			"gathering-feature",
			"gathering-architecture",
			"gathering-ui",
			"gathering-security",
			"gathering-migration",
			"gathering-planning",
		],
	},
];

export function skillsPage(idx: CairnIndex): string {
	if (idx.skills.length === 0) {
		return emptyState("🌿", "No skills found in .claude/skills/");
	}

	// Build skill lookup
	const byName = new Map(idx.skills.map((s) => [s.name, s]));

	// Build pack HTML
	const packsHtml = SKILL_PACKS.map((pack) => {
		const packSkills = pack.skills
			.map((name) => byName.get(name))
			.filter(Boolean) as typeof idx.skills;

		if (packSkills.length === 0) return "";

		const cards = packSkills
			.map(
				(s) => `
			<a href="/skills/${escHtml(s.name)}" class="skill-card">
				<div class="skill-card-header">
					<span>${s.emoji ?? "🐾"}</span>
					<span class="skill-card-name">${escHtml(s.name)}</span>
				</div>
				<div class="skill-card-desc">${escHtml(s.description)}</div>
			</a>`,
			)
			.join("");

		return `
		<div class="mb-3">
			<div class="section-header mb-2">
				<span>${pack.icon}</span>
				<span class="section-title">${pack.label}</span>
			</div>
			<div class="skills-grid">${cards}</div>
		</div>`;
	}).join("");

	// All remaining skills not in packs
	const packedNames = new Set(SKILL_PACKS.flatMap((p) => p.skills));
	const others = idx.skills.filter((s) => !packedNames.has(s.name));
	const othersHtml =
		others.length > 0
			? `<div class="mb-3">
			<div class="section-header mb-2">
				<span class="section-title">Other Skills</span>
			</div>
			<div class="skills-grid">
				${others
					.map(
						(s) => `
				<a href="/skills/${escHtml(s.name)}" class="skill-card">
					<div class="skill-card-header">
						<span>${s.emoji ?? "🐾"}</span>
						<span class="skill-card-name">${escHtml(s.name)}</span>
					</div>
					<div class="skill-card-desc">${escHtml(s.description)}</div>
				</a>`,
					)
					.join("")}
			</div>
		</div>`
			: "";

	return `
<div class="page-header">
	<h1 class="page-title">🦎 The Animal Ecosystem</h1>
	<p class="page-subtitle">${idx.skills.length} skills across the grove</p>
</div>

${packsHtml}
${othersHtml}
`;
}

export function skillDetailPage(idx: CairnIndex, skillName: string): string | null {
	const skill = idx.skills.find((s) => s.name === skillName);
	if (!skill) return null;

	let html = "";
	try {
		const raw = readFileSync(join(PROJECT_ROOT, skill.skillFile), "utf8");
		// Strip frontmatter if present
		const content = raw.replace(/^---[\s\S]*?---\n/, "");
		html = renderMarkdown(content);
	} catch {
		html = `<p>Could not load SKILL.md</p>`;
	}

	return `
<div class="breadcrumb">
	<a href="/">Cairn</a><span class="sep">/</span>
	<a href="/skills">Skills</a><span class="sep">/</span>
	<span>${escHtml(skillName)}</span>
</div>

<div class="doc-viewer">
	<div class="doc-content">
		<div class="doc-frontmatter">
			<div class="doc-frontmatter-title">${skill.emoji ?? "🐾"} ${escHtml(skill.displayName)}</div>
			${skill.description ? `<div class="doc-frontmatter-desc">${escHtml(skill.description)}</div>` : ""}
			<div class="doc-frontmatter-meta">
				<span class="tag">${escHtml(skillName)}</span>
				${skill.references.length > 0 ? `<span class="tag tag-blue">${skill.references.length} references</span>` : ""}
			</div>
		</div>
		<div class="markdown-body">${html}</div>
	</div>
	${
		skill.phases && skill.phases.length > 0
			? `<div class="doc-toc">
			<div class="toc-title">Phases</div>
			${skill.phases.map((p) => `<div class="toc-link h2">${escHtml(p)}</div>`).join("")}
		</div>`
			: ""
	}
</div>`;
}
