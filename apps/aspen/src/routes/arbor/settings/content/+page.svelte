<script lang="ts">
	import { onMount } from "svelte";
	import Button from "@autumnsgrove/lattice/ui/components/ui/Button.svelte";
	import GlassCard from "@autumnsgrove/lattice/ui/components/ui/GlassCard.svelte";
	import GlassConfirmDialog from "@autumnsgrove/lattice/ui/components/ui/GlassConfirmDialog.svelte";
	import Skeleton from "@autumnsgrove/lattice/ui/components/ui/Skeleton.svelte";
	import { ArborSection } from "@autumnsgrove/lattice/ui/arbor";
	import { natureIcons, actionIcons } from "@autumnsgrove/prism/icons";
	import { toast } from "@autumnsgrove/lattice/ui/components/ui/toast";
	import { api } from "@autumnsgrove/lattice/utils";
	import { Blaze } from "@autumnsgrove/lattice/blazes/components";
	import {
		GLOBAL_BLAZE_DEFAULTS,
		VALID_BLAZE_ICONS,
		VALID_BLAZE_COLORS,
		BLAZE_COLORS,
		BLAZE_COLOR_HEX,
		resolveLucideIcon,
		isValidBlazeHexColor,
	} from "@autumnsgrove/lattice/blazes";

	const Plus = actionIcons.plus;
	const RotateCcw = actionIcons.rotateCcw;

	interface BlazeItem {
		slug: string;
		label: string;
		icon: string;
		color: string;
		scope: "global" | "tenant";
	}

	let customBlazes = $state<BlazeItem[]>([]);
	let loadingBlazes = $state(true);
	let showNewBlazeForm = $state(false);
	let newBlazeSlug = $state("");
	let newBlazeLabel = $state("");
	let slugManuallyEdited = $state(false);
	let newBlazeIcon = $state("Bell");
	let newBlazeColor = $state("sky");
	let newCustomHexColor = $state("#8b5e3c");
	let savingBlaze = $state(false);
	let deletingBlazeSlug = $state<string | null>(null);
	let showDeleteBlazeDialog = $state(false);
	let pendingDeleteBlazeSlug = $state<string | null>(null);
	let pendingDeleteBlazeLabel = $state("");

	async function fetchBlazes() {
		loadingBlazes = true;
		try {
			const result = await api.get("/api/blazes");
			const all: BlazeItem[] = result.blazes || [];
			customBlazes = all.filter((b) => b.scope === "tenant");
		} catch (error) {
			toast.error("Couldn't load your blazes");
			console.error("Failed to fetch blazes:", error);
			customBlazes = [];
		}
		loadingBlazes = false;
	}

	$effect(() => {
		if (!showNewBlazeForm || slugManuallyEdited) return;
		newBlazeSlug = newBlazeLabel
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "");
	});

	async function createBlaze() {
		if (!newBlazeSlug.trim() || !newBlazeLabel.trim()) {
			toast.error("Slug and label are required");
			return;
		}
		savingBlaze = true;
		try {
			await api.post("/api/blazes", {
				slug: newBlazeSlug.trim(),
				label: newBlazeLabel.trim(),
				icon: newBlazeIcon,
				color: newBlazeColor,
			});
			toast.success(`Blaze "${newBlazeLabel}" created`);
			showNewBlazeForm = false;
			newBlazeSlug = "";
			newBlazeLabel = "";
			slugManuallyEdited = false;
			newBlazeIcon = "Bell";
			newBlazeColor = "sky";
			await fetchBlazes();
		} catch (error) {
			toast.error("Couldn't create blaze");
			console.error("Create blaze error:", error);
		}
		savingBlaze = false;
	}

	function confirmDeleteBlaze(slug: string) {
		const blaze = customBlazes.find((b) => b.slug === slug);
		pendingDeleteBlazeSlug = slug;
		pendingDeleteBlazeLabel = blaze?.label ?? slug;
		showDeleteBlazeDialog = true;
	}

	async function deleteBlaze() {
		if (!pendingDeleteBlazeSlug) return;
		deletingBlazeSlug = pendingDeleteBlazeSlug;
		try {
			await api.delete(`/api/blazes/${pendingDeleteBlazeSlug}`);
			toast.success(`Blaze "${pendingDeleteBlazeLabel}" deleted`);
			await fetchBlazes();
		} catch (error) {
			toast.error("Couldn't delete blaze");
			console.error("Delete blaze error:", error);
		}
		deletingBlazeSlug = null;
		showDeleteBlazeDialog = false;
		pendingDeleteBlazeSlug = null;
		pendingDeleteBlazeLabel = "";
	}

	onMount(() => {
		fetchBlazes();
	});
