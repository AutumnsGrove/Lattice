<script lang="ts">
	// CommunityThemeBrowser.svelte
	// Component for browsing and discovering community-shared themes

	import type { CommunityTheme, UserTier } from "../types.js";
	import ThemeRating from "./ThemeRating.svelte";

	interface Props {
		themes: CommunityTheme[];
		selectedThemeId?: string | null;
		userTier: UserTier;
		onSelect?: (theme: CommunityTheme) => void;
		onPreview?: (theme: CommunityTheme) => void;
	}

	let { themes, selectedThemeId = null, userTier, onSelect, onPreview }: Props = $props();

	// Local state
	let searchQuery = $state("");
	let selectedBaseTheme = $state<string | null>(null);
	let selectedTag = $state<string | null>(null);
	let sortBy = $state<"popular" | "rating" | "newest">("popular");

	// Tier hierarchy for access control
	const tierLevels: Record<UserTier, number> = {
		free: 0,
		seedling: 1,
		sapling: 2,
		oak: 3,
		evergreen: 4,
	};

	// Check if user can access community themes (Oak+ tier)
	const canAccessCommunityThemes = $derived(tierLevels[userTier] >= 3);

	// Get unique base themes for filter
	const baseThemes = $derived(Array.from(new Set(themes.map((t) => t.baseTheme))).sort());

	// Get unique tags for filter
	const allTags = $derived(Array.from(new Set(themes.flatMap((t) => t.tags || []))).sort());

	// Filter and sort themes
	const filteredThemes = $derived(() => {
		let result = themes.filter(
			(theme) => theme.status === "approved" || theme.status === "featured",
		);

		// Text search
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			result = result.filter(
				(theme) =>
					theme.name.toLowerCase().includes(query) ||
					theme.description?.toLowerCase().includes(query) ||
					theme.tags?.some((tag) => tag.toLowerCase().includes(query)),
			);
		}

		// Base theme filter
		if (selectedBaseTheme) {
			result = result.filter((theme) => theme.baseTheme === selectedBaseTheme);
		}

		// Tag filter
		if (selectedTag) {
			result = result.filter((theme) => theme.tags?.includes(selectedTag));
		}

		// Sort
		result.sort((a, b) => {
			switch (sortBy) {
				case "popular":
					return b.downloads - a.downloads;
				case "rating": {
					const aRating = a.ratingCount > 0 ? a.ratingSum / a.ratingCount : 0;
					const bRating = b.ratingCount > 0 ? b.ratingSum / b.ratingCount : 0;
					return bRating - aRating;
				}
				case "newest":
					return b.createdAt - a.createdAt;
				default:
					return 0;
			}
		});

		return result;
	});

	// Featured themes
	const featuredThemes = $derived(
		themes.filter((theme) => theme.status === "featured").slice(0, 4),
	);

	// Calculate average rating
	function getAverageRating(theme: CommunityTheme): number {
		if (theme.ratingCount === 0) return 0;
		return theme.ratingSum / theme.ratingCount;
	}

	// Shorten creator ID for display
	function shortenCreatorId(id: string): string {
		if (id.length <= 12) return id;
		return `${id.slice(0, 6)}...${id.slice(-4)}`;
	}

	// Truncate description
	function truncateDescription(description: string | undefined, maxLength: number = 80): string {
		if (!description) return "";
		if (description.length <= maxLength) return description;
		return description.slice(0, maxLength).trim() + "...";
	}

	// Handle theme selection
	function handleThemeSelect(theme: CommunityTheme) {
		if (!canAccessCommunityThemes) return;
		onSelect?.(theme);
	}

	// Handle theme preview
	function handleThemePreview(theme: CommunityTheme, event: MouseEvent) {
		event.stopPropagation();
		if (!canAccessCommunityThemes) return;
		onPreview?.(theme);
	}

	// Handle keyboard navigation
	function handleKeydown(event: KeyboardEvent, theme: CommunityTheme) {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			handleThemeSelect(theme);
		}
	}

	// Clear all filters
	function clearFilters() {
		searchQuery = "";
		selectedBaseTheme = null;
		selectedTag = null;
	}

	// Get color palette from theme
	function getThemeColors(theme: CommunityTheme): string[] {
		if (theme.customColors) {
			return [
				theme.customColors.accent || "#16a34a",
				theme.customColors.background || "#ffffff",
				theme.customColors.surface || "#f5f5f5",
				theme.customColors.foreground || "#111111",
			];
		}
		// Fallback colors
		return ["#16a34a", "#ffffff", "#f5f5f5", "#111111"];
	}
