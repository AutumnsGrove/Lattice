<script lang="ts">
	import { themes, themeList } from "../lib/themes/registry.js";
	import ThemePreview from "../lib/components/ThemePreview.svelte";
	import type { Theme } from "../lib/types.js";

	let selectedTheme = $state<Theme | null>(null);
	let showFullPreview = $state(false);

	function openPreview(theme: Theme) {
		selectedTheme = theme;
		showFullPreview = true;
	}

	function closePreview() {
		showFullPreview = false;
		selectedTheme = null;
	}

	// Group themes by tier
	const seedlingThemes = $derived(themeList.filter((t) => t.tier === "seedling"));
	const saplingThemes = $derived(themeList.filter((t) => t.tier === "sapling"));
</script>

<div class="gallery">
	<div class="intro">
		<h2>Theme Gallery</h2>
		<p>Click any theme to view it full-size for screenshots. All themes are WCAG AA compliant.</p>
	</div>

	<section class="tier-section">
		<h3>
			<span class="tier-badge seedling">Seedling</span>
			Core Themes (3)
		</h3>
		<div class="theme-grid">
			{#each seedlingThemes as theme (theme.id)}
				<button class="theme-card" onclick={() => openPreview(theme)}>
					<div class="preview-wrapper">
						<ThemePreview {theme} />
					</div>
					<div class="theme-info">
						<span class="theme-name">{theme.name}</span>
						<span class="theme-layout">{theme.layout.type}</span>
					</div>
				</button>
			{/each}
		</div>
	</section>

	<section class="tier-section">
		<h3>
			<span class="tier-badge sapling">Sapling+</span>
			Extended Themes (7)
		</h3>
		<div class="theme-grid">
			{#each saplingThemes as theme (theme.id)}
				<button class="theme-card" onclick={() => openPreview(theme)}>
					<div class="preview-wrapper">
						<ThemePreview {theme} />
					</div>
					<div class="theme-info">
						<span class="theme-name">{theme.name}</span>
						<span class="theme-layout">{theme.layout.type}</span>
					</div>
				</button>
			{/each}
		</div>
	</section>
</div>

<!-- Full-size preview modal -->
{#if showFullPreview && selectedTheme}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="modal-overlay"
		onclick={closePreview}
		onkeydown={(e) => e.key === "Escape" && closePreview()}
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
		tabindex="-1"
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="modal" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h2 id="modal-title">{selectedTheme.name}</h2>
				<p class="theme-desc">{selectedTheme.description}</p>
				<button class="close-btn" onclick={closePreview} aria-label="Close">×</button>
			</div>
			<div class="modal-body">
				<div class="full-preview" id="theme-preview-{selectedTheme.id}">
					<ThemePreview theme={selectedTheme} />
				</div>
				<div class="theme-details">
					<h4>Theme Details</h4>
					<dl>
						<dt>ID</dt>
						<dd><code>{selectedTheme.id}</code></dd>
						<dt>Tier</dt>
						<dd>{selectedTheme.tier}</dd>
						<dt>Layout</dt>
						<dd>{selectedTheme.layout.type}</dd>
						<dt>Spacing</dt>
						<dd>{selectedTheme.layout.spacing}</dd>
						<dt>Heading Font</dt>
						<dd>{selectedTheme.fonts.heading}</dd>
						<dt>Body Font</dt>
						<dd>{selectedTheme.fonts.body}</dd>
					</dl>
					<h4>Colors</h4>
					<div class="color-swatches">
						{#each Object.entries(selectedTheme.colors) as [name, color]}
							<div class="swatch">
								<div class="swatch-color" style="background: {color}"></div>
								<span class="swatch-name">{name}</span>
								<code class="swatch-value">{color}</code>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.gallery {
		max-width: 1400px;
		margin: 0 auto;
	}

	.intro {
		margin-bottom: 2rem;
	}

	.intro h2 {
		margin: 0 0 0.5rem 0;
		font-size: 1.75rem;
	}

	.intro p {
		margin: 0;
		color: #666;
	}

	.tier-section {
		margin-bottom: 3rem;
	}

	.tier-section h3 {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin: 0 0 1.5rem 0;
		font-size: 1.25rem;
	}

	.tier-badge {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
	}

	.tier-badge.seedling {
		background: #dcfce7;
		color: #166534;
	}

	.tier-badge.sapling {
		background: #dbeafe;
		color: #1e40af;
	}

	.theme-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 1.5rem;
	}

	.theme-card {
		background: white;
		border: 2px solid #e5e5e5;
		border-radius: 0.75rem;
		padding: 0;
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: left;
		overflow: hidden;
	}

	:global(.dark) .theme-card {
		background: #1a1a1a;
		border-color: #333;
	}

	.theme-card:hover {
		border-color: #16a34a;
		transform: translateY(-2px);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
	}

	.preview-wrapper {
		padding: 1rem;
		background: #f5f5f5;
	}

	:global(.dark) .preview-wrapper {
		background: #222;
	}

	.theme-info {
		padding: 1rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.theme-name {
		font-weight: 600;
		font-size: 1rem;
	}

	.theme-layout {
		font-size: 0.75rem;
		color: #666;
		background: #f0f0f0;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
	}

	:global(.dark) .theme-layout {
		background: #333;
		color: #aaa;
	}

	/* Modal */
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 2rem;
	}

	.modal {
		background: white;
		border-radius: 1rem;
		max-width: 900px;
		width: 100%;
		max-height: 90vh;
		overflow-y: auto;
	}

	:global(.dark) .modal {
		background: #1a1a1a;
	}

	.modal-header {
		padding: 1.5rem;
		border-bottom: 1px solid #e5e5e5;
		position: relative;
	}

	:global(.dark) .modal-header {
		border-color: #333;
	}

	.modal-header h2 {
		margin: 0 0 0.5rem 0;
		padding-right: 2rem;
	}

	.theme-desc {
		margin: 0;
		color: #666;
	}

	.close-btn {
		position: absolute;
		top: 1rem;
		right: 1rem;
		background: none;
		border: none;
		font-size: 2rem;
		cursor: pointer;
		color: #666;
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.close-btn:hover {
		color: #111;
	}

	:global(.dark) .close-btn:hover {
		color: #fff;
	}

	.modal-body {
		padding: 1.5rem;
		display: grid;
		grid-template-columns: 1fr 280px;
		gap: 2rem;
	}

	@media (max-width: 768px) {
		.modal-body {
			grid-template-columns: 1fr;
		}
	}

	.full-preview {
		background: #f5f5f5;
		padding: 1.5rem;
		border-radius: 0.5rem;
	}

	:global(.dark) .full-preview {
		background: #222;
	}

	.theme-details h4 {
		margin: 0 0 0.75rem 0;
		font-size: 0.875rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #666;
	}

	.theme-details dl {
		margin: 0 0 1.5rem 0;
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.5rem;
	}

	.theme-details dt {
		font-weight: 500;
		color: #666;
	}

	.theme-details dd {
		margin: 0;
	}

	.theme-details code {
		background: #f0f0f0;
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		font-size: 0.875rem;
	}

	:global(.dark) .theme-details code {
		background: #333;
	}

	.color-swatches {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.swatch {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.swatch-color {
		width: 2rem;
		height: 2rem;
		border-radius: 0.25rem;
		border: 1px solid rgba(0, 0, 0, 0.1);
	}

	.swatch-name {
		flex: 1;
		font-size: 0.875rem;
	}

	.swatch-value {
		font-size: 0.75rem;
	}
</style>