</script>

<ArborSection
	title="Content"
	icon={natureIcons.flame}
	description="The markers that tell readers what your posts are about."
	backHref="/arbor/settings"
	backLabel="Settings"
>
	<GlassCard
		variant="frosted"
		title="Blazes"
		waystone="what-are-blazes"
		waystoneLabel="What are blazes?"
		class="mb-6"
	>
		<p class="section-description">
			Blazes mark what your posts are about — quick visual cues for readers at a glance. Eight
			global defaults are available to everyone; create custom blazes to express what makes your
			content uniquely yours. Up to 20 custom blazes per grove.
		</p>

		<!-- Global defaults -->
		<div class="blaze-subsection-title">Global defaults</div>
		<div class="blaze-defaults-row">
			{#each GLOBAL_BLAZE_DEFAULTS as blazeDef}
				<Blaze definition={blazeDef} />
			{/each}
		</div>

		<!-- Custom blazes -->
		<div class="blaze-subsection-title" style="margin-top: 1.5rem;">Your custom blazes</div>

		{#if loadingBlazes}
			<div class="blaze-skeleton">
				<Skeleton class="h-8 w-8 rounded-full" />
				<Skeleton class="h-8 w-8 rounded-full" />
				<Skeleton class="h-8 w-8 rounded-full" />
				<Skeleton class="h-8 w-8 rounded-full" />
				<Skeleton class="h-8 w-8 rounded-full" />
				<Skeleton class="h-8 w-8 rounded-full" />
				<Skeleton class="h-8 w-8 rounded-full" />
				<Skeleton class="h-8 w-8 rounded-full" />
			</div>
		{:else if customBlazes.length > 0}
			<div class="custom-blazes-list">
				{#each customBlazes as blaze (blaze.slug)}
					<div class="custom-blaze-item" class:deleting={deletingBlazeSlug === blaze.slug}>
						<Blaze definition={blaze} />
						<span class="custom-blaze-slug">{blaze.slug}</span>
						<Button
							variant="ghost"
							size="sm"
							onclick={() => confirmDeleteBlaze(blaze.slug)}
							disabled={deletingBlazeSlug === blaze.slug}
							aria-label="Delete blaze {blaze.label}"
						>
							{deletingBlazeSlug === blaze.slug ? "Deleting..." : "Delete"}
						</Button>
					</div>
				{/each}
			</div>
		{:else if !showNewBlazeForm}
			<p class="empty-state">
				No custom blazes yet — create your own to mark what makes your posts unique.
			</p>
		{/if}

		<!-- New blaze form -->
		{#if showNewBlazeForm}
			<div class="new-blaze-form">
				<div class="blaze-form-fields">
					<div class="form-group">
						<label class="form-label" for="blaze-label">Label</label>
						<input
							id="blaze-label"
							class="form-input"
							type="text"
							placeholder="e.g. Recipe"
							bind:value={newBlazeLabel}
							maxlength={32}
						/>
					</div>
					<div class="form-group">
						<label class="form-label" for="blaze-slug">
							Slug
							<span class="form-label-hint">(URL-safe identifier)</span>
						</label>
						<input
							id="blaze-slug"
							class="form-input"
							type="text"
							placeholder="e.g. recipe"
							bind:value={newBlazeSlug}
							oninput={() => (slugManuallyEdited = true)}
							maxlength={48}
						/>
					</div>
				</div>

				<!-- Icon picker -->
				<div class="form-group">
					<span class="form-label">Icon</span>
					<div class="blaze-icon-grid" role="radiogroup" aria-label="Choose a blaze icon">
						{#each VALID_BLAZE_ICONS.slice(0, 32) as iconName}
							{@const IconComp = resolveLucideIcon(iconName)}
							<button
								type="button"
								class="blaze-icon-btn"
								class:active={newBlazeIcon === iconName}
								onclick={() => (newBlazeIcon = iconName)}
								aria-label={iconName}
								title={iconName}
								role="radio"
								aria-checked={newBlazeIcon === iconName}
							>
								<IconComp size={18} aria-hidden="true" />
							</button>
						{/each}
					</div>
				</div>

				<!-- Color picker -->
				<div class="form-group">
					<span class="form-label">Color</span>
					<div class="blaze-color-picker">
						<div class="blaze-color-swatches" role="radiogroup" aria-label="Choose a blaze color">
							{#each VALID_BLAZE_COLORS as colorKey}
								<button
									type="button"
									class="blaze-color-swatch"
									class:active={newBlazeColor === colorKey}
									style:background={BLAZE_COLOR_HEX[colorKey] ?? "#888"}
									onclick={() => (newBlazeColor = colorKey)}
									aria-label={colorKey}
									title={colorKey}
									role="radio"
									aria-checked={newBlazeColor === colorKey}
								></button>
							{/each}
						</div>

						<!-- Custom hex color -->
						<div class="blaze-color-custom">
							<div class="blaze-custom-color-info">
								<span class="form-label" style="margin-bottom: 0;">Custom hex</span>
								{#if isValidBlazeHexColor(newBlazeColor)}
									<button
										type="button"
										class="blaze-reset-color"
										onclick={() => (newBlazeColor = "sky")}
										title="Reset to named color"
									>
										<RotateCcw size={12} aria-hidden="true" />
										reset
									</button>
								{/if}
							</div>
							<div class="blaze-color-input-row">
								<input
									class="form-input blaze-color-input"
									type="text"
									placeholder="#8b5e3c"
									bind:value={newCustomHexColor}
									maxlength={7}
									aria-label="Pick a custom color"
								/>
								<button
									type="button"
									class="blaze-color-add-btn"
									title="Use this custom color"
									aria-label="Apply custom hex color"
									onclick={() => {
										if (isValidBlazeHexColor(newCustomHexColor)) {
											newBlazeColor = newCustomHexColor;
										} else {
											toast.error("Enter a valid hex color like #8b5e3c");
										}
									}}
								>
									Use
								</button>
							</div>
						</div>
					</div>
				</div>

				<!-- Preview -->
				<div class="blaze-preview">
					<span class="blaze-preview-label">Preview</span>
					<Blaze
						definition={{
							slug: newBlazeSlug || "preview",
							label: newBlazeLabel || "Preview",
							icon: newBlazeIcon,
							color: newBlazeColor,
						}}
					/>
				</div>

				<!-- Form actions -->
				<div class="button-row">
					<Button
						variant="primary"
						onclick={createBlaze}
						disabled={savingBlaze || !newBlazeLabel.trim() || !newBlazeSlug.trim()}
					>
						{savingBlaze ? "Creating..." : "Create Blaze"}
					</Button>
					<Button
						variant="ghost"
						onclick={() => {
							showNewBlazeForm = false;
							newBlazeSlug = "";
							newBlazeLabel = "";
							slugManuallyEdited = false;
							newBlazeIcon = "Bell";
							newBlazeColor = "sky";
						}}
						disabled={savingBlaze}
					>
						Cancel
					</Button>
				</div>
			</div>
		{:else if customBlazes.length < 20}
			<div class="button-row" style="margin-top: 1rem;">
				<Button variant="ghost" onclick={() => (showNewBlazeForm = true)}>
					<Plus size={16} aria-hidden="true" />
					Create Custom Blaze
				</Button>
			</div>
		{/if}
	</GlassCard>
</ArborSection>

<GlassConfirmDialog
	bind:open={showDeleteBlazeDialog}
	title="Delete Blaze"
	message="Delete the &ldquo;{pendingDeleteBlazeLabel}&rdquo; blaze? Posts using it will lose this marker."
	confirmLabel="Delete"
	variant="danger"
	loading={deletingBlazeSlug !== null}
	onconfirm={deleteBlaze}
/>

<style>
	/* Global defaults */
	.blaze-subsection-title {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--color-text-muted);
		margin-bottom: 0.6rem;
	}

	.blaze-defaults-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin-bottom: 0.5rem;
	}

	/* Skeleton loader */
	.blaze-skeleton {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		padding: 0.25rem 0;
	}

	/* Custom blazes list */
	.custom-blazes-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.custom-blaze-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius-standard, 0.5rem);
		background: var(--color-surface);
		transition: opacity 0.2s ease;
	}

	.custom-blaze-item.deleting {
		opacity: 0.4;
		pointer-events: none;
	}

	.custom-blaze-slug {
		flex: 1;
		font-size: 0.8rem;
		font-family: monospace;
		color: var(--color-text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Empty state */
	.empty-state {
		padding: 1.25rem;
		text-align: center;
		color: var(--color-text-muted);
		font-size: 0.9rem;
		font-style: italic;
		border: 1px dashed var(--color-border);
		border-radius: var(--border-radius-standard, 0.5rem);
		margin-bottom: 0.75rem;
	}

	/* New blaze form */
	.new-blaze-form {
		margin-top: 1rem;
		padding: 1.25rem;
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius-standard, 0.5rem);
		background: var(--color-surface);
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.blaze-form-fields {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	@media (max-width: 560px) {
		.blaze-form-fields {
			grid-template-columns: 1fr;
		}
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.form-label {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text-muted);
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.form-label-hint {
		font-weight: 400;
		font-size: 0.78rem;
		color: var(--color-text-subtle, var(--color-text-muted));
		opacity: 0.8;
	}

	.form-input {
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius-small, 0.375rem);
		background: var(--color-surface);
		color: var(--color-text);
		font-size: 0.9rem;
		outline: none;
		transition: border-color 0.15s ease;
	}

	.form-input:focus {
		border-color: var(--color-primary);
	}

	.form-input::placeholder {
		color: var(--color-text-muted);
		opacity: 0.6;
	}

	/* Icon grid */
	.blaze-icon-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.blaze-icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius-small, 0.375rem);
		background: var(--color-surface);
		color: var(--color-text-muted);
		cursor: pointer;
		transition:
			border-color 0.15s ease,
			background 0.15s ease,
			color 0.15s ease;
	}

	.blaze-icon-btn:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}

	.blaze-icon-btn.active {
		border-color: var(--color-primary);
		background: color-mix(in srgb, var(--color-primary) 12%, var(--color-surface));
		color: var(--color-primary);
	}

	/* Color picker */
	.blaze-color-picker {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.blaze-color-swatches {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.blaze-color-swatch {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		border: 2px solid transparent;
		cursor: pointer;
		transition:
			transform 0.15s ease,
			border-color 0.15s ease,
			box-shadow 0.15s ease;
	}

	.blaze-color-swatch:hover {
		transform: scale(1.15);
	}

	.blaze-color-swatch.active {
		border-color: var(--color-text);
		box-shadow:
			0 0 0 2px var(--color-surface),
			0 0 0 4px var(--color-text);
		transform: scale(1.1);
	}

	/* Custom hex input */
	.blaze-color-custom {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.blaze-custom-color-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.blaze-reset-color {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.75rem;
		color: var(--color-text-muted);
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		transition: color 0.15s ease;
	}

	.blaze-reset-color:hover {
		color: var(--color-text);
	}

	.blaze-color-input-row {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.blaze-color-input {
		max-width: 160px;
	}

	.blaze-color-add-btn {
		padding: 0.5rem 0.875rem;
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius-small, 0.375rem);
		background: var(--color-surface);
		color: var(--color-text);
		font-size: 0.85rem;
		font-weight: 500;
		cursor: pointer;
		transition:
			border-color 0.15s ease,
			background 0.15s ease;
		white-space: nowrap;
	}

	.blaze-color-add-btn:hover {
		border-color: var(--color-primary);
		background: color-mix(in srgb, var(--color-primary) 8%, var(--color-surface));
	}

	/* Preview */
	.blaze-preview {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.625rem 1rem;
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius-small, 0.375rem);
		background: color-mix(in srgb, var(--color-surface) 60%, transparent);
	}

	.blaze-preview-label {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-text-muted);
	}

	@media (prefers-reduced-motion: reduce) {
		.blaze-color-swatch,
		.blaze-icon-btn,
		.custom-blaze-item {
			transition: none;
		}
	}
</style>
