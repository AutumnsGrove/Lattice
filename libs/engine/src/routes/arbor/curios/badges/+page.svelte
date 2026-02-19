<script lang="ts">
	import { enhance } from "$app/forms";
	import { GlassCard, GlassButton, toast } from "$lib/ui/components/ui";
	import { Award, Plus, Trash2, Star } from "lucide-svelte";

	let { data, form } = $props();

	let showCustomForm = $state(false);

	$effect(() => {
		if (form?.showcaseToggled) {
			toast.success("Showcase updated");
		} else if (form?.customCreated) {
			toast.success("Custom badge created");
			showCustomForm = false;
		} else if (form?.customRemoved) {
			toast.success("Custom badge removed");
		} else if (form?.error) {
			toast.error(form.error);
		}
	});

	function getRarityColor(rarity: string): string {
		const opt = data.rarityOptions.find((r) => r.value === rarity);
		return opt?.color ?? "#cd7f32";
	}
</script>

<svelte:head>
	<title>Badges - Curios</title>
</svelte:head>

<div class="badges-page">
	<header class="page-header">
		<div class="title-row">
			<Award class="header-icon" />
			<h1>Badges</h1>
		</div>
		<p class="subtitle">
			Collectible achievements celebrating your milestones. Badges celebrate what you've done, not
			pressure you into doing more.
		</p>
	</header>

	<!-- Earned Badges -->
	<section class="badges-section">
		<h2>Earned Badges</h2>
		{#if data.earnedBadges.length === 0}
			<GlassCard class="empty-card">
				<Award class="empty-icon" />
				<p>No badges earned yet.</p>
				<p class="empty-hint">Badges are awarded automatically as you use your site.</p>
			</GlassCard>
		{:else}
			<div class="badge-grid">
				{#each data.earnedBadges as badge}
					<GlassCard class="badge-card">
						<div class="badge-icon-wrap" style="border-color: {getRarityColor(badge.rarity)}">
							{#if badge.iconUrl}
								<img src={badge.iconUrl} alt={badge.name} width="32" height="32" />
							{:else}
								<Award class="badge-fallback-icon" />
							{/if}
						</div>
						<div class="badge-details">
							<h3>{badge.name}</h3>
							<p class="badge-desc">{badge.description}</p>
							<div class="badge-meta">
								<span class="rarity-tag" style="color: {getRarityColor(badge.rarity)}"
									>{badge.rarity}</span
								>
								{#if badge.isShowcased}
									<span class="showcase-tag"><Star class="showcase-icon" /> Showcased</span>
								{/if}
							</div>
						</div>
						<form method="POST" action="?/toggleShowcase" use:enhance>
							<input type="hidden" name="badgeId" value={badge.id} />
							<input type="hidden" name="showcase" value={badge.isShowcased ? "false" : "true"} />
							<GlassButton
								type="submit"
								variant="ghost"
								class="showcase-btn"
								title={badge.isShowcased ? "Remove from showcase" : "Add to showcase"}
								aria-label={badge.isShowcased ? "Remove from showcase" : "Add to showcase"}
							>
								<Star class="btn-icon" />
							</GlassButton>
						</form>
					</GlassCard>
				{/each}
			</div>
		{/if}
	</section>

	<!-- Available System Badges -->
	<section class="badges-section">
		<h2>System Badges</h2>
		<p class="section-desc">These badges are awarded automatically when you reach milestones.</p>
		<div class="system-badge-list">
			{#each data.systemBadges as badge}
				<div class="system-badge-item">
					<span class="system-badge-name">{badge.name}</span>
					<span class="system-badge-criteria">{badge.description}</span>
					<span class="rarity-tag" style="color: {getRarityColor(badge.rarity)}"
						>{badge.rarity}</span
					>
				</div>
			{/each}
		</div>
	</section>

	<!-- Custom Badges -->
	<section class="badges-section">
		<h2>Custom Badges</h2>
		{#if !showCustomForm}
			<GlassButton variant="accent" onclick={() => (showCustomForm = true)}>
				<Plus class="btn-icon" />
				Create Custom Badge
			</GlassButton>
		{:else}
			<GlassCard class="add-form-card">
				<form method="POST" action="?/createCustom" use:enhance>
					<div class="form-grid">
						<div class="form-field">
							<label for="name">Badge Name</label>
							<input
								type="text"
								id="name"
								name="name"
								required
								maxlength="50"
								class="glass-input"
								placeholder="My Badge"
							/>
						</div>
						<div class="form-field">
							<label for="iconUrl">Icon URL</label>
							<input
								type="url"
								id="iconUrl"
								name="iconUrl"
								required
								class="glass-input"
								placeholder="https://example.com/badge.svg"
							/>
						</div>
						<div class="form-field full-width">
							<label for="description">Description</label>
							<input
								type="text"
								id="description"
								name="description"
								required
								maxlength="200"
								class="glass-input"
								placeholder="A badge for..."
							/>
						</div>
					</div>
					<div class="form-actions">
						<GlassButton type="submit" variant="accent">
							<Plus class="btn-icon" />
							Create
						</GlassButton>
						<GlassButton variant="ghost" onclick={() => (showCustomForm = false)}
							>Cancel</GlassButton
						>
					</div>
				</form>
			</GlassCard>
		{/if}

		{#if data.customBadges.length > 0}
			<div class="custom-badge-list">
				{#each data.customBadges as badge}
					<GlassCard class="custom-badge-card">
						<div class="custom-badge-info">
							<strong>{badge.name}</strong>
							<span class="badge-desc">{badge.description}</span>
						</div>
						<form method="POST" action="?/removeCustom" use:enhance>
							<input type="hidden" name="badgeId" value={badge.id} />
							<GlassButton
								type="submit"
								variant="ghost"
								class="remove-btn"
								title="Remove badge"
								aria-label="Remove badge"
							>
								<Trash2 class="btn-icon" />
							</GlassButton>
						</form>
					</GlassCard>
				{/each}
			</div>
		{/if}
	</section>
</div>

<style>
	.badges-page {
		max-width: 800px;
		margin: 0 auto;
	}
	.page-header {
		margin-bottom: 2rem;
	}
	.title-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}
	:global(.header-icon) {
		width: 2rem;
		height: 2rem;
		color: var(--color-primary);
	}
	h1 {
		font-size: 2rem;
		font-weight: 700;
		color: var(--color-text);
		margin: 0;
	}
	.subtitle {
		color: var(--color-text-muted);
		font-size: 0.95rem;
		line-height: 1.6;
		max-width: 600px;
	}
	.badges-section {
		margin-bottom: 2rem;
	}
	h2 {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0 0 0.75rem 0;
		color: var(--color-text);
	}
	.section-desc {
		font-size: 0.85rem;
		color: var(--color-text-muted);
		margin-bottom: 0.75rem;
	}
	:global(.empty-card) {
		padding: 3rem 1.5rem;
		text-align: center;
	}
	:global(.empty-icon) {
		width: 3rem;
		height: 3rem;
		color: var(--color-text-muted);
		opacity: 0.5;
		margin-bottom: 1rem;
	}
	.empty-hint {
		font-size: 0.85rem;
		color: var(--color-text-muted);
		opacity: 0.7;
	}
	.badge-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 0.75rem;
	}
	:global(.badge-card) {
		padding: 1rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.badge-icon-wrap {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		border: 2px solid;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		background: var(--grove-overlay-4);
	}
	.badge-icon-wrap img {
		border-radius: 50%;
	}
	:global(.badge-fallback-icon) {
		width: 24px;
		height: 24px;
		color: var(--color-text-muted);
	}
	.badge-details {
		flex: 1;
		min-width: 0;
	}
	.badge-details h3 {
		font-size: 0.9rem;
		font-weight: 600;
		margin: 0;
		color: var(--color-text);
	}
	.badge-desc {
		font-size: 0.8rem;
		color: var(--color-text-muted);
		margin: 0.125rem 0;
	}
	.badge-meta {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		margin-top: 0.25rem;
	}
	.rarity-tag {
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.showcase-tag {
		font-size: 0.7rem;
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		color: var(--color-primary);
	}
	:global(.showcase-icon) {
		width: 0.7rem;
		height: 0.7rem;
	}
	:global(.showcase-btn) {
		min-width: 2.75rem;
		min-height: 2.75rem;
	}
	.system-badge-list {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}
	.system-badge-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 0.75rem;
		background: var(--grove-overlay-4);
		border-radius: var(--border-radius-standard);
		font-size: 0.85rem;
	}
	.system-badge-name {
		font-weight: 600;
		color: var(--color-text);
		min-width: 120px;
	}
	.system-badge-criteria {
		flex: 1;
		color: var(--color-text-muted);
	}
	:global(.add-form-card) {
		padding: 1.5rem;
		margin-bottom: 1rem;
	}
	.form-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}
	.full-width {
		grid-column: 1 / -1;
	}
	.form-field {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}
	.form-field label {
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--color-text-muted);
	}
	.glass-input {
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--grove-overlay-12);
		border-radius: var(--border-radius-standard);
		background: var(--grove-overlay-4);
		color: var(--color-text);
		font-size: 0.9rem;
	}
	.glass-input:focus {
		outline: none;
		border-color: var(--color-primary);
	}
	.form-actions {
		display: flex;
		gap: 0.75rem;
		margin-top: 1.25rem;
	}
	:global(.btn-icon) {
		width: 1rem;
		height: 1rem;
		margin-right: 0.375rem;
	}
	.custom-badge-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-top: 1rem;
	}
	:global(.custom-badge-card) {
		padding: 0.75rem 1rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.custom-badge-info {
		display: flex;
		flex-direction: column;
	}
	:global(.remove-btn) {
		min-width: 2.75rem;
		min-height: 2.75rem;
	}
	@media (max-width: 640px) {
		.title-row {
			flex-wrap: wrap;
		}
		.form-grid {
			grid-template-columns: 1fr;
		}
		.badge-grid {
			grid-template-columns: 1fr;
		}
		:global(.badge-card) {
			flex-wrap: wrap;
		}
		:global(.custom-badge-card) {
			flex-wrap: wrap;
			gap: 0.75rem;
		}
		.badge-icon-wrap {
			flex-shrink: 1;
		}
	}
</style>
