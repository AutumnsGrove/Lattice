<script lang="ts">
	import { onMount } from "svelte";
	import Button from "@autumnsgrove/lattice/ui/components/ui/Button.svelte";
	import GlassCard from "@autumnsgrove/lattice/ui/components/ui/GlassCard.svelte";
	import Skeleton from "@autumnsgrove/lattice/ui/components/ui/Skeleton.svelte";
	import Waystone from "@autumnsgrove/lattice/ui/components/ui/waystone/Waystone.svelte";
	import GroveTerm from "@autumnsgrove/lattice/components/terminology/GroveTerm.svelte";
	import GroveIcon from "@autumnsgrove/lattice/ui/components/ui/groveicon/GroveIcon.svelte";
	import { ArborSection } from "@autumnsgrove/lattice/ui/arbor";
	import { natureIcons } from "@autumnsgrove/prism/icons";
	import { toast } from "@autumnsgrove/lattice/ui/components/ui/toast";
	import { api } from "@autumnsgrove/lattice/utils";
	import {
		CANOPY_CATEGORIES,
		CANOPY_CATEGORY_LABELS,
	} from "@autumnsgrove/lattice/config/canopy-categories";

	let { data } = $props();

	// --- Canopy ---
	const CANOPY_CATEGORY_OPTIONS = CANOPY_CATEGORIES.map((id) => ({
		id,
		label: CANOPY_CATEGORY_LABELS[id],
	}));
	let canopyVisible = $state(false);
	let canopyBanner = $state("");
	let canopyCategories = $state<string[]>([]);
	let canopyShowForests = $state(true);
	let loadingCanopy = $state(true);
	let savingCanopy = $state(false);

	// --- Meadow ---
	// svelte-ignore state_referenced_locally
	let meadowOptIn = $state(data.meadowOptIn ?? false);
	let savingMeadow = $state(false);

	// --- human.json ---
	let humanJsonEnabled = $state(false);
	let savingHumanJson = $state(false);
	let humanJsonVouches = $state<{ id: number; url: string; vouched_at: string }[]>([]);
	let loadingHumanJson = $state(true);
	let newVouchUrl = $state("");
	let addingVouch = $state(false);
	let removingVouchId = $state<number | null>(null);

	async function fetchCanopySettings() {
		try {
			const result = await api.get("/api/settings");
			canopyVisible = result?.canopy_visible === true || result?.canopy_visible === "true";
			canopyBanner = result?.canopy_banner ?? "";
			try {
				const parsed =
					typeof result?.canopy_categories === "string"
						? JSON.parse(result.canopy_categories)
						: result?.canopy_categories;
				canopyCategories = Array.isArray(parsed) ? parsed : [];
			} catch {
				canopyCategories = [];
			}
			canopyShowForests =
				result?.canopy_show_forests === undefined ||
				result?.canopy_show_forests === true ||
				result?.canopy_show_forests === "true";
		} catch (error) {
			toast.error("Couldn't load Canopy settings");
			console.error("Failed to fetch Canopy settings:", error);
		}
		loadingCanopy = false;
	}

	function toggleCategory(categoryId: string) {
		if (canopyCategories.includes(categoryId)) {
			canopyCategories = canopyCategories.filter((c) => c !== categoryId);
		} else {
			canopyCategories = [...canopyCategories, categoryId];
		}
	}

	async function saveCanopySettings() {
		savingCanopy = true;
		try {
			await Promise.all([
				api.put("/api/admin/settings/canopy_visible", { value: canopyVisible }),
				api.put("/api/admin/settings/canopy_banner", { value: canopyBanner }),
				api.put("/api/admin/settings/canopy_categories", {
					value: JSON.stringify(canopyCategories),
				}),
				api.put("/api/admin/settings/canopy_show_forests", { value: canopyShowForests }),
			]);
			toast.success("Canopy settings saved");
		} catch (error) {
			toast.error("Couldn't save Canopy settings");
			console.error("Save Canopy settings error:", error);
		}
		savingCanopy = false;
	}

	async function saveMeadowSettings() {
		savingMeadow = true;
		try {
			await api.put("/api/admin/meadow", { meadow_opt_in: meadowOptIn });
			toast.success("Meadow settings saved");
		} catch (error) {
			toast.error("Couldn't save Meadow settings");
			console.error("Save Meadow settings error:", error);
		}
		savingMeadow = false;
	}

	async function fetchHumanJson() {
		try {
			const result = await api.get("/api/admin/human-json");
			humanJsonEnabled = result?.enabled ?? false;
			humanJsonVouches = result?.vouches ?? [];
		} catch (error) {
			toast.error("Couldn't load human.json settings");
			console.error("Failed to fetch human.json settings:", error);
		}
		loadingHumanJson = false;
	}

	async function saveHumanJsonEnabled() {
		savingHumanJson = true;
		try {
			await api.put("/api/admin/human-json", { enabled: humanJsonEnabled });
			toast.success("human.json settings saved");
		} catch (error) {
			toast.error("Couldn't save human.json settings");
			console.error("Save human.json error:", error);
		}
		savingHumanJson = false;
	}

	async function addVouch() {
		const url = newVouchUrl.trim();
		if (!url) return;
		addingVouch = true;
		try {
			const result = await api.post("/api/admin/human-json", { url });
			humanJsonVouches = [...humanJsonVouches, result];
			newVouchUrl = "";
			toast.success("Vouch added");
		} catch (error) {
			toast.error("Couldn't add vouch");
			console.error("Add vouch error:", error);
		}
		addingVouch = false;
	}

	async function removeVouch(id: number) {
		removingVouchId = id;
		try {
			await api.delete("/api/admin/human-json", {
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ id }),
			});
			humanJsonVouches = humanJsonVouches.filter((v) => v.id !== id);
			toast.success("Vouch removed");
		} catch (error) {
			toast.error("Couldn't remove vouch");
			console.error("Remove vouch error:", error);
		}
		removingVouchId = null;
	}

	onMount(() => {
		fetchCanopySettings();
		fetchHumanJson();
	});
