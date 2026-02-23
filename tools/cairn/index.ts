import { readFileSync, statSync } from "fs";
import { readdir, stat } from "fs/promises";
import { join, relative, basename, dirname } from "path";
import matter from "gray-matter";
import MiniSearch from "minisearch";
import { Database } from "bun:sqlite";
import type { Document, Skill, CrushSession, ClaudeSession, IndexStats } from "./types.ts";

// ─── Constants ────────────────────────────────────────────────────────────────

const PROJECT_ROOT = join(import.meta.dir, "..", "..");
const CRUSH_DB_PATH = join(PROJECT_ROOT, ".crush", "crush.db");
const CLAUDE_PROJECTS_DIR = join(process.env.HOME!, ".claude", "projects");
const LATTICE_SESSION_DIR = join(CLAUDE_PROJECTS_DIR, "-Users-autumn-Documents-Projects-Lattice");

// Files and directories to skip during indexing
const DENY_PATTERNS = [
	".env",
	".env.",
	"secrets.json",
	"secrets_template.json",
	"secrets",
	"bun.lock",
	"pnpm-lock.yaml",
	"node_modules",
	".git",
	".crush",
	"dist",
	"build",
	".turbo",
	"coverage",
	"*.pem",
	"*.key",
	"*.cert",
];

// ─── Biome Derivation ─────────────────────────────────────────────────────────

function deriveBiome(relPath: string): string {
	const parts = relPath.split("/");
	if (parts[0] === "docs") return parts[1] ?? "docs";
	if (parts[0] === "AgentUsage") return "agent-usage";
	if (parts[0] === "snapshots") return "snapshots";
	if (parts[0] === ".claude") {
		if (parts[1] === "skills") return "skills";
		if (parts[1] === "agents") return "agents";
		return "claude";
	}
	if (parts[0] === "AGENT.md" || parts[0] === "CLAUDE.md") return "root";
	return parts[0] ?? "root";
}

function derivePlanStatus(relPath: string): string | undefined {
	if (!relPath.startsWith("docs/plans")) return undefined;
	const parts = relPath.split("/");
	// docs/plans/active/..., docs/plans/completed/...
	const statusDir = parts[2];
	if (["active", "completed", "planned", "planning"].includes(statusDir)) {
		return statusDir;
	}
	return undefined;
}

function pathToSlug(relPath: string): string {
	return relPath.replace(/\.md$/, "").replace(/[^a-z0-9-_/]/gi, "-");
}

// ─── Markdown Walker ──────────────────────────────────────────────────────────

async function walkMarkdown(
	dir: string,
	collected: Document[],
	rootOverride?: string,
): Promise<void> {
	const root = rootOverride ?? PROJECT_ROOT;
	let entries: string[];
	try {
		entries = (await readdir(dir)).sort();
	} catch {
		return;
	}

	for (const entry of entries) {
		if (DENY_PATTERNS.some((p) => entry === p || entry.startsWith(p))) continue;

		const fullPath = join(dir, entry);
		let st;
		try {
			st = await stat(fullPath);
		} catch {
			continue;
		}

		if (st.isDirectory()) {
			await walkMarkdown(fullPath, collected, root);
		} else if (entry.endsWith(".md")) {
			try {
				const raw = readFileSync(fullPath, "utf8");
				const { data: fm, content } = matter(raw);
				const relPath = relative(root, fullPath).replace(/\\/g, "/");
				const biome = deriveBiome(relPath);
				const planStatus = derivePlanStatus(relPath);

				const headings = extractHeadings(content);
				const wordCount = content.split(/\s+/).filter(Boolean).length;

				const doc: Document = {
					path: relPath,
					slug: pathToSlug(relPath),
					title: fm.title ?? headingTitle(content) ?? basename(fullPath, ".md"),
					description: fm.description,
					category: fm.category ?? fm.specCategory,
					specCategory: fm.specCategory,
					section: fm.section,
					order: fm.order,
					tags: normalizeTags(fm.tags),
					keywords: normalizeTags(fm.keywords),
					icon: fm.icon,
					aliases: fm.aliases,
					type: fm.type,
					lastUpdated: toDateStr(fm.lastUpdated ?? fm["date modified"]),
					dateCreated: toDateStr(fm["date created"] ?? fm.dateCreated),
					dateModified: toDateStr(fm["date modified"] ?? fm.dateModified),
					status: planStatus ?? fm.status,
					biome,
					content,
					wordCount,
					headings,
					modifiedAt: st.mtimeMs,
				};

				collected.push(doc);
			} catch {
				// Skip unreadable files
			}
		}
	}
}