</script>

{#if !canAccessCommunityThemes}
	<!-- Tier gating message -->
	<div class="tier-gate" role="alert">
		<div class="lock-icon-large">
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				aria-hidden="true"
			>
				<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
				<path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
			</svg>
		</div>
		<h2>Community Themes</h2>
		<p>
			Discover and use themes created by the Grove community. Available for Oak and Evergreen tier
			members.
		</p>
		<div class="tier-requirement">
			<span class="tier-badge-oak">Oak+</span> required
		</div>
	</div>
{:else}
	<div class="community-browser">
		<!-- Search and filters -->
		<div class="controls">
			<div class="search-bar">
				<svg
					class="search-icon"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<circle cx="11" cy="11" r="8"></circle>
					<path d="m21 21-4.35-4.35"></path>
				</svg>
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Search themes..."
					class="search-input"
					aria-label="Search community themes"
				/>
			</div>

			<div class="filters">
				<select
					bind:value={selectedBaseTheme}
					class="filter-select"
					aria-label="Filter by base theme"
				>
					<option value={null}>All Base Themes</option>
					{#each baseThemes as baseTheme}
						<option value={baseTheme}>{baseTheme}</option>
					{/each}
				</select>

				<select bind:value={selectedTag} class="filter-select" aria-label="Filter by tag">
					<option value={null}>All Tags</option>
					{#each allTags as tag}
						<option value={tag}>{tag}</option>
					{/each}
				</select>

				<select bind:value={sortBy} class="filter-select" aria-label="Sort themes">
					<option value="popular">Most Popular</option>
					<option value="rating">Top Rated</option>
					<option value="newest">Newest</option>
				</select>

				{#if searchQuery || selectedBaseTheme || selectedTag}
					<button type="button" class="clear-filters" onclick={clearFilters}>
						Clear Filters
					</button>
				{/if}
			</div>
		</div>

		<!-- Featured themes section -->
		{#if featuredThemes.length > 0 && !searchQuery && !selectedBaseTheme && !selectedTag}
			<section class="featured-section" aria-labelledby="featured-heading">
				<h2 id="featured-heading" class="section-heading">
					<svg
						class="star-icon"
						viewBox="0 0 24 24"
						fill="currentColor"
						stroke="none"
						aria-hidden="true"
					>
						<path
							d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
						></path>
					</svg>
					Featured Themes
				</h2>
				<div class="theme-grid">
					{#each featuredThemes as theme (theme.id)}
						{@const isSelected = theme.id === selectedThemeId}
						{@const colors = getThemeColors(theme)}
						{@const rating = getAverageRating(theme)}

						<div
							class="theme-card featured"
							class:selected={isSelected}
							onclick={() => handleThemeSelect(theme)}
							onkeydown={(e) => handleKeydown(e, theme)}
							role="button"
							aria-label="{theme.name} - {truncateDescription(theme.description)} - Featured theme"
							tabindex={0}
						>
							<!-- Featured badge -->
							<div class="featured-badge">
								<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
									<path
										d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
									></path>
								</svg>
								Featured
							</div>

							<!-- Color palette preview -->
							<div class="theme-thumbnail">
								<div class="color-palette">
									{#each colors.slice(0, 4) as color}
										<div class="palette-item" style="background-color: {color}"></div>
									{/each}
								</div>

								{#if isSelected}
									<div class="selected-indicator">
										<svg
											class="check-icon"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="3"
											aria-hidden="true"
										>
											<polyline points="20 6 9 17 4 12"></polyline>
										</svg>
									</div>
								{/if}
							</div>

							<!-- Theme info -->
							<div class="theme-info">
								<h3 class="theme-name">{theme.name}</h3>
								<p class="theme-description">{truncateDescription(theme.description)}</p>

								<div class="theme-meta">
									<span class="base-theme-badge">{theme.baseTheme}</span>
									<span class="creator-info" title={theme.creatorTenantId}>
										by {shortenCreatorId(theme.creatorTenantId)}
									</span>
								</div>

								<div class="theme-stats">
									<div class="rating">
										<ThemeRating {rating} readonly={true} />
										<span class="rating-count">({theme.ratingCount})</span>
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

								{#if theme.tags && theme.tags.length > 0}
									<div class="tags">
										{#each theme.tags.slice(0, 3) as tag}
											<span class="tag">{tag}</span>
										{/each}
									</div>
								{/if}

								{#if onPreview}
									<button
										type="button"
										class="preview-button"
										onclick={(e) => handleThemePreview(theme, e)}
									>
										Preview
									</button>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<!-- All themes section -->
		<section class="all-themes-section" aria-labelledby="all-themes-heading">
			<h2 id="all-themes-heading" class="section-heading">
				{#if searchQuery || selectedBaseTheme || selectedTag}
					Search Results ({filteredThemes().length})
				{:else}
					All Community Themes
				{/if}
			</h2>

			{#if filteredThemes().length === 0}
				<div class="no-results">
					<p>No themes found matching your filters.</p>
					<button type="button" class="clear-filters" onclick={clearFilters}>
						Clear Filters
					</button>
				</div>
			{:else}
				<div class="theme-grid">
					{#each filteredThemes() as theme (theme.id)}
						{@const isSelected = theme.id === selectedThemeId}
						{@const colors = getThemeColors(theme)}
						{@const rating = getAverageRating(theme)}

						<div
							class="theme-card"
							class:selected={isSelected}
							onclick={() => handleThemeSelect(theme)}
							onkeydown={(e) => handleKeydown(e, theme)}
							role="button"
							aria-label="{theme.name} - {truncateDescription(theme.description)}"
							tabindex={0}
						>
							<!-- Color palette preview -->
							<div class="theme-thumbnail">
								<div class="color-palette">
									{#each colors.slice(0, 4) as color}
										<div class="palette-item" style="background-color: {color}"></div>
									{/each}
								</div>

								{#if isSelected}
									<div class="selected-indicator">
										<svg
											class="check-icon"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="3"
											aria-hidden="true"
										>
											<polyline points="20 6 9 17 4 12"></polyline>
										</svg>
									</div>
								{/if}
							</div>

							<!-- Theme info -->
							<div class="theme-info">
								<h3 class="theme-name">{theme.name}</h3>
								<p class="theme-description">{truncateDescription(theme.description)}</p>

								<div class="theme-meta">
									<span class="base-theme-badge">{theme.baseTheme}</span>
									<span class="creator-info" title={theme.creatorTenantId}>
										by {shortenCreatorId(theme.creatorTenantId)}
									</span>
								</div>

								<div class="theme-stats">
									<div class="rating">
										<ThemeRating {rating} readonly={true} />
										<span class="rating-count">({theme.ratingCount})</span>
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

								{#if theme.tags && theme.tags.length > 0}
									<div class="tags">
										{#each theme.tags.slice(0, 3) as tag}
											<span class="tag">{tag}</span>
										{/each}
									</div>
								{/if}

								{#if onPreview}
									<button
										type="button"
										class="preview-button"
										onclick={(e) => handleThemePreview(theme, e)}
									>
										Preview
									</button>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</section>
	</div>
{/if}

<style>
	/* Tier gate styling */
	.tier-gate {
		text-align: center;
		padding: 3rem 1.5rem;
		background: var(--color-surface, #f9fafb);
		border: 2px solid var(--color-border, #e5e5e5);
		border-radius: 1rem;
		max-width: 500px;
		margin: 2rem auto;
	}

	.lock-icon-large {
		width: 4rem;
		height: 4rem;
		margin: 0 auto 1.5rem;
		color: var(--color-foreground-muted, #666);
	}

	.tier-gate h2 {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-foreground, #111);
		margin: 0 0 0.75rem 0;
	}

	.tier-gate p {
		font-size: 1rem;
		color: var(--color-foreground-muted, #666);
		line-height: 1.6;
		margin: 0 0 1.5rem 0;
	}

	.tier-requirement {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: var(--color-foreground-muted, #666);
	}

	.tier-badge-oak {
		padding: 0.25rem 0.75rem;
		border-radius: 0.375rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		background: #f59e0b;
		color: #fff;
		font-size: 0.75rem;
	}

	/* Browser layout */
	.community-browser {
		font-family: var(--font-body, system-ui, sans-serif);
	}

	/* Controls */
	.controls {
		margin-bottom: 2rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.search-bar {
		position: relative;
		max-width: 100%;
	}

	.search-icon {
		position: absolute;
		left: 1rem;
		top: 50%;
		transform: translateY(-50%);
		width: 1.25rem;
		height: 1.25rem;
		color: var(--color-foreground-muted, #666);
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		padding: 0.75rem 1rem 0.75rem 3rem;
		border: 2px solid var(--color-border, #e5e5e5);
		border-radius: 0.5rem;
		font-size: 1rem;
		font-family: inherit;
		background: var(--color-surface, #fff);
		color: var(--color-foreground, #111);
		transition: border-color 0.2s ease;
	}

	.search-input:focus {
		outline: none;
		border-color: var(--color-accent, #16a34a);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent, #16a34a) 20%, transparent);
	}

	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		align-items: center;
	}

	.filter-select {
		padding: 0.5rem 0.75rem;
		border: 2px solid var(--color-border, #e5e5e5);
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-family: inherit;
		background: var(--color-surface, #fff);
		color: var(--color-foreground, #111);
		cursor: pointer;
		transition: border-color 0.2s ease;
		min-width: 150px;
	}

	.filter-select:focus {
		outline: none;
		border-color: var(--color-accent, #16a34a);
	}

	.clear-filters {
		padding: 0.5rem 1rem;
		background: transparent;
		border: 2px solid var(--color-border, #e5e5e5);
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-foreground, #111);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.clear-filters:hover {
		background: var(--color-surface, #f5f5f5);
		border-color: var(--color-foreground-muted, #999);
	}

	/* Sections */
	.featured-section,
	.all-themes-section {
		margin-bottom: 3rem;
	}

	.section-heading {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-foreground, #111);
		margin: 0 0 1.5rem 0;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.star-icon {
		width: 1.5rem;
		height: 1.5rem;
		color: #f59e0b;
	}

	/* Grid layout */
	.theme-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1rem;
	}

	@media (min-width: 640px) {
		.theme-grid {
			grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
			gap: 1.25rem;
		}
	}

	@media (min-width: 1024px) {
		.theme-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	@media (min-width: 1280px) {
		.theme-grid {
			grid-template-columns: repeat(4, 1fr);
		}
	}

	/* Theme cards */
	.theme-card {
		display: flex;
		flex-direction: column;
		background: var(--color-surface, #fff);
		border: 2px solid var(--color-border, #e5e5e5);
		border-radius: 0.75rem;
		overflow: hidden;
		cursor: pointer;
		transition: all 0.2s ease;
		padding: 0;
		text-align: left;
		width: 100%;
		position: relative;
	}

	.theme-card:hover {
		border-color: var(--color-accent, #16a34a);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.theme-card:focus {
		outline: none;
		border-color: var(--color-accent, #16a34a);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent, #16a34a) 20%, transparent);
	}

	.theme-card.selected {
		border-color: var(--color-accent, #16a34a);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent, #16a34a) 30%, transparent);
	}

	.theme-card.featured {
		border-color: #f59e0b;
	}

	.theme-card.featured:hover,
	.theme-card.featured:focus {
		border-color: #f59e0b;
		box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);
	}

	.featured-badge {
		position: absolute;
		top: 0.75rem;
		left: 0.75rem;
		background: #f59e0b;
		color: #fff;
		padding: 0.25rem 0.75rem;
		border-radius: 0.375rem;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		display: flex;
		align-items: center;
		gap: 0.25rem;
		z-index: 10;
	}

	.featured-badge svg {
		width: 0.875rem;
		height: 0.875rem;
	}

	.theme-thumbnail {
		position: relative;
		height: 120px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-surface, #f5f5f5);
	}

	.color-palette {
		display: flex;
		gap: 0.375rem;
		padding: 1rem;
	}

	.palette-item {
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 0.375rem;
		border: 2px solid rgba(255, 255, 255, 0.5);
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
	}

	.selected-indicator {
		position: absolute;
		top: 0.75rem;
		right: 0.75rem;
		width: 2rem;
		height: 2rem;
		background: var(--color-accent, #16a34a);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		z-index: 10;
	}

	.check-icon {
		width: 1.25rem;
		height: 1.25rem;
		color: #fff;
	}

	.theme-info {
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.theme-name {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-foreground, #111);
		margin: 0;
		line-height: 1.4;
	}

	.theme-description {
		font-size: 0.875rem;
		color: var(--color-foreground-muted, #666);
		line-height: 1.5;
		margin: 0;
		min-height: 2.625rem;
	}

	.theme-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		font-size: 0.75rem;
	}

	.base-theme-badge {
		padding: 0.125rem 0.5rem;
		background: var(--color-surface, #f5f5f5);
		border: 1px solid var(--color-border, #e5e5e5);
		border-radius: 0.25rem;
		font-weight: 600;
		color: var(--color-foreground, #111);
	}

	.creator-info {
		color: var(--color-foreground-muted, #666);
		font-style: italic;
	}

	.theme-stats {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		font-size: 0.75rem;
	}

	.rating {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.rating-count {
		margin-left: 0.25rem;
		color: var(--color-foreground-muted, #666);
		font-weight: 500;
		font-size: 0.75rem;
	}

	.downloads {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		color: var(--color-foreground-muted, #666);
	}

	.downloads svg {
		width: 1rem;
		height: 1rem;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}

	.tag {
		padding: 0.125rem 0.5rem;
		background: var(--color-surface, #f5f5f5);
		border: 1px solid var(--color-border, #e5e5e5);
		border-radius: 0.25rem;
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--color-foreground, #111);
	}

	.preview-button {
		margin-top: 0.25rem;
		padding: 0.5rem 1rem;
		background: var(--color-accent, #16a34a);
		border: none;
		border-radius: 0.375rem;
		color: #fff;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		width: 100%;
	}

	.preview-button:hover {
		background: color-mix(in srgb, var(--color-accent, #16a34a) 85%, black);
	}

	.preview-button:focus {
		outline: none;
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent, #16a34a) 30%, transparent);
	}

	/* No results */
	.no-results {
		text-align: center;
		padding: 3rem 1.5rem;
		color: var(--color-foreground-muted, #666);
	}

	.no-results p {
		font-size: 1rem;
		margin: 0 0 1rem 0;
	}

	/* High contrast mode support */
	@media (prefers-contrast: high) {
		.theme-card {
			border-width: 3px;
		}

		.theme-card:focus {
			outline: 3px solid;
			outline-offset: 2px;
		}
	}

	/* Reduced motion support */
	@media (prefers-reduced-motion: reduce) {
		.theme-card,
		.search-input,
		.filter-select,
		.preview-button {
			transition: none;
		}

		.theme-card:hover {
			transform: none;
		}
	}

	/* Mobile responsive */
	@media (max-width: 640px) {
		.controls {
			gap: 0.75rem;
		}

		.filters {
			flex-direction: column;
			width: 100%;
		}

		.filter-select,
		.clear-filters {
			width: 100%;
		}

		.section-heading {
			font-size: 1.25rem;
		}

		.theme-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
