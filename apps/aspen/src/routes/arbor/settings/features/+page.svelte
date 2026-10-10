<script lang="ts">
	import GlassCard from "@autumnsgrove/lattice/ui/components/ui/GlassCard.svelte";
	import Waystone from "@autumnsgrove/lattice/ui/components/ui/Waystone.svelte";
	import GroveTerm from "@autumnsgrove/lattice/components/terminology/GroveTerm.svelte";
	import { ArborSection } from "@autumnsgrove/lattice/ui/arbor";
	import { metricIcons, featureIcons, phaseIcons } from "@autumnsgrove/prism/icons";
	import { onMount } from "svelte";
	import Button from "@autumnsgrove/lattice/ui/components/ui/Button.svelte";
	import { toast } from "@autumnsgrove/lattice/ui/components/ui/toast";
	import { api } from "@autumnsgrove/lattice/utils";
	import {
		CANOPY_CATEGORIES,
		CANOPY_CATEGORY_LABELS,
		CANOPY_SETTING_KEYS,
		parseCanopyCategories,
	} from "@autumnsgrove/lattice/platform/config/canopy-categories";

	let { data } = $props();

	// Canopy (public directory) — opt-in, defaults to off
	let canopyVisible = $state(false);
	let canopyBanner = $state("");
	let canopyCategories = $state<string[]>([]);
	let canopyShowForests = $state(true);
	let savingCanopy = $state(false);

	onMount(async () => {
		try {
			const settings = await api.get("/api/settings");
			canopyVisible = settings[CANOPY_SETTING_KEYS.VISIBLE] === "true";
			canopyBanner = settings[CANOPY_SETTING_KEYS.BANNER] ?? "";
			canopyCategories = parseCanopyCategories(settings[CANOPY_SETTING_KEYS.CATEGORIES]);
			canopyShowForests = settings[CANOPY_SETTING_KEYS.SHOW_FORESTS] !== "false";
		} catch (error) {
			console.error("Failed to fetch settings:", error);
		}
	});

	function toggleCategory(id: string) {
		canopyCategories = canopyCategories.includes(id)
			? canopyCategories.filter((c) => c !== id)
			: [...canopyCategories, id];
	}

	async function saveCanopySettings() {
		savingCanopy = true;
		try {
			const entries: Record<string, string> = {
				[CANOPY_SETTING_KEYS.VISIBLE]: String(canopyVisible),
				[CANOPY_SETTING_KEYS.BANNER]: canopyBanner,
				[CANOPY_SETTING_KEYS.CATEGORIES]: JSON.stringify(canopyCategories),
				[CANOPY_SETTING_KEYS.SHOW_FORESTS]: String(canopyShowForests),
			};
			await Promise.all(
				Object.entries(entries).map(([setting_key, setting_value]) =>
					api.put("/api/admin/settings", { setting_key, setting_value }),
				),
			);
			toast.success("Canopy settings saved");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Couldn't save Canopy settings");
		}
		savingCanopy = false;
	}
</script>

<ArborSection
	title="Features"
	icon={phaseIcons.sparkles}
	description="Tools that bring your grove to life."
	backHref="/arbor/settings"
	backLabel="Settings"
