import { readFileSync } from "fs";
import type { CairnIndex } from "../index.ts";
import { loadCrushMessages } from "../index.ts";
import { escHtml, formatDate, emptyState } from "./layout.ts";
import type { CrushMessage } from "../types.ts";

// ─── Agent Dashboard ──────────────────────────────────────────────────────────

export function agentsDashboard(idx: CairnIndex): string {
	const { crushSessions, claudeSessions, stats } = idx;

	const crushTotal = crushSessions.reduce((s, c) => s + (c.cost ?? 0), 0);
	const crushPromptTokens = crushSessions.reduce((s, c) => s + (c.promptTokens ?? 0), 0);
	const crushCompletionTokens = crushSessions.reduce((s, c) => s + (c.completionTokens ?? 0), 0);

	// File heatmap: count files from Crush sessions
	// (We'd need per-session file data, but we can show session activity instead)
	const recentCrush = crushSessions.slice(0, 8);
	const recentClaude = claudeSessions.slice(0, 8);

	const crushRows = recentCrush
		.map(
			(s) => `
		<a href="/agents/crush/${escHtml(s.id)}" style="display:grid;grid-template-columns:1fr auto auto;gap:1rem;align-items:center;padding:0.65rem 0.9rem;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:6px;text-decoration:none;margin-bottom:0.4rem;transition:border-color 0.15s;">
			<div>
				<div class="session-title">${escHtml(s.title)}</div>
				<div class="session-meta">${formatDate(s.updatedAt)}</div>
			</div>
			<span class="session-msgs">${s.messageCount} msgs</span>
			<span class="session-cost">$${(s.cost ?? 0).toFixed(2)}</span>
		</a>`,
		)
		.join("");

	const claudeRows = recentClaude
		.map(
			(s) => `
		<a href="/agents/claude/${escHtml(s.sessionId)}" style="display:grid;grid-template-columns:1fr auto auto;gap:1rem;align-items:center;padding:0.65rem 0.9rem;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:6px;text-decoration:none;margin-bottom:0.4rem;transition:border-color 0.15s;">
			<div>
				<div class="session-title">${escHtml(s.slug ?? s.sessionId)}</div>
				<div class="session-meta">${s.gitBranch ? escHtml(s.gitBranch) + " · " : ""}${s.createdAt ? formatDate(s.createdAt) : ""}</div>
			</div>
			<span class="session-msgs">${s.messageCount} msgs</span>
			<span class="session-msgs" style="color:var(--text-muted);">${s.toolCallCount} tools</span>
		</a>`,
		)
		.join("");

	return `
<div class="page-header">
	<h1 class="page-title">🤖 Agent Activity</h1>
	<p class="page-subtitle">Every session, every decision, every stone on the pile.</p>
</div>

<!-- Summary stats -->
<div class="stats-grid mb-3">
	<div class="stat-card">
		<div class="stat-number">${crushSessions.length}</div>
		<div class="stat-label">Crush Sessions</div>
	</div>
	<div class="stat-card">
		<div class="stat-number">$${crushTotal.toFixed(2)}</div>
		<div class="stat-label">Total Crush Cost</div>
	</div>
	<div class="stat-card">
		<div class="stat-number">${(crushPromptTokens / 1000).toFixed(0)}k</div>
		<div class="stat-label">Prompt Tokens</div>
	</div>
	<div class="stat-card">
		<div class="stat-number">${(crushCompletionTokens / 1000).toFixed(0)}k</div>
		<div class="stat-label">Completion Tokens</div>
	</div>
	<div class="stat-card">
		<div class="stat-number">${claudeSessions.length}</div>
		<div class="stat-label">Claude Sessions</div>
	</div>
</div>

<div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem;align-items:start;">
	<div>
		<div class="section-header mb-2">
			<span class="section-title">💬 Crush Sessions</span>
			<a href="/agents/crush" style="margin-left:auto;font-size:0.72rem;color:var(--text-muted);">all ${crushSessions.length} →</a>
		</div>
		${crushRows || emptyState("💬", "No Crush sessions found.")}
	</div>
	<div>
		<div class="section-header mb-2">
			<span class="section-title">📜 Claude Sessions</span>
			<a href="/agents/claude" style="margin-left:auto;font-size:0.72rem;color:var(--text-muted);">all ${claudeSessions.length} →</a>
		</div>
		${claudeRows || emptyState("📜", "No Claude sessions found.")}
	</div>
</div>
`;
}

