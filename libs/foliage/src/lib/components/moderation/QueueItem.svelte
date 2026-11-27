<script lang="ts">
	// QueueItem.svelte // accent-ok — theme moderation component uses color palette definitions
	// Individual theme item rendering with status badges, customizations, and WCAG results

	import type { CommunityTheme, CommunityThemeStatus } from "../../types.js";
	import { validateThemeContrast } from "../../utils/contrast.js";
	import ThemeRating from "../ThemeRating.svelte";

	interface Props {
		theme: CommunityTheme;
		index: number;
		isCurrent: boolean;
		isSelected: boolean;
		showCustomizations: boolean;
		wcagResult: ReturnType<typeof validateThemeContrast> | undefined;
		onToggleSelection: (themeId: string) => void;
		onPreview: (theme: CommunityTheme) => void;
		onToggleCustomizations: (themeId: string) => void;
		onRunWCAG: (theme: CommunityTheme) => void;
		onCloseWCAG: (themeId: string) => void;
		onStatusAction: (theme: CommunityTheme, status: CommunityThemeStatus) => void;
	}

	let {
		theme,
		index,
		isCurrent,
		isSelected,
		showCustomizations,
		wcagResult,
		onToggleSelection,
		onPreview,
		onToggleCustomizations,
		onRunWCAG,
		onCloseWCAG,
		onStatusAction,
	}: Props = $props();

	// Status badge colors
	function getStatusColor(status: CommunityThemeStatus): string {
		switch (status) {
			case "pending":
				return "#f59e0b";
			case "in_review":
				return "#3b82f6";
			case "approved":
				return "#16a34a"; /* accent-ok */
			case "featured":
				return "#9333ea";
			case "changes_requested":
				return "#ea580c";
			case "rejected":
				return "#dc2626";
			case "removed":
				return "#6b7280";
			case "draft":
				return "#9ca3af";
			default:
				return "#6b7280";
		}
	}

	function getAverageRating(theme: CommunityTheme): number {
		if (theme.ratingCount === 0) return 0;
		return theme.ratingSum / theme.ratingCount;
	}

	function formatDate(timestamp: number): string {
		return new Date(timestamp).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	}

	function shortenCreatorId(id: string): string {
		if (id.length <= 12) return id;
		return `${id.slice(0, 8)}...${id.slice(-4)}`;
	}

	const rating = $derived(getAverageRating(theme));
</script>