</script>

<ArborSection
	title="Community"
	icon={natureIcons.trees}
	description="Connect with other groves and share your presence."
	backHref="/arbor/settings"
	backLabel="Settings"
>
	<!-- Canopy -->
	<GlassCard variant="frosted" class="mb-6">
		<div class="section-header">
			<h2>
				<GroveIcon
					service="grove"
					size={20}
					color="var(--user-accent, var(--color-primary))"
					class="inline-block align-text-bottom mr-1.5"
				/>
				Canopy
			</h2>
			<Waystone slug="what-is-canopy" label="What is Canopy?" inline />
		</div>
		<p class="section-description">
			Canopy is Grove's public wanderer directory — a place where
			<GroveTerm interactive term="grove">groves</GroveTerm> rise into view and find each other.
			<a
				href="https://grove.place/canopy"
				target="_blank"
				rel="noopener noreferrer"
				class="canopy-link">Learn more about Canopy &rarr;</a
			>
		</p>

		{#if loadingCanopy}
			<div class="canopy-skeleton">
				<Skeleton class="h-10 w-full rounded-lg" />
				<div class="skeleton-grid">
					<Skeleton class="h-10 w-full rounded" />
					<Skeleton class="h-10 w-full rounded" />
					<Skeleton class="h-10 w-full rounded" />
					<Skeleton class="h-10 w-full rounded" />
					<Skeleton class="h-10 w-full rounded" />
					<Skeleton class="h-10 w-full rounded" />
				</div>
			</div>
		{:else}
			<!-- Visibility toggle -->
			<label class="logo-toggle canopy-toggle">
				<input type="checkbox" bind:checked={canopyVisible} />
				<span class="toggle-label">
					<span class="toggle-title">Rise into the Canopy</span>
					<span class="toggle-description">Make your grove visible in the public directory</span>
				</span>
			</label>

			{#if canopyVisible}
				<!-- Banner -->
				<div class="canopy-field">
					<label class="field-label" for="canopy-banner">Banner tagline</label>
					<input
						id="canopy-banner"
						class="canopy-input"
						type="text"
						maxlength="160"
						placeholder="A short line about your grove…"
						bind:value={canopyBanner}
					/>
					<div class="field-help">
						<span>Shown on your Canopy listing</span>
						<span class="char-count">{canopyBanner.length}/160</span>
					</div>
				</div>

				<!-- Categories -->
				<div class="canopy-field">
					<span class="field-label">Categories</span>
					<div class="category-grid">
						{#each CANOPY_CATEGORY_OPTIONS as option (option.id)}
							<label class="category-checkbox">
								<input
									type="checkbox"
									checked={canopyCategories.includes(option.id)}
									onchange={() => toggleCategory(option.id)}
								/>
								<span class="checkbox-label">{option.label}</span>
							</label>
						{/each}
					</div>
					<p class="field-help">
						<span>Pick up to a few that best describe your grove</span>
					</p>
				</div>
			{/if}

			<!-- Show forests toggle -->
			<label class="logo-toggle canopy-toggle">
				<input type="checkbox" bind:checked={canopyShowForests} />
				<span class="toggle-label">
					<span class="toggle-title">Show in forests</span>
					<span class="toggle-description"
						>Allow your grove to appear in themed forest groupings</span
					>
				</span>
			</label>
		{/if}

		<div class="button-row">
			<Button onclick={saveCanopySettings} disabled={savingCanopy || loadingCanopy}>
				{savingCanopy ? "Saving…" : "Save Canopy Settings"}
			</Button>
		</div>
	</GlassCard>

	<!-- Meadow -->
	<GlassCard variant="frosted" class="mb-6">
		<div class="section-header">
			<h2>
				<GroveIcon
					service="meadow"
					size={20}
					color="var(--user-accent, var(--color-primary))"
					class="inline-block align-text-bottom mr-1.5"
				/>
				Meadow
			</h2>
			<Waystone slug="what-is-meadow" label="What is Meadow?" inline />
		</div>
		<p class="section-description">
			Meadow is Grove's community feed — share your
			<GroveTerm interactive term="blooms">blooms</GroveTerm>
			with the wider grove at
			<a
				href="https://meadow.grove.place"
				target="_blank"
				rel="noopener noreferrer"
				class="canopy-link">meadow.grove.place</a
			>.
		</p>

		<label class="logo-toggle canopy-toggle">
			<input type="checkbox" bind:checked={meadowOptIn} />
			<span class="toggle-label">
				<span class="toggle-title">Share to Meadow</span>
				<span class="toggle-description">
					New posts will appear in the community feed when you publish
				</span>
			</span>
		</label>

		<div class="button-row">
			<Button onclick={saveMeadowSettings} disabled={savingMeadow}>
				{savingMeadow ? "Saving…" : "Save Meadow Settings"}
			</Button>
		</div>
	</GlassCard>

	<!-- human.json -->
	<GlassCard variant="frosted" class="mb-6">
		<div class="section-header">
			<h2>human.json</h2>
		</div>
		<p class="section-description">
			Publish a
			<a
				href="https://codeberg.org/robida/human.json"
				target="_blank"
				rel="noopener noreferrer"
				class="canopy-link">human.json</a
			>
			file for your grove — a machine-readable profile and web-of-trust for the indie web.
		</p>

		{#if loadingHumanJson}
			<div class="canopy-skeleton">
				<Skeleton class="h-10 w-full rounded-lg" />
				<Skeleton class="h-10 w-full rounded-lg" />
			</div>
		{:else}
			<label class="logo-toggle canopy-toggle">
				<input type="checkbox" bind:checked={humanJsonEnabled} />
				<span class="toggle-label">
					<span class="toggle-title">Enable human.json</span>
					<span class="toggle-description">
						Serve a human.json file at your grove's /.well-known/human.json
					</span>
				</span>
			</label>

			<div class="button-row">
				<Button onclick={saveHumanJsonEnabled} disabled={savingHumanJson}>
					{savingHumanJson ? "Saving…" : "Save"}
				</Button>
			</div>

			{#if humanJsonEnabled}
				<div class="human-json-vouches">
					<h3 class="field-label">Web of trust — vouches</h3>
					<p class="section-description">
						Vouch for sites you trust to build your web of trust. These appear in your human.json.
					</p>

					{#if humanJsonVouches.length === 0}
						<p class="empty-state">
							No vouches yet — vouch for sites you trust to build your web of trust.
						</p>
					{:else}
						<ul class="vouch-list">
							{#each humanJsonVouches as vouch (vouch.id)}
								<li class="vouch-item" class:removing={removingVouchId === vouch.id}>
									<div class="vouch-info">
										<span class="vouch-url">{vouch.url}</span>
										<span class="vouch-date">
											Vouched {new Date(vouch.vouched_at).toLocaleDateString()}
										</span>
									</div>
									<Button
										variant="ghost"
										size="sm"
										onclick={() => removeVouch(vouch.id)}
										disabled={removingVouchId === vouch.id}
									>
										{removingVouchId === vouch.id ? "Removing…" : "Remove"}
									</Button>
								</li>
							{/each}
						</ul>
					{/if}

					<div class="vouch-add-row">
						<input
							class="vouch-input"
							type="url"
							placeholder="https://example.com"
							aria-label="URL to vouch for"
							bind:value={newVouchUrl}
							onkeydown={(e) => e.key === "Enter" && addVouch()}
						/>
						<Button onclick={addVouch} disabled={addingVouch || !newVouchUrl.trim()}>
							{addingVouch ? "Adding…" : "Add Vouch"}
						</Button>
					</div>
				</div>
			{/if}
		{/if}
	</GlassCard>
</ArborSection>

<style>
	/* ---- Links ---- */
	.canopy-link {
		display: inline;
		color: var(--user-accent, var(--color-primary));
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.canopy-link:hover {
		opacity: 0.8;
	}

	/* ---- Loading skeletons ---- */
	.canopy-skeleton {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}
	.skeleton-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: 0.5rem;
	}

	/* ---- Toggle rows ---- */
	.canopy-toggle {
		margin-bottom: 1.5rem;
	}

	/* ---- Category checkboxes ---- */
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
		background: var(--color-surface, transparent);
		transition:
			background 0.15s ease,
			border-color 0.15s ease;
	}
	.category-checkbox:hover {
		background: var(--color-surface-elevated, var(--color-surface));
		border-color: var(--user-accent, var(--color-primary));
	}
	.category-checkbox input[type="checkbox"] {
		accent-color: var(--user-accent, var(--color-primary));
		flex-shrink: 0;
	}
	.checkbox-label {
		font-size: 0.875rem;
		color: var(--color-text);
	}

	/* ---- Save button row ---- */
	.button-row {
		padding-top: 0.5rem;
	}

	/* ---- human.json vouches ---- */
	.human-json-vouches {
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--color-border);
	}

	.vouch-list {
		list-style: none;
		margin: 0 0 1rem 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.vouch-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.625rem 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius-small, 0.375rem);
		background: var(--color-surface, transparent);
		transition:
			opacity 0.2s ease,
			transform 0.2s ease;
	}
	.vouch-item.removing {
		opacity: 0.5;
		pointer-events: none;
	}
	.vouch-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.vouch-url {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.vouch-date {
		font-size: 0.775rem;
		color: var(--color-text-muted);
	}

	.vouch-add-row {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		margin-top: 0.75rem;
	}
	.vouch-input {
		flex: 1;
		padding: 0.5rem 0.75rem;
		background: var(--color-surface, transparent);
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius-small, 0.375rem);
		color: var(--color-text);
		font-size: 0.9rem;
		line-height: 1.5;
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease;
		min-width: 0;
	}
	.vouch-input:focus {
		outline: none;
		border-color: var(--user-accent, var(--color-primary));
		box-shadow: 0 0 0 2px hsl(var(--primary-color, 145 63% 42%) / 0.15);
	}
	.vouch-input::placeholder {
		color: var(--color-text-subtle, var(--color-text-muted));
	}

	.empty-state {
		padding: 1.25rem;
		text-align: center;
		font-style: italic;
		color: var(--color-text-muted);
		font-size: 0.875rem;
		margin: 0 0 1rem 0;
	}

	/* ---- Reduced motion ---- */
	@media (prefers-reduced-motion: reduce) {
		.logo-toggle,
		.category-checkbox,
		.canopy-input,
		.vouch-input,
		.vouch-item {
			transition: none;
		}
		.canopy-link {
			transition: none;
		}
	}
</style>
