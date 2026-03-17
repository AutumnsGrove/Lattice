<script lang="ts">
	import { onMount } from "svelte";
	import Button from "@autumnsgrove/lattice/ui/components/ui/Button.svelte";
	import Spinner from "@autumnsgrove/lattice/ui/components/ui/Spinner.svelte";
	import GlassCard from "@autumnsgrove/lattice/ui/components/ui/GlassCard.svelte";
	import Skeleton from "@autumnsgrove/lattice/ui/components/ui/Skeleton.svelte";
	import Waystone from "@autumnsgrove/lattice/ui/components/ui/waystone/Waystone.svelte";
	import { ArborSection } from "@autumnsgrove/lattice/ui/arbor";
	import { featureIcons } from "@autumnsgrove/prism/icons";
	import { toast } from "@autumnsgrove/lattice/ui/components/ui/toast";
	import { api } from "@autumnsgrove/lattice/utils";
	import {
		COLOR_PRESETS,
		FONT_PRESETS,
		getFontFamily,
		DEFAULT_ACCENT_COLOR,
		DEFAULT_FONT,
	} from "@autumnsgrove/lattice/config/presets";
	import { ALL_SEASONS, SEASON_LABELS } from "@autumnsgrove/lattice/ui/types/season";
	import { SEASON_THEME_COLORS, getSeasonFavicons } from "@autumnsgrove/lattice/ui/season-meta";
	import "@autumnsgrove/lattice/styles/fonts-optional.css";

	// ── Typography state ────────────────────────────────────────────────────────
	let currentFont = $state(DEFAULT_FONT);
	let savingFont = $state(false);
	let loadingFont = $state(true);

	// ── Accent color state ──────────────────────────────────────────────────────
	let currentAccentColor = $state(DEFAULT_ACCENT_COLOR);
	let savingColor = $state(false);

	// ── Preferred season state ──────────────────────────────────────────────────
	let preferredSeason = $state("");
	let savingSeason = $state(false);

	// ── Data fetching ───────────────────────────────────────────────────────────
	async function fetchCurrentSettings() {
		try {
			const result = await api.get("/api/settings");
			if (result.font_family) currentFont = result.font_family;
			if (result.accent_color) currentAccentColor = result.accent_color;
			if (result.preferred_season) preferredSeason = result.preferred_season;
		} catch (error) {
			console.error("Failed to fetch settings:", error);
		}
		loadingFont = false;
	}

	// ── Save handlers ───────────────────────────────────────────────────────────
	async function saveFont() {
		savingFont = true;
		try {
			await api.put("/api/admin/settings", {
				setting_key: "font_family",
				setting_value: currentFont,
			});
			// Apply immediately so the user sees the change before reloading
			document.documentElement.style.setProperty(
				"--font-family-main",
				getFontFamily(currentFont as Parameters<typeof getFontFamily>[0]),
			);
			toast.success("Font saved. Refresh to see it across your grove.");
		} catch (error) {
			console.error("Failed to save font:", error);
			toast.error("Couldn't save font. Please try again.");
		}
		savingFont = false;
	}

	async function saveAccentColor() {
		savingColor = true;
		try {
			await api.put("/api/admin/settings", {
				setting_key: "accent_color",
				setting_value: currentAccentColor,
			});
			toast.success("Accent color saved.");
		} catch (error) {
			console.error("Failed to save accent color:", error);
			toast.error("Couldn't save accent color. Please try again.");
		}
		savingColor = false;
	}

	async function saveSeason() {
		savingSeason = true;
		const valueToSave = preferredSeason || "summer";
		try {
			await api.put("/api/admin/settings", {
				setting_key: "preferred_season",
				setting_value: valueToSave,
			});
			toast.success("Preferred season saved.");
		} catch (error) {
			console.error("Failed to save preferred season:", error);
			toast.error("Couldn't save preferred season. Please try again.");
		}
		savingSeason = false;
	}

	onMount(() => {
		fetchCurrentSettings();
	});
</script>

<ArborSection
	title="Appearance"
	icon={featureIcons.palette}
	description="Customize how your grove looks and feels."
	backHref="/arbor/settings"
	backLabel="Settings"