<!-- Desktop table row -->
<tr class="theme-row desktop-row" class:current={isCurrent} data-theme-index={index}>
	<td class="checkbox-col">
		<input
			type="checkbox"
			checked={isSelected}
			onchange={() => onToggleSelection(theme.id)}
			aria-label="Select {theme.name}"
		/>
	</td>
	<td class="theme-info-col">
		<div class="theme-name">{theme.name}</div>
		{#if theme.description}
			<div class="theme-description">{theme.description}</div>
		{/if}
		{#if theme.tags && theme.tags.length > 0}
			<div class="tags">
				{#each theme.tags.slice(0, 3) as tag}
					<span class="tag">{tag}</span>
				{/each}
			</div>
		{/if}
	</td>
	<td>
		<span class="creator-id" title={theme.creatorTenantId}>
			{shortenCreatorId(theme.creatorTenantId)}
		</span>
	</td>
	<td>
		<span class="base-theme-badge">{theme.baseTheme}</span>
	</td>
	<td>
		{formatDate(theme.createdAt)}
	</td>
	<td>
		<span class="status-badge" style="background-color: {getStatusColor(theme.status)}">
			{theme.status.replace("_", " ")}
		</span>
	</td>
	<td class="stats-col">
		<div class="stats">
			<div class="rating-display">
				<ThemeRating {rating} readonly />
				<span class="rating-text">({theme.ratingCount})</span>
			</div>
			<div class="downloads">
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
					<polyline points="7 10 12 15 17 10"></polyline>
					<line x1="12" y1="15" x2="12" y2="3"></line>
				</svg>
				{theme.downloads.toLocaleString()}
			</div>
		</div>
	</td>
	<td class="actions-col">
		<div class="action-buttons">
			<button
				type="button"
				class="action-btn preview"
				onclick={() => onPreview(theme)}
				aria-label="Preview {theme.name}"
			>
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
					<circle cx="12" cy="12" r="3"></circle>
				</svg>
			</button>
			<button
				type="button"
				class="action-btn customizations"
				onclick={() => onToggleCustomizations(theme.id)}
				aria-label="View customizations"
			>
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<path d="M12 20h9"></path>
					<path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
				</svg>
			</button>
			<button
				type="button"
				class="action-btn wcag"
				onclick={() => onRunWCAG(theme)}
				aria-label="Run WCAG validation"
			>
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
					<polyline points="22 4 12 14.01 9 11.01"></polyline>
				</svg>
			</button>

			<!-- Status change dropdown -->
			<div class="status-actions">
				<button type="button" class="action-btn status" aria-label="Change status">
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						aria-hidden="true"
					>
						<circle cx="12" cy="12" r="1"></circle>
						<circle cx="12" cy="5" r="1"></circle>
						<circle cx="12" cy="19" r="1"></circle>
					</svg>
				</button>
				<div class="status-dropdown">
					<button
						type="button"
						class="status-option approve"
						onclick={() => onStatusAction(theme, "approved")}
					>
						Approve
					</button>
					<button
						type="button"
						class="status-option feature"
						onclick={() => onStatusAction(theme, "featured")}
					>
						Feature
					</button>
					<button
						type="button"
						class="status-option in-review"
						onclick={() => onStatusAction(theme, "in_review")}
					>
						Move to In Review
					</button>
					<button
						type="button"
						class="status-option changes"
						onclick={() => onStatusAction(theme, "changes_requested")}
					>
						Request Changes
					</button>
					<button
						type="button"
						class="status-option reject"
						onclick={() => onStatusAction(theme, "rejected")}
					>
						Reject
					</button>
				</div>
			</div>
		</div>
	</td>
</tr>

<!-- Customizations row (desktop) -->
{#if showCustomizations}
	<tr class="customizations-row">
		<td colspan="8">
			<div class="customizations-panel">
				<h3>Customizations</h3>

				{#if theme.customColors}
					<div class="customization-section">
						<h4>Colors</h4>
						<div class="color-grid">
							{#each Object.entries(theme.customColors) as [key, value]}
								<div class="color-item">
									<div class="color-swatch" style="background-color: {value}"></div>
									<span class="color-label">{key}</span>
									<span class="color-value">{value}</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				{#if theme.customTypography}
					<div class="customization-section">
						<h4>Typography</h4>
						<div class="typography-grid">
							{#each Object.entries(theme.customTypography) as [key, value]}
								<div class="typography-item">
									<span class="typography-label">{key}:</span>
									<span class="typography-value">{value}</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				{#if theme.customLayout}
					<div class="customization-section">
						<h4>Layout</h4>
						<div class="layout-grid">
							{#each Object.entries(theme.customLayout) as [key, value]}
								<div class="layout-item">
									<span class="layout-label">{key}:</span>
									<span class="layout-value">{value}</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				{#if theme.customCSS}
					<div class="customization-section">
						<h4>Custom CSS</h4>
						<pre class="custom-css">{theme.customCSS}</pre>
					</div>
				{/if}
			</div>
		</td>
	</tr>
{/if}

<!-- WCAG results row (desktop) -->
{#if wcagResult}
	<tr class="wcag-row">
		<td colspan="8">
			<div class="wcag-panel" class:valid={wcagResult.valid} class:invalid={!wcagResult.valid}>
				<h3>WCAG Validation Results</h3>

				{#if wcagResult.valid}
					<div class="wcag-success">
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							aria-hidden="true"
						>
							<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
							<polyline points="22 4 12 14.01 9 11.01"></polyline>
						</svg>
						<span>Passes WCAG AA contrast requirements</span>
					</div>

					{#if wcagResult.warnings && wcagResult.warnings.length > 0}
						<div class="wcag-warnings">
							<h4>Warnings:</h4>
							<ul>
								{#each wcagResult.warnings as warning}
									<li>{warning}</li>
								{/each}
							</ul>
						</div>
					{/if}
				{:else}
					<div class="wcag-error">
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							aria-hidden="true"
						>
							<circle cx="12" cy="12" r="10"></circle>
							<line x1="15" y1="9" x2="9" y2="15"></line>
							<line x1="9" y1="9" x2="15" y2="15"></line>
						</svg>
						<span>{wcagResult.error}</span>
					</div>
				{/if}

				<button type="button" class="close-wcag" onclick={() => onCloseWCAG(theme.id)}>
					Close
				</button>
			</div>
		</td>
	</tr>
{/if}

<style>
	.theme-row:hover {
		background: var(--color-surface, #f9fafb);
	}

	.theme-row.current {
		background: color-mix(in srgb, var(--color-accent, #16a34a) 10%, transparent); /* accent-ok */
	}

	.checkbox-col {
		width: 3rem;
	}

	.theme-info-col {
		min-width: 250px;
	}

	.theme-name {
		font-weight: 600;
		margin-bottom: 0.25rem;
	}

	.theme-description {
		font-size: 0.8125rem;
		color: var(--color-foreground-muted, #666);
		margin-bottom: 0.5rem;
	}

	.creator-id {
		font-family: var(--font-mono, monospace);
		font-size: 0.8125rem;
		color: var(--color-foreground-muted, #666);
	}

	.base-theme-badge {
		padding: 0.125rem 0.5rem;
		background: var(--color-surface, #f5f5f5);
		border: 1px solid var(--color-border, #e5e5e5);
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.status-badge {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		border-radius: 0.375rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: #fff;
		text-transform: capitalize;
	}

	.stats-col {
		min-width: 150px;
	}

	.stats {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.rating-display {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.rating-text {
		font-size: 0.75rem;
		color: var(--color-foreground-muted, #666);
	}

	.downloads {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.75rem;
		color: var(--color-foreground-muted, #666);
	}

	.downloads svg {
		width: 1rem;
		height: 1rem;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		margin-top: 0.5rem;
	}

	.tag {
		padding: 0.125rem 0.5rem;
		background: var(--color-surface, #f5f5f5);
		border: 1px solid var(--color-border, #e5e5e5);
		border-radius: 0.25rem;
		font-size: 0.6875rem;
	}

	/* Actions */
	.actions-col {
		min-width: 180px;
	}

	.action-buttons {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.action-btn {
		padding: 0.5rem;
		background: transparent;
		border: 2px solid var(--color-border, #e5e5e5);
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.action-btn svg {
		width: 1.125rem;
		height: 1.125rem;
		color: var(--color-foreground, #111);
	}

	.action-btn:hover {
		background: var(--color-surface, #f5f5f5);
		border-color: var(--color-foreground-muted, #999);
	}

	.action-btn:focus {
		outline: none;
		border-color: var(--color-accent, #16a34a); /* accent-ok */
	}

	/* Status actions dropdown */
	.status-actions {
		position: relative;
	}

	.status-dropdown {
		display: none;
		position: absolute;
		right: 0;
		top: 100%;
		margin-top: 0.25rem;
		background: var(--color-surface, #fff);
		border: 2px solid var(--color-border, #e5e5e5);
		border-radius: 0.375rem;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		z-index: 10;
		min-width: 180px;
	}

	.status-actions:hover .status-dropdown,
	.status-actions:focus-within .status-dropdown {
		display: block;
	}

	.status-option {
		display: block;
		width: 100%;
		padding: 0.75rem 1rem;
		background: none;
		border: none;
		text-align: left;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.2s ease;
	}

	.status-option:hover {
		background: var(--color-surface, #f5f5f5);
	}

	.status-option.approve {
		color: #16a34a; /* accent-ok */
	}

	.status-option.feature {
		color: #9333ea;
	}

	.status-option.in-review {
		color: #3b82f6;
	}

	.status-option.changes {
		color: #ea580c;
	}

	.status-option.reject {
		color: #dc2626;
	}

	/* Customizations panel */
	.customizations-row,
	.wcag-row {
		background: var(--color-surface, #f9fafb);
	}

	.customizations-panel,
	.wcag-panel {
		padding: 1.5rem;
	}

	.customizations-panel h3,
	.wcag-panel h3 {
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0 0 1rem 0;
	}

	.customization-section {
		margin-bottom: 1.5rem;
	}

	.customization-section h4 {
		font-size: 0.875rem;
		font-weight: 600;
		margin: 0 0 0.75rem 0;
		color: var(--color-foreground-muted, #666);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.color-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 0.75rem;
	}

	.color-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.color-swatch {
		width: 2rem;
		height: 2rem;
		border-radius: 0.25rem;
		border: 2px solid var(--color-border, #e5e5e5);
	}

	.color-label {
		font-size: 0.8125rem;
		font-weight: 500;
	}

	.color-value {
		font-family: var(--font-mono, monospace);
		font-size: 0.75rem;
		color: var(--color-foreground-muted, #666);
	}

	.typography-grid,
	.layout-grid {
		display: grid;
		gap: 0.5rem;
	}

	.typography-item,
	.layout-item {
		font-size: 0.875rem;
	}

	.typography-label,
	.layout-label {
		font-weight: 600;
		margin-right: 0.5rem;
	}

	.typography-value,
	.layout-value {
		font-family: var(--font-mono, monospace);
		color: var(--color-foreground-muted, #666);
	}

	.custom-css {
		padding: 1rem;
		background: var(--color-background, #fff);
		border: 2px solid var(--color-border, #e5e5e5);
		border-radius: 0.375rem;
		font-family: var(--font-mono, monospace);
		font-size: 0.75rem;
		overflow-x: auto;
		max-height: 300px;
		overflow-y: auto;
	}

	/* WCAG panel */
	.wcag-panel.valid {
		border: 2px solid #16a34a; /* accent-ok */
	}

	.wcag-panel.invalid {
		border: 2px solid #dc2626;
	}

	.wcag-success,
	.wcag-error {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		border-radius: 0.375rem;
		margin-bottom: 1rem;
	}

	.wcag-success {
		background: color-mix(in srgb, #16a34a 10%, transparent); /* accent-ok */
		color: #15803d; /* accent-ok */
	}

	.wcag-success svg {
		width: 1.5rem;
		height: 1.5rem;
	}

	.wcag-error {
		background: color-mix(in srgb, #dc2626 10%, transparent);
		color: #b91c1c;
	}

	.wcag-error svg {
		width: 1.5rem;
		height: 1.5rem;
	}

	.wcag-warnings {
		margin-top: 1rem;
	}

	.wcag-warnings h4 {
		font-size: 0.875rem;
		font-weight: 600;
		margin: 0 0 0.5rem 0;
	}

	.wcag-warnings ul {
		margin: 0;
		padding-left: 1.5rem;
		font-size: 0.875rem;
		color: var(--color-foreground-muted, #666);
	}

	.wcag-warnings li {
		margin-bottom: 0.25rem;
	}

	.close-wcag {
		padding: 0.5rem 1rem;
		background: transparent;
		border: 2px solid var(--color-border, #e5e5e5);
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.close-wcag:hover {
		background: var(--color-surface, #f5f5f5);
	}

	@media (prefers-reduced-motion: reduce) {
		* {
			transition: none !important;
		}
	}

	@media (prefers-contrast: high) {
		.theme-row {
			border-width: 3px;
		}
	}
</style>
