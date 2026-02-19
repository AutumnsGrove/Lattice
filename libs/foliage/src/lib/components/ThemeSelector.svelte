<script lang="ts">
	// ThemeSelector.svelte
	// Component for selecting from available themes

	import type { Theme, UserTier } from "../types.js";

	interface Props {
		themes: Theme[];
		selectedThemeId: string;
		userTier: UserTier;
		onSelect?: (themeId: string) => void;
	}

	let { themes, selectedThemeId, userTier, onSelect }: Props = $props();

	// Tier hierarchy for access control
	const tierLevels: Record<UserTier, number> = {
		free: 0,
		seedling: 1,
		sapling: 2,
		oak: 3,
		evergreen: 4,
	};

	const themeTierLevels = {
		seedling: 1,
		sapling: 2,
	};

	// Check if user can access a theme
	function canAccessTheme(theme: Theme): boolean {
		const userLevel = tierLevels[userTier];
		const themeLevel = themeTierLevels[theme.tier];
		return userLevel >= themeLevel;
	}

	// Handle theme selection
	function handleThemeSelect(theme: Theme) {
		if (!canAccessTheme(theme)) {
			return; // Don't allow selection of locked themes
		}
		onSelect?.(theme.id);
	}

	// Handle keyboard navigation
	function handleKeydown(event: KeyboardEvent, theme: Theme) {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			handleThemeSelect(theme);
		}
	}

	// Truncate description to max length
	function truncateDescription(description: string, maxLength: number = 80): string {
		if (description.length <= maxLength) {
			return description;
		}
		return description.slice(0, maxLength).trim() + "...";
	}

	// Get tier display name
	function getTierDisplayName(tier: "seedling" | "sapling"): string {
		return tier.charAt(0).toUpperCase() + tier.slice(1);
	}
</script>

<div class="theme-selector" role="radiogroup" aria-label="Theme selection">
	<div class="theme-grid">
		{#each themes as theme (theme.id)}
			{@const isSelected = theme.id === selectedThemeId}
			{@const isLocked = !canAccessTheme(theme)}
			{@const isAccessible = canAccessTheme(theme)}

			<button
				type="button"
				class="theme-card"
				class:selected={isSelected}
				class:locked={isLocked}
				onclick={() => handleThemeSelect(theme)}
				onkeydown={(e) => handleKeydown(e, theme)}
				disabled={isLocked}
				role="radio"
				aria-checked={isSelected}
				aria-label="{theme.name} - {theme.description} - {getTierDisplayName(
					theme.tier,
				)} tier{isLocked ? ' (locked)' : ''}"
				tabindex={isAccessible ? 0 : -1}
			>
				<!-- Theme thumbnail/color preview -->
				<div class="theme-thumbnail" style="background-color: {theme.colors.background}">
					<div class="color-palette">
						<div class="palette-item" style="background-color: {theme.colors.accent}"></div>
						<div class="palette-item" style="background-color: {theme.colors.surface}"></div>
						<div class="palette-item" style="background-color: {theme.colors.foreground}"></div>
					</div>

					<!-- Lock icon for inaccessible themes -->
					{#if isLocked}
						<div class="lock-overlay">
							<svg
								class="lock-icon"
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
					{/if}

					<!-- Selected indicator -->
					{#if isSelected && !isLocked}
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
					<div class="theme-header">
						<h3 class="theme-name">{theme.name}</h3>
						<span class="tier-badge" data-tier={theme.tier}>
							{getTierDisplayName(theme.tier)}
						</span>
					</div>
					<p class="theme-description">{truncateDescription(theme.description)}</p>
				</div>
			</button>
		{/each}
	</div>
</div>

<style>
	.theme-selector {
		font-family: var(--font-body, system-ui, sans-serif);
	}

	.theme-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1rem;
	}

	/* Responsive grid adjustments */
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
	}

	.theme-card:hover:not(.locked) {
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

	.theme-card.locked {
		cursor: not-allowed;
		opacity: 0.6;
	}

	.theme-card.locked:hover {
		transform: none;
		box-shadow: none;
	}

	.theme-thumbnail {
		position: relative;
		height: 160px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: opacity 0.15s ease;
	}

	.theme-card.locked .theme-thumbnail {
		filter: grayscale(100%);
	}

	.color-palette {
		display: flex;
		gap: 0.5rem;
		padding: 1rem;
	}

	.palette-item {
		width: 3rem;
		height: 3rem;
		border-radius: 0.5rem;
		border: 2px solid rgba(255, 255, 255, 0.3);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.lock-overlay {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		backdrop-filter: blur(2px);
	}

	.lock-icon {
		width: 2.5rem;
		height: 2.5rem;
		color: #fff;
		filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
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
		gap: 0.5rem;
	}

	.theme-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.theme-name {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-foreground, #111);
		margin: 0;
		line-height: 1.4;
		flex: 1;
	}

	.tier-badge {
		padding: 0.125rem 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.025em;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.tier-badge[data-tier="seedling"] {
		background: #dcfce7;
		color: #166534;
	}

	.tier-badge[data-tier="sapling"] {
		background: #dbeafe;
		color: #1e40af;
	}

	.theme-description {
		font-size: 0.875rem;
		color: var(--color-foreground-muted, #666);
		line-height: 1.5;
		margin: 0;
	}

	.theme-card.locked .theme-description {
		opacity: 0.7;
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
		.theme-thumbnail {
			transition: none;
		}

		.theme-card:hover:not(.locked) {
			transform: none;
		}
	}
</style>