>
	<div class="feature-list">
		<!-- Rings (Analytics) -->
		<a href="/arbor/analytics" class="feature-link">
			<GlassCard variant="frosted" hoverable flush>
				<div class="feature-body">
					<div class="feature-icon">
						<metricIcons.barChart class="icon" />
					</div>
					<div class="feature-content">
						<div class="feature-title">
							<GroveTerm interactive term="rings">Rings</GroveTerm>
							<Waystone slug="what-is-rings" label="Learn about Rings analytics" />
						</div>
						<p class="feature-description">
							Privacy-first analytics showing how <GroveTerm interactive term="wanderer"
								>Wanderers</GroveTerm
							> explore your Grove.
						</p>
					</div>
				</div>
			</GlassCard>
		</a>

		<!-- Reeds (Comments) -->
		<a href="/arbor/reeds" class="feature-link">
			<GlassCard variant="frosted" hoverable flush>
				<div class="feature-body">
					<div class="feature-icon">
						<featureIcons.messageSquare class="icon" />
					</div>
					<div class="feature-content">
						<div class="feature-title">
							<GroveTerm interactive term="reeds">Reeds</GroveTerm>
							<Waystone slug="what-are-reeds" label="Learn about Reeds comments" />
						</div>
						<p class="feature-description">
							Threaded comments that let <GroveTerm interactive term="wanderer"
								>Wanderers</GroveTerm
							> leave thoughts on your <GroveTerm interactive term="bloom">blooms</GroveTerm>.
						</p>
					</div>
				</div>
			</GlassCard>
		</a>

		<!-- Curios -->
		<a href="/arbor/curios" class="feature-link">
			<GlassCard variant="frosted" hoverable flush>
				<div class="feature-body">
					<div class="feature-icon curios">
						<phaseIcons.sparkles class="icon" />
					</div>
					<div class="feature-content">
						<div class="feature-title">
							<GroveTerm interactive term="curios">Curios</GroveTerm>
							<Waystone slug="what-are-curios" label="Learn about Curios" />
						</div>
						<p class="feature-description">
							Guestbooks, counters, polls, shrines, ambient sounds, and more — 19 curios
							that make your site feel alive.
							{#if data.curiosCount > 0}
								<span class="curio-count">{data.curiosCount} active</span>
							{/if}
						</p>
					</div>
				</div>
			</GlassCard>
		</a>

		<!-- Canopy (public directory) -->
		<GlassCard variant="frosted" flush>
			<div class="feature-body">
				<div class="feature-icon">
					<featureIcons.bookUser class="icon" />
				</div>
				<div class="feature-content">
					<div class="feature-title">
						<GroveTerm interactive term="canopy">Canopy</GroveTerm>
						<Waystone slug="what-is-canopy" label="What is Canopy?" />
					</div>
					<p class="feature-description">
						Grove's public directory. Turn this off and your grove leaves right away. You'll appear
						once you've published your first <GroveTerm interactive term="bloom">bloom</GroveTerm>.
					</p>

					<label class="canopy-toggle">
						<input type="checkbox" bind:checked={canopyVisible} />
						<span>{canopyVisible ? "Listed in the Canopy" : "Not listed in the Canopy"}</span>
					</label>

					{#if canopyVisible}
						<div class="canopy-field">
							<label class="canopy-label" for="canopy-banner">Banner tagline</label>
							<input
								id="canopy-banner"
								class="canopy-input"
								type="text"
								maxlength="160"
								placeholder="A short line about your grove…"
								bind:value={canopyBanner}
							/>
							<span class="canopy-count">{canopyBanner.length}/160</span>
						</div>

						<div class="canopy-field">
							<span class="canopy-label">Categories</span>
							<div class="category-grid">
								{#each CANOPY_CATEGORIES as id (id)}
									<label class="category-checkbox">
										<input
											type="checkbox"
											checked={canopyCategories.includes(id)}
											onchange={() => toggleCategory(id)}
										/>
										<span>{CANOPY_CATEGORY_LABELS[id]}</span>
									</label>
								{/each}
							</div>
						</div>

						<label class="canopy-toggle">
							<input type="checkbox" bind:checked={canopyShowForests} />
							<span>Show in themed forest groupings</span>
						</label>
					{/if}

					<div class="canopy-save">
						<Button onclick={saveCanopySettings} disabled={savingCanopy}>
							{savingCanopy ? "Saving…" : "Save Canopy settings"}
						</Button>
					</div>
				</div>
			</div>
		</GlassCard>
	</div>
</ArborSection>

<style>
	.feature-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.feature-link {
		text-decoration: none;
		color: inherit;
		display: block;
	}

	.feature-body {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		padding: 1rem 1.25rem;
	}

	.feature-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: var(--border-radius-button, 0.5rem);
		background: var(--grove-accent-10);
		color: var(--user-accent, var(--color-primary));
		flex-shrink: 0;
	}

	:global(.feature-icon .icon) {
		width: 20px;
		height: 20px;
	}

	.feature-content {
		flex: 1;
		min-width: 0;
	}

	.feature-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 600;
		color: var(--color-text);
		margin-bottom: 0.25rem;
	}

	.feature-description {
		margin: 0;
		font-size: 0.85rem;
		color: var(--color-text-muted);
		line-height: 1.4;
	}

	.canopy-toggle {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.625rem;
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--color-text);
		cursor: pointer;
		width: fit-content;
	}

	.canopy-toggle input[type="checkbox"] {
		cursor: pointer;
	}

	.canopy-field {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		margin-top: 0.875rem;
	}

	.canopy-label {
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--color-text);
	}

	.canopy-input {
		width: 100%;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius-small, 0.375rem);
		background: var(--color-surface, transparent);
		color: var(--color-text);
		font: inherit;
		font-size: 0.875rem;
	}

	.canopy-count {
		align-self: flex-end;
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	.category-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
		gap: 0.5rem;
	}

	.category-checkbox {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		padding: 0.5rem 0.625rem;
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius-small, 0.375rem);
		font-size: 0.875rem;
		color: var(--color-text);
	}

	.category-checkbox:hover {
		border-color: var(--user-accent, var(--color-primary));
	}

	.category-checkbox input[type="checkbox"] {
		accent-color: var(--user-accent, var(--color-primary));
	}

	.canopy-save {
		margin-top: 1rem;
	}

	.curio-count {
		display: inline-block;
		margin-left: 0.25rem;
		padding: 0.125rem 0.5rem;
		background: var(--grove-accent-15);
		color: var(--user-accent, var(--color-primary));
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 500;
	}

	@media (max-width: 480px) {
		.feature-body {
			padding: 0.75rem 1rem;
		}

		.feature-icon {
			width: 36px;
			height: 36px;
		}

		:global(.feature-icon .icon) {
			width: 18px;
			height: 18px;
		}
	}
</style>