// ─── Crush Session List ───────────────────────────────────────────────────────

export function crushSessionsPage(idx: CairnIndex): string {
	const { crushSessions } = idx;

	if (crushSessions.length === 0) {
		return emptyState("💬", "No Crush sessions found.");
	}

	const totalCost = crushSessions.reduce((s, c) => s + (c.cost ?? 0), 0);

	const rows = crushSessions
		.map(
			(s) => `
		<a href="/agents/crush/${escHtml(s.id)}" style="display:grid;grid-template-columns:1fr 80px 80px 80px;gap:1rem;align-items:center;padding:0.65rem 1rem;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:6px;text-decoration:none;margin-bottom:0.4rem;transition:border-color 0.15s;">
			<div>
				<div class="session-title">${escHtml(s.title)}</div>
				<div class="session-meta">${formatDate(s.updatedAt)}</div>
			</div>
			<span class="session-msgs" style="text-align:right;">${s.messageCount} msgs</span>
			<span class="session-msgs" style="text-align:right;color:var(--accent-blue);">${((s.promptTokens + s.completionTokens) / 1000).toFixed(1)}k tok</span>
			<span class="session-cost" style="text-align:right;">$${(s.cost ?? 0).toFixed(2)}</span>
		</a>`,
		)
		.join("");

	return `
<div class="page-header">
	<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;">
		<div>
			<h1 class="page-title">💬 Crush Sessions</h1>
			<p class="page-subtitle">${crushSessions.length} sessions · $${totalCost.toFixed(2)} total</p>
		</div>
		<a href="/agents" style="font-size:0.78rem;color:var(--text-secondary);">← Agents</a>
	</div>
</div>

<div style="display:grid;grid-template-columns:1fr 80px 80px 80px;gap:1rem;padding:0.4rem 1rem;font-size:0.68rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-muted);margin-bottom:0.25rem;">
	<span>Session</span>
	<span style="text-align:right;">Msgs</span>
	<span style="text-align:right;">Tokens</span>
	<span style="text-align:right;">Cost</span>
</div>

${rows}
`;
}

// ─── Crush Session Detail ─────────────────────────────────────────────────────

export function crushSessionDetailPage(idx: CairnIndex, sessionId: string): string | null {
	const session = idx.crushSessions.find((s) => s.id === sessionId);
	if (!session) return null;

	const messages = loadCrushMessages(sessionId);

	const messagesHtml =
		messages.length === 0
			? `<p style="color:var(--text-muted);font-style:italic;">No messages found.</p>`
			: messages.map((m) => renderCrushMessage(m)).join("");

	return `
<div class="breadcrumb">
	<a href="/">Cairn</a><span class="sep">/</span>
	<a href="/agents">Agents</a><span class="sep">/</span>
	<a href="/agents/crush">Crush</a><span class="sep">/</span>
	<span>${escHtml(session.title)}</span>
</div>

<div style="display:grid;grid-template-columns:1fr 240px;gap:2rem;align-items:start;">
	<div>
		<div class="doc-frontmatter" style="margin-bottom:1.5rem;">
			<div class="doc-frontmatter-title">💬 ${escHtml(session.title)}</div>
			<div class="doc-frontmatter-meta">
				<span class="tag">${session.messageCount} messages</span>
				<span class="tag tag-green">$${(session.cost ?? 0).toFixed(2)}</span>
				<span class="tag tag-blue">${((session.promptTokens + session.completionTokens) / 1000).toFixed(1)}k tokens</span>
				<span style="color:var(--text-muted);font-size:0.72rem;">${formatDate(session.createdAt)}</span>
			</div>
		</div>

		<div style="display:flex;flex-direction:column;gap:0.75rem;">
			${messagesHtml}
		</div>
	</div>

	<!-- Sidebar stats -->
	<div class="doc-toc">
		<div class="toc-title">Session Info</div>
		<div style="display:flex;flex-direction:column;gap:0.5rem;margin-top:0.5rem;">
			<div style="font-size:0.75rem;">
				<div style="color:var(--text-muted);font-size:0.68rem;margin-bottom:0.1rem;">Cost</div>
				<div style="color:var(--accent-green);font-family:var(--font-mono);">$${(session.cost ?? 0).toFixed(4)}</div>
			</div>
			<div style="font-size:0.75rem;">
				<div style="color:var(--text-muted);font-size:0.68rem;margin-bottom:0.1rem;">Prompt Tokens</div>
				<div style="font-family:var(--font-mono);">${session.promptTokens.toLocaleString()}</div>
			</div>
			<div style="font-size:0.75rem;">
				<div style="color:var(--text-muted);font-size:0.68rem;margin-bottom:0.1rem;">Completion Tokens</div>
				<div style="font-family:var(--font-mono);">${session.completionTokens.toLocaleString()}</div>
			</div>
			<div style="font-size:0.75rem;">
				<div style="color:var(--text-muted);font-size:0.68rem;margin-bottom:0.1rem;">Created</div>
				<div>${formatDate(session.createdAt)}</div>
			</div>
			<div style="font-size:0.75rem;">
				<div style="color:var(--text-muted);font-size:0.68rem;margin-bottom:0.1rem;">Updated</div>
				<div>${formatDate(session.updatedAt)}</div>
			</div>
		</div>
	</div>
</div>
`;
}

