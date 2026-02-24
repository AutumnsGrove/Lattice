// ─── Document ─────────────────────────────────────────────────────────────────

export interface Heading {
	level: number;
	text: string;
	id: string;
}

export interface Document {
	// Identity
	path: string;
	slug: string;

	// Frontmatter (all optional)
	title?: string;
	description?: string;
	category?: string;
	specCategory?: string;
	section?: string;
	order?: number;
	tags?: string[];
	keywords?: string[];
	icon?: string;
	aliases?: string[];
	type?: string;
	lastUpdated?: string;
	dateCreated?: string;
	dateModified?: string;
	status?: string;

	// Derived
	biome: string;
	content: string;
	wordCount: number;
	headings: Heading[];
	modifiedAt: number; // mtime for sorting
}

// ─── Skill ────────────────────────────────────────────────────────────────────

export interface Skill {
	name: string;
	displayName: string;
	description: string;
	skillFile: string;
	references: string[];
	phases?: string[];
	pairsWith?: string[];
	emoji?: string;
}

// ─── Agent Sessions ───────────────────────────────────────────────────────────

export interface CrushSession {
	id: string;
	title: string;
	parentSessionId?: string;
	messageCount: number;
	promptTokens: number;
	completionTokens: number;
	cost: number;
	createdAt: Date;
	updatedAt: Date;
	summary?: string;
}

export interface CrushMessage {
	id: string;
	sessionId: string;
	role: string;
	parts: unknown[];
	model?: string;
	provider?: string;
	createdAt: Date;
}

export interface ClaudeSession {
	sessionId: string;
	project: string;
	filePath: string;
	slug?: string;
	messageCount: number;
	toolCallCount: number;
	createdAt?: Date;
	gitBranch?: string;
	version?: string;
}

// ─── ccusage ──────────────────────────────────────────────────────────────────

export interface CCUsageModelBreakdown {
	modelName: string;
	totalCost: number;
	totalTokens: number;
	inputTokens?: number;
	outputTokens?: number;
	cacheCreationTokens?: number;
	cacheReadTokens?: number;
}

export interface CCUsageMonth {
	month: string; // "2025-11"
	totalCost: number;
	totalTokens: number;
	modelsUsed: string[];
	modelBreakdowns: CCUsageModelBreakdown[];
}

// ─── Index ────────────────────────────────────────────────────────────────────

export interface SearchResult {
	id: string;
	score: number;
	path: string;
	title: string;
	description?: string;
	category?: string;
	biome: string;
	icon?: string;
	lastUpdated?: string;
}

export interface IndexStats {
	documents: number;
	skills: number;
	crushSessions: number;
	claudeSessions: number;
	biomes: Record<string, number>;
	indexedAt: Date;
}