function toDateStr(val: unknown): string | undefined {
	if (!val) return undefined;
	if (val instanceof Date) return val.toISOString().slice(0, 10);
	return String(val);
}

function normalizeTags(val: unknown): string[] | undefined {
	if (!val) return undefined;
	if (Array.isArray(val)) return val.map(String);
	if (typeof val === "string") return val.split(",").map((s) => s.trim());
	return undefined;
}

function headingTitle(content: string): string | undefined {
	const m = content.match(/^#\s+(.+)$/m);
	return m?.[1]?.trim();
}

function extractHeadings(content: string): import("./types.ts").Heading[] {
	const headings: import("./types.ts").Heading[] = [];
	const lines = content.split("\n");
	for (const line of lines) {
		const m = line.match(/^(#{1,4})\s+(.+)$/);
		if (m) {
			const text = m[2].trim();
			headings.push({
				level: m[1].length,
				text,
				id: slugifyHeading(text),
			});
		}
	}
	return headings;
}

function slugifyHeading(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^\w\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.trim();
}

// ─── Skill Scanner ────────────────────────────────────────────────────────────

async function scanSkills(): Promise<Skill[]> {
	const skillsDir = join(PROJECT_ROOT, ".claude", "skills");
	const skills: Skill[] = [];

	let dirs: string[];
	try {
		dirs = await readdir(skillsDir);
	} catch {
		return skills;
	}

	for (const skillName of dirs.sort()) {
		const skillDir = join(skillsDir, skillName);
		const skillFile = join(skillDir, "SKILL.md");

		try {
			await stat(skillFile);
		} catch {
			continue;
		}

		const raw = readFileSync(skillFile, "utf8");
		const { content } = matter(raw);

		// Extract display name from first h1
		const titleMatch = content.match(/^#\s+(.+)$/m);
		const displayName =
			titleMatch?.[1]?.replace(/[🐕🐘🦊🦉🐢🦫🦝🦌🐦‍⬛🦅🐦🕷️🦔🦡🐛🐝🦋🦜🦣🐗🌲🌿🍃]/gu, "").trim() ??
			skillName;

		// Extract description from first paragraph after title
		const descMatch = content.match(/^#[^\n]+\n+([^\n#]+)/m);
		const description = descMatch?.[1]?.trim() ?? "";

		// Extract emoji from name
		const emojiMatch = displayName.match(/\p{Emoji_Presentation}/u);

		// List references
		const refsDir = join(skillDir, "references");
		let references: string[] = [];
		try {
			const refFiles = await readdir(refsDir);
			references = refFiles.map((f) => join("references", f));
		} catch {
			// No references dir
		}

		// Extract phases
		const phases: string[] = [];
		const phaseMatches = content.matchAll(/^#{2,3}\s+(?:Phase\s+\d+[:\s]+)?(.+)$/gm);
		for (const m of phaseMatches) {
			phases.push(m[1].trim());
		}

		skills.push({
			name: skillName,
			displayName,
			description,
			skillFile: relative(PROJECT_ROOT, skillFile).replace(/\\/g, "/"),
			references,
			phases: phases.slice(0, 8),
			emoji: emojiMatch?.[0],
		});
	}

	return skills;
}

// ─── Crush DB Reader ──────────────────────────────────────────────────────────

function loadCrushSessions(): CrushSession[] {
	try {
		const db = new Database(CRUSH_DB_PATH, { readonly: true });

		const rows = db
			.query(
				`SELECT id, title, parent_session_id, message_count, prompt_tokens,
				        completion_tokens, cost, created_at, updated_at
				 FROM sessions ORDER BY created_at DESC`,
			)
			.all() as {
			id: string;
			title: string;
			parent_session_id?: string;
			message_count: number;
			prompt_tokens: number;
			completion_tokens: number;
			cost: number;
			created_at: string;
			updated_at: string;
		}[];

		db.close();

		return rows.map((r) => ({
			id: r.id,
			title: r.title ?? "Untitled Session",
			parentSessionId: r.parent_session_id,
			messageCount: r.message_count ?? 0,
			promptTokens: r.prompt_tokens ?? 0,
			completionTokens: r.completion_tokens ?? 0,
			cost: r.cost ?? 0,
			createdAt: new Date(r.created_at),
			updatedAt: new Date(r.updated_at),
		}));
	} catch {
		return [];
	}
}

export function loadCrushMessages(sessionId: string): CrushMessage[] {
	try {
		const db = new Database(CRUSH_DB_PATH, { readonly: true });

		const rows = db
			.query(
				`SELECT id, session_id, role, parts, model, provider, created_at
				 FROM messages WHERE session_id = ? ORDER BY created_at ASC`,
			)
			.all(sessionId) as {
			id: string;
			session_id: string;
			role: string;
			parts: string;
			model?: string;
			provider?: string;
			created_at: string;
		}[];

		db.close();

		return rows.map((r) => ({
			id: r.id,
			sessionId: r.session_id,
			role: r.role,
			parts: (() => {
				try {
					return JSON.parse(r.parts);
				} catch {
					return [];
				}
			})(),
			model: r.model,
			provider: r.provider,
			createdAt: new Date(r.created_at),
		}));
	} catch {
		return [];
	}
}

// ─── Claude Session Scanner ───────────────────────────────────────────────────

async function scanClaudeSessions(): Promise<ClaudeSession[]> {
	const sessions: ClaudeSession[] = [];

	let files: string[];
	try {
		files = await readdir(LATTICE_SESSION_DIR);
	} catch {
		return sessions;
	}

	const jsonlFiles = files.filter((f) => f.endsWith(".jsonl")).sort();

	for (const file of jsonlFiles) {
		const sessionId = file.replace(".jsonl", "");
		const fullPath = join(LATTICE_SESSION_DIR, file);

		try {
			const raw = readFileSync(fullPath, "utf8");
			const lines = raw.split("\n").filter(Boolean).slice(0, 50); // Read first 50 lines for metadata

			let slug: string | undefined;
			let gitBranch: string | undefined;
			let version: string | undefined;
			let createdAt: Date | undefined;
			let messageCount = 0;
			let toolCallCount = 0;

			for (const line of lines) {
				try {
					const obj = JSON.parse(line) as Record<string, unknown>;
					if (obj.type === "progress" && obj.sessionId === sessionId) {
						slug = slug ?? (obj.slug as string | undefined);
						gitBranch = gitBranch ?? (obj.gitBranch as string | undefined);
						version = version ?? (obj.version as string | undefined);
						if (!createdAt && obj.data && typeof obj.data === "object") {
							const data = obj.data as Record<string, unknown>;
							if (data.timestamp) {
								createdAt = new Date(data.timestamp as string);
							}
						}
					}
				} catch {
					// skip malformed lines
				}
			}

			// Count all lines for message estimate
			const allLines = raw.split("\n").filter(Boolean);
			messageCount = allLines.filter((l) => {
				try {
					const o = JSON.parse(l) as Record<string, unknown>;
					return o.type === "assistant" || o.type === "user";
				} catch {
					return false;
				}
			}).length;

			toolCallCount = allLines.filter((l) => {
				try {
					const o = JSON.parse(l) as Record<string, unknown>;
					return o.type === "assistant" && l.includes("tool_use");
				} catch {
					return false;
				}
			}).length;

			sessions.push({
				sessionId,
				project: "Lattice",
				slug,
				messageCount,
				toolCallCount,
				createdAt,
				gitBranch,
				version,
			});
		} catch {
			// Skip unreadable files
		}
	}

	return sessions;
}

// ─── In-Memory Store ──────────────────────────────────────────────────────────

export interface CairnIndex {
	documents: Map<string, Document>;
	skills: Skill[];
	crushSessions: CrushSession[];
	claudeSessions: ClaudeSession[];
	searchIndex: MiniSearch;
	stats: IndexStats;
}

export async function buildIndex(): Promise<CairnIndex> {
	const startTime = Date.now();
	console.log("🏔️  Cairn: building index...");

	// ── Walk all markdown sources ──────────────────────────────────────────────
	const docs: Document[] = [];

	const sources = [
		join(PROJECT_ROOT, "docs"),
		join(PROJECT_ROOT, "AgentUsage"),
		join(PROJECT_ROOT, "snapshots"),
		join(PROJECT_ROOT, ".claude", "agents"),
		join(PROJECT_ROOT, "AGENT.md"),
		join(PROJECT_ROOT, "CLAUDE.md"),
	];

	for (const source of sources) {
		try {
			const st = await stat(source);
			if (st.isDirectory()) {
				await walkMarkdown(source, docs);
			} else if (source.endsWith(".md")) {
				// Single root file
				const raw = readFileSync(source, "utf8");
				const { data: fm, content } = matter(raw);
				const relPath = relative(PROJECT_ROOT, source).replace(/\\/g, "/");
				docs.push({
					path: relPath,
					slug: pathToSlug(relPath),
					title: fm.title ?? headingTitle(content) ?? basename(source, ".md"),
					description: fm.description,
					category: fm.category,
					tags: normalizeTags(fm.tags),
					biome: "root",
					content,
					wordCount: content.split(/\s+/).filter(Boolean).length,
					headings: extractHeadings(content),
					modifiedAt: st.mtimeMs,
				});
			}
		} catch {
			// Source doesn't exist, skip
		}
	}

	// ── Skills ────────────────────────────────────────────────────────────────
	const skills = await scanSkills();

	// ── Agent Sessions ────────────────────────────────────────────────────────
	const crushSessions = loadCrushSessions();
	const claudeSessions = await scanClaudeSessions();

	// ── Search Index ──────────────────────────────────────────────────────────
	const searchIndex = new MiniSearch({
		fields: ["title", "description", "tags", "keywords", "content"],
		storeFields: ["path", "title", "description", "category", "biome", "icon", "lastUpdated"],
		searchOptions: {
			boost: { title: 3, tags: 2, keywords: 2, description: 1.5 },
			fuzzy: 0.2,
			prefix: true,
		},
	});

	const docMap = new Map<string, Document>();
	const searchDocs: {
		id: string;
		title: string;
		description: string;
		tags: string;
		keywords: string;
		content: string;
		path: string;
		category: string;
		biome: string;
		icon: string;
		lastUpdated: string;
	}[] = [];

	for (const doc of docs) {
		docMap.set(doc.slug, doc);
		searchDocs.push({
			id: doc.slug,
			title: doc.title ?? "",
			description: doc.description ?? "",
			tags: (doc.tags ?? []).join(" "),
			keywords: (doc.keywords ?? []).join(" "),
			content: doc.content.slice(0, 5000), // Limit content for index size
			path: doc.path,
			category: doc.category ?? doc.biome,
			biome: doc.biome,
			icon: doc.icon ?? "",
			lastUpdated: doc.lastUpdated ?? "",
		});
	}

	searchIndex.addAll(searchDocs);

	// ── Stats ─────────────────────────────────────────────────────────────────
	const biomes: Record<string, number> = {};
	for (const doc of docs) {
		biomes[doc.biome] = (biomes[doc.biome] ?? 0) + 1;
	}

	const elapsed = Date.now() - startTime;
	console.log(
		`✓  Indexed ${docs.length} docs, ${skills.length} skills, ${crushSessions.length} Crush sessions, ${claudeSessions.length} Claude sessions in ${elapsed}ms`,
	);

	return {
		documents: docMap,
		skills,
		crushSessions,
		claudeSessions,
		searchIndex,
		stats: {
			documents: docs.length,
			skills: skills.length,
			crushSessions: crushSessions.length,
			claudeSessions: claudeSessions.length,
			biomes,
			indexedAt: new Date(),
		},
	};
}