function renderCrushMessage(m: CrushMessage): string {
	const isUser = m.role === "user";
	const bgColor = isUser ? "rgba(122, 158, 196, 0.08)" : "rgba(255, 255, 255, 0.03)";
	const borderColor = isUser ? "rgba(122, 158, 196, 0.2)" : "var(--glass-border)";
	const roleLabel = isUser ? "You" : (m.model ?? m.provider ?? "Crush");

	// Extract text from parts
	let text = "";
	if (Array.isArray(m.parts)) {
		for (const part of m.parts) {
			if (typeof part === "string") {
				text += part;
			} else if (part && typeof part === "object") {
				const p = part as Record<string, unknown>;
				if (p.type === "text" && typeof p.text === "string") {
					text += p.text;
				} else if (p.type === "tool_use") {
					text += `\n\`[tool: ${p.name}]\`\n`;
				} else if (p.type === "tool_result") {
					text += `\n\`[tool result]\`\n`;
				}
			}
		}
	}

	const truncated = text.length > 2000 ? text.slice(0, 2000) + "\n\n*[truncated…]*" : text;
	const escaped = escHtml(truncated);

	return `
<div style="background:${bgColor};border:1px solid ${borderColor};border-radius:8px;padding:0.9rem 1rem;">
	<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;">
		<span style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${isUser ? "var(--accent-blue)" : "var(--accent-warm)"};">${escHtml(roleLabel)}</span>
		<span style="font-size:0.68rem;color:var(--text-muted);">${formatDate(m.createdAt)}</span>
	</div>
	<div style="font-size:0.82rem;color:var(--text-secondary);white-space:pre-wrap;line-height:1.6;">${escaped}</div>
</div>`;
}

// ─── Claude Session List ──────────────────────────────────────────────────────