>
	<!-- ── Typography ─────────────────────────────────────────────────────────── -->
	<GlassCard variant="frosted" class="mb-6">
		<div class="section-header">
			<h2>Typography</h2>
			<Waystone slug="custom-fonts" label="Learn about fonts" inline />
		</div>
		<p class="section-description">
			Every grove has its own voice. Pick the typeface that speaks yours.
		</p>

		{#if loadingFont}
			<div class="space-y-3">
				<Skeleton class="h-16 w-full rounded-lg" />
				<Skeleton class="h-16 w-full rounded-lg" />
				<Skeleton class="h-16 w-full rounded-lg" />
			</div>
		{:else}
			<div class="font-selector" role="radiogroup" aria-label="Font family">
				{#each FONT_PRESETS as font (font.id)}
					<label class="font-option" class:selected={currentFont === font.id}>
						<input type="radio" name="font" value={font.id} bind:group={currentFont} />
						<div class="font-info">
							<span class="font-name" style="font-family: {font.family};">{font.name}</span>
							<span class="font-description">{font.description}</span>
						</div>
					</label>
				{/each}
			</div>
		{/if}

		<div class="button-row">
			<Button onclick={saveFont} variant="primary" disabled={savingFont}>
				{#if savingFont}
					<Spinner size="sm" />
					Saving...
				{:else}
					Save Font
				{/if}
			</Button>
		</div>
		<p class="note">
			See <a href="https://grove.place/credits">font credits and licenses</a>.
		</p>
	</GlassCard>

	<!-- ── Accent Color ───────────────────────────────────────────────────────── -->
	<GlassCard variant="frosted" class="mb-6">
		<div class="section-header">
			<h2>Accent Color</h2>
			<Waystone slug="choosing-a-theme" label="Learn about themes" inline />
		</div>
		<p class="section-description">
			The color that ties your grove together. Tags, links, and interactive moments all follow this.
		</p>

		<div class="color-picker-section">
			<div class="color-preview-wrapper">
				<input
					type="color"
					class="color-input"
					bind:value={currentAccentColor}
					aria-label="Choose accent color"
				/>
				<div class="color-preview" style="background: {currentAccentColor};">
					<span class="color-hex">{currentAccentColor}</span>
				</div>
			</div>

			<div class="color-presets" role="radiogroup" aria-label="Color presets">
				<span class="presets-label">Presets</span>
				<div class="preset-swatches">
					{#each COLOR_PRESETS as color (color.hex)}
						<button
							type="button"
							class="preset-btn"
							class:active={currentAccentColor === color.hex}
							style="background: {color.hex};"
							title={color.name}
							aria-label={color.name}
							role="radio"
							aria-checked={currentAccentColor === color.hex}
							onclick={() => (currentAccentColor = color.hex)}
						></button>
					{/each}
				</div>
			</div>
		</div>

		<div class="button-row">
			<Button onclick={saveAccentColor} variant="primary" disabled={savingColor}>
				{#if savingColor}
					<Spinner size="sm" />
					Saving...
				{:else}
					Save Color
				{/if}
			</Button>
		</div>
	</GlassCard>

	<!-- ── Preferred Season ───────────────────────────────────────────────────── -->
	<GlassCard variant="frosted" class="mb-6">
		<div class="section-header">
			<h2>Preferred Season</h2>
		</div>
		<p class="section-description">
			Pin your grove to a season. Your home screen icon and browser chrome will follow.
		</p>

		<div class="season-picker" role="radiogroup" aria-label="Preferred season">
			{#each ALL_SEASONS as season (season)}
				{@const favicons = getSeasonFavicons(season)}
				<button
					type="button"
					class="season-option"
					class:selected={preferredSeason === season}
					style="--season-color: {SEASON_THEME_COLORS[season]};"
					onclick={() => (preferredSeason = season)}
					role="radio"
					aria-checked={preferredSeason === season}
					aria-label={SEASON_LABELS[season]}
				>
					<img
						src={favicons.png32}
						alt=""
						aria-hidden="true"
						class="season-icon"
						width="32"
						height="32"
					/>
					<span class="season-label">{SEASON_LABELS[season]}</span>
				</button>
			{/each}
		</div>

		<p class="section-hint">
			iOS caches home screen icons at pin time — re-add after changing to see the new icon.
		</p>

		<div class="button-row">
			<Button onclick={saveSeason} variant="primary" disabled={savingSeason}>
				{#if savingSeason}
					<Spinner size="sm" />
					Saving...
				{:else}
					Save Season
				{/if}
			</Button>
		</div>
	</GlassCard>
</ArborSection>

<style>
	/* ── Section structure ────────────────────────────────────────────────────── */
	.section-hint {
		margin: 0.75rem 0 1.25rem 0;
		font-size: 0.8rem;
		color: var(--color-text-subtle);
		font-style: italic;
	}
	.note {
		margin: 0.75rem 0 0 0;
		font-size: 0.8rem;
		color: var(--color-text-subtle);
	}
	.note a {
		color: var(--color-primary);
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.note a:hover {
		opacity: 0.8;
	}
	.button-row {
		margin-top: 1.25rem;
	}
	.space-y-3 {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	/* ── Font selector ────────────────────────────────────────────────────────── */
	.font-selector {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.font-option {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.875rem 1rem;
		border: 2px solid var(--color-border);
		border-radius: var(--border-radius-standard, 0.5rem);
		cursor: pointer;
		transition:
			border-color 0.15s ease,
			background 0.15s ease;
		background: transparent;
	}
	.font-option:hover {
		border-color: var(--color-primary);
		background: hsl(var(--primary-color) / 0.05);
	}
	.font-option.selected {
		border-color: var(--color-primary);
		background: hsl(var(--primary-color) / 0.08);
	}
	.font-option input[type="radio"] {
		accent-color: var(--color-primary);
		flex-shrink: 0;
		width: 1rem;
		height: 1rem;
		cursor: pointer;
	}
	.font-info {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
	}
	.font-name {
		font-size: 1.05rem;
		color: var(--color-text);
		line-height: 1.3;
	}
	.font-description {
		font-size: 0.78rem;
		color: var(--color-text-muted);
		line-height: 1.4;
	}

	/* ── Color picker ─────────────────────────────────────────────────────────── */
	.color-picker-section {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}
	.color-preview-wrapper {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	.color-input {
		width: 3rem;
		height: 3rem;
		border: 2px solid var(--color-border);
		border-radius: var(--border-radius-button, 0.375rem);
		padding: 0.125rem;
		background: var(--color-surface);
		cursor: pointer;
		flex-shrink: 0;
	}
	.color-input:hover {
		border-color: var(--color-primary);
	}
	.color-preview {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem 1rem;
		border-radius: var(--border-radius-button, 0.375rem);
		min-width: 7rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	}
	.color-hex {
		font-family: monospace;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text-inverse, white);
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
		letter-spacing: 0.04em;
	}
	.color-presets {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.presets-label {
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--color-text-subtle);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}
	.preset-swatches {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.preset-btn {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		border: 2px solid transparent;
		cursor: pointer;
		padding: 0;
		transition:
			transform 0.15s ease,
			border-color 0.15s ease,
			box-shadow 0.15s ease;
		flex-shrink: 0;
	}
	.preset-btn:hover {
		transform: scale(1.15);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
	}
	.preset-btn.active {
		border-color: var(--color-text);
		box-shadow:
			0 0 0 2px var(--color-surface),
			0 0 0 4px var(--color-text);
		transform: scale(1.1);
	}

	/* ── Season picker ────────────────────────────────────────────────────────── */
	.season-picker {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}
	.season-option {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 0.875rem 1.25rem;
		border: 2px solid var(--color-border);
		border-radius: var(--border-radius-standard, 0.5rem);
		background: transparent;
		cursor: pointer;
		transition:
			border-color 0.15s ease,
			background 0.15s ease,
			transform 0.15s ease;
		min-width: 5rem;
	}
	.season-option:hover {
		border-color: var(--season-color);
		background: color-mix(in srgb, var(--season-color) 8%, transparent);
		transform: translateY(-1px);
	}
	.season-option.selected {
		border-color: var(--season-color);
		background: color-mix(in srgb, var(--season-color) 12%, transparent);
		box-shadow: 0 0 0 1px color-mix(in srgb, var(--season-color) 30%, transparent);
	}
	.season-icon {
		width: 32px;
		height: 32px;
		image-rendering: pixelated;
	}
	.season-label {
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--color-text);
	}
	.season-option.selected .season-label {
		color: var(--season-color);
	}

	/* ── Reduced motion ───────────────────────────────────────────────────────── */
	@media (prefers-reduced-motion: reduce) {
		.font-option,
		.preset-btn,
		.season-option {
			transition: none;
		}
		.season-option:hover {
			transform: none;
		}
	}
</style>
