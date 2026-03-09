import { join } from "path";
import type { CairnIndex } from "../index.ts";
import { renderMarkdown } from "../render.ts";
import { escHtml, formatDate, biomeBadge, tagBadge } from "./layout.ts";

const PROJECT_ROOT = join(import.meta.dir, "..", "..", "..");

export function documentPage(idx: CairnIndex, slug: string): string | null {
	const doc = idx.documents.get(slug);
	if (!doc) return null;

	const html = renderMarkdown(doc.content);
	const parts = doc.path.split("/");

	// Breadcrumb
	const crumbs: { label: string; href?: string }[] = [{ label: "Cairn", href: "/" }];
	if (doc.biome !== "root") {
		crumbs.push({ label: doc.biome, href: `/browse/${doc.biome}` });
	}
	crumbs.push({ label: doc.title ?? parts[parts.length - 1] });

	const breadcrumbHtml = crumbs
		.map((c, i) =>
			i < crumbs.length - 1
				? `<a href="${c.href}">${escHtml(c.label)}</a><span class="sep">/</span>`
				: `<span>${escHtml(c.label)}</span>`,
		)
		.join("");

	// Tags
	const tagsHtml = (doc.tags ?? [])
		.slice(0, 6)
		.map((t, i) => tagBadge(t, i))
		.join(" ");

	// ToC
	const tocHtml =
		doc.headings.length > 2
			? `<div class="doc-toc">
			<div class="toc-title">Contents</div>
			${doc.headings
				.map(
					(h) => `<a class="toc-link h${h.level}" href="#${escHtml(h.id)}">${escHtml(h.text)}</a>`,
				)
				.join("")}
		</div>`
			: "";

	// Edit link (VSCode)
	const absPath = join(PROJECT_ROOT, doc.path);
	const editLink = `<a href="vscode://file/${absPath}" class="edit-link" title="Open in VSCode">✏️ edit</a>`;

	// Status badge for plans
	const statusBadge = doc.status
		? `<span class="kanban-col-title status-${doc.status}">${doc.status}</span>`
		: "";

	return `
<div class="breadcrumb">${breadcrumbHtml}</div>

<div class="doc-viewer">
	<div class="doc-content">
		<!-- Frontmatter header -->
		<div class="doc-frontmatter">
			<div class="doc-frontmatter-title">${escHtml(doc.icon ? doc.icon + " " : "")}${escHtml(doc.title ?? doc.path)}</div>
			${doc.description ? `<div class="doc-frontmatter-desc">${escHtml(doc.description)}</div>` : ""}
			<div class="doc-frontmatter-meta">
				${biomeBadge(doc.biome)}
				${statusBadge}
				${tagsHtml}
				${doc.lastUpdated ? `<span style="color:var(--text-muted);font-size:0.72rem;">Updated ${escHtml(doc.lastUpdated)}</span>` : ""}
				${doc.wordCount > 0 ? `<span style="color:var(--text-muted);font-size:0.72rem;">${doc.wordCount} words</span>` : ""}
				<span style="color:var(--text-muted);font-size:0.72rem;font-family:var(--font-mono);">${escHtml(doc.path)}</span>
				${editLink}
			</div>
		</div>

		<!-- Markdown body -->
		<div class="markdown-body">
			${html}
		</div>
	</div>

	${tocHtml}
</div>
`;
}