export function claudeSessionsPage(idx: CairnIndex): string {
	const { claudeSessions } = idx;

	if (claudeSessions.length === 0) {
		return emptyState("📜", "No Claude Code sessions found.");
	}

	// Count sessions per project for the subtitle
	const projectCounts = new Map<string, number>();
	for (const s of claudeSessions) {
		projectCounts.set(s.project, (projectCounts.get(s.project) ?? 0) + 1);
	}
	const projectSummary = [...projectCounts.entries()]
		.sort((a, b) => b[1] - a[1])
		.map(([p, n]) => `${escHtml(p)} (${n})`)
		.join(" · ");

	const rows = claudeSessions
		.map(
			(s) => `
		<a href="/agents/claude/${escHtml(s.sessionId)}" style="display:grid;grid-template-columns:1fr auto auto auto auto;gap:1rem;align-items:center;padding:0.65rem 1rem;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:6px;text-decoration:none;margin-bottom:0.4rem;transition:border-color 0.15s;">
			<div>
				<div class="session-title">${escHtml(s.slug ?? s.sessionId.slice(0, 8) + "…")}</div>
				<div class="session-meta" style="font-family:var(--font-mono);font-size:0.68rem;">${escHtml(s.sessionId.slice(0, 12))}… ${s.gitBranch ? "· " + escHtml(s.gitBranch) : ""}</div>
			</div>
			<span class="tag" style="white-space:nowrap;">${escHtml(s.project)}</span>
			${s.createdAt ? `<span class="session-meta">${formatDate(s.createdAt)}</span>` : "<span></span>"}
			<span class="session-msgs">${s.messageCount} msgs</span>
			<span class="session-msgs" style="color:var(--accent-blue);">${s.toolCallCount} tools</span>
		</a>`,
		)
		.join("");

	return `
<div class="page-header">
	<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;">
		<div>
			<h1 class="page-title">Claude Sessions</h1>
			<p class="page-subtitle">${claudeSessions.length} sessions across all projects · ${projectSummary}</p>
		</div>
		<a href="/agents" style="font-size:0.78rem;color:var(--text-secondary);">← Agents</a>
	</div>
</div>

${rows}
`;
}

// ─── Claude Session Detail ────────────────────────────────────────────────────

export function claudeSessionDetailPage(idx: CairnIndex, sessionId: string): string | null {
	const session = idx.claudeSessions.find((s) => s.sessionId === sessionId);
	if (!session) return null;

	// Read the JSONL file using the stored path
	const filePath = session.filePath;
	const messages: { role: string; text: string; ts?: string; tools?: string[] }[] = [];

	try {
		const raw = readFileSync(filePath, "utf8");
		const lines = raw.split("\n").filter(Boolean);
		for (const line of lines) {
			try {
				const obj = JSON.parse(line) as Record<string, unknown>;
				if (obj.type === "user" || obj.type === "assistant") {
					const role = obj.type as string;
					const msg = obj.message as Record<string, unknown> | undefined;
					let text = "";
					const tools: string[] = [];

					const content = msg?.content ?? obj.content;
					if (Array.isArray(content)) {
						for (const c of content) {
							if (c && typeof c === "object") {
								const part = c as Record<string, unknown>;
								if (part.type === "text" && typeof part.text === "string") {
									text += part.text;
								} else if (part.type === "tool_use" && typeof part.name === "string") {
									tools.push(part.name);
								} else if (part.type === "tool_result") {
									// skip
								}
							}
						}
					} else if (typeof content === "string") {
						text = content;
					}

					if (text || tools.length > 0) {
						messages.push({ role, text, tools });
					}
				}
			} catch {
				// skip
			}
		}
	} catch {
		return null;
	}

	// Limit to first 100 messages for performance
	const displayMessages = messages.slice(0, 100);
	const truncated = messages.length > 100;

	const toolOnlyCount = displayMessages.filter(
		(m) => !m.text.trim() && (m.tools?.length ?? 0) > 0,
	).length;

	const msgsHtml = displayMessages
		.map((m) => {
			const isUser = m.role === "user";
			const isToolOnly = !m.text.trim() && (m.tools?.length ?? 0) > 0;
			const bg = isUser ? "rgba(122, 158, 196, 0.08)" : "rgba(255, 255, 255, 0.03)";
			const border = isUser ? "rgba(122, 158, 196, 0.2)" : "var(--glass-border)";
			const roleColor = isUser ? "var(--accent-blue)" : "var(--accent-warm)";

			const preview = m.text.trim().slice(0, 1500);
			const toolsHtml = (m.tools ?? [])
				.map((t) => `<span class="tag tag-warm" style="margin-right:0.25rem;">${escHtml(t)}</span>`)
				.join("");

			return `
		<div ${isToolOnly ? 'data-tool-only="true"' : ""} style="background:${bg};border:1px solid ${border};border-radius:8px;padding:0.85rem 1rem;">
			<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:${preview || toolsHtml ? "0.4rem" : "0"};">
				<span style="font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${roleColor};">${m.role}</span>
				${toolsHtml}
			</div>
			${preview ? `<div style="font-size:0.8rem;color:var(--text-secondary);white-space:pre-wrap;line-height:1.55;">${escHtml(preview)}${m.text.length > 1500 ? "\n[…]" : ""}</div>` : ""}
		</div>`;
		})
		.join("");

	return `
<div class="breadcrumb">
	<a href="/">Cairn</a><span class="sep">/</span>
	<a href="/agents">Agents</a><span class="sep">/</span>
	<a href="/agents/claude">Claude</a><span class="sep">/</span>
	<span style="font-family:var(--font-mono);font-size:0.85em;">${escHtml(sessionId.slice(0, 12))}…</span>
</div>

<div style="display:grid;grid-template-columns:1fr 220px;gap:2rem;align-items:start;">
	<div>
		<div class="doc-frontmatter" style="margin-bottom:1.5rem;">
			<div class="doc-frontmatter-title">📜 ${escHtml(session.slug ?? sessionId)}</div>
			<div class="doc-frontmatter-meta">
				<span class="tag">${session.messageCount} messages</span>
				<span class="tag tag-blue">${session.toolCallCount} tool calls</span>
				${session.gitBranch ? `<span class="tag">${escHtml(session.gitBranch)}</span>` : ""}
				${session.version ? `<span class="tag tag-warm">v${escHtml(session.version)}</span>` : ""}
				${session.createdAt ? `<span style="color:var(--text-muted);font-size:0.72rem;">${formatDate(session.createdAt)}</span>` : ""}
			</div>
		</div>

		<div id="message-thread">
			${
				toolOnlyCount > 0
					? `<div class="filter-toolbar">
				<button class="filter-btn" id="filter-toggle" onclick="toggleToolOnly(this)">
					<i data-lucide="filter" style="width:12px;height:12px;"></i>
					<span id="filter-label">Hide tool-only</span>
				</button>
				<span>${toolOnlyCount} tool-only message${toolOnlyCount !== 1 ? "s" : ""}</span>
			</div>`
					: ""
			}
			<div id="messages" style="display:flex;flex-direction:column;gap:0.6rem;">
			${msgsHtml}
			${truncated ? `<div style="text-align:center;color:var(--text-muted);font-size:0.8rem;padding:1rem;font-style:italic;">Showing first 100 messages of ${messages.length}</div>` : ""}
			</div>
		</div>
	</div>

	<div class="doc-toc">
		<div class="toc-title">Session Info</div>
		<div style="display:flex;flex-direction:column;gap:0.5rem;margin-top:0.5rem;">
			<div style="font-size:0.75rem;">
				<div style="color:var(--text-muted);font-size:0.68rem;margin-bottom:0.1rem;">Project</div>
				<div><span class="tag">${escHtml(session.project)}</span></div>
			</div>
			<div style="font-size:0.75rem;">
				<div style="color:var(--text-muted);font-size:0.68rem;margin-bottom:0.1rem;">Session ID</div>
				<div style="font-family:var(--font-mono);font-size:0.68rem;word-break:break-all;">${escHtml(sessionId)}</div>
			</div>
			<div style="font-size:0.75rem;">
				<div style="color:var(--text-muted);font-size:0.68rem;margin-bottom:0.1rem;">Slug</div>
				<div>${escHtml(session.slug ?? "—")}</div>
			</div>
			<div style="font-size:0.75rem;">
				<div style="color:var(--text-muted);font-size:0.68rem;margin-bottom:0.1rem;">Branch</div>
				<div>${escHtml(session.gitBranch ?? "—")}</div>
			</div>
			<div style="font-size:0.75rem;">
				<div style="color:var(--text-muted);font-size:0.68rem;margin-bottom:0.1rem;">Messages</div>
				<div>${session.messageCount}</div>
			</div>
			<div style="font-size:0.75rem;">
				<div style="color:var(--text-muted);font-size:0.68rem;margin-bottom:0.1rem;">Tool Calls</div>
				<div>${session.toolCallCount}</div>
			</div>
		</div>
	</div>
</div>

<script>
function toggleToolOnly(btn) {
	const msgs = document.getElementById('messages');
	const isHiding = msgs.classList.toggle('hide-tool-only');
	btn.classList.toggle('active', isHiding);
	document.getElementById('filter-label').textContent = isHiding ? 'Show tool-only' : 'Hide tool-only';
}
</script>
`;
}
