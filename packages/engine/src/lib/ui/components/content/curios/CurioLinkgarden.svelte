<script lang="ts">
	/**
	 * CurioLinkgarden — Collection of curated links organized by garden
	 *
	 * Displays link gardens with organized links. Each link can show
	 * a favicon or button image. If arg is provided, shows only that garden.
	 */

	let { arg = '' }: { arg?: string } = $props();

	let data = $state<{
		gardens: Array<{
			id: string;
			title: string;
			description?: string;
			style?: string;
			links: Array<{
				id: string;
				url: string;
				title: string;
				description?: string;
				faviconUrl?: string;
				buttonImageUrl?: string;
				category?: string;
			}>;
		}>;
	} | null>(null);
	let loading = $state(true);
	let error = $state(false);

	$effect(() => {
		fetch('/api/curios/linkgarden') // csrf-ok
			.then((r) => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				return r.json() as Promise<typeof data>;
			})
			.then((d) => {
				data = d;
				loading = false;
			})
			.catch((err) => {
				console.warn('[CurioLinkgarden] Failed to load:', err);
				error = true;
				loading = false;
			});
	});

	function getFilteredGardens() {
		if (!data) return [];
		if (arg) {
			return data.gardens.filter((g) => g.id === arg);
		}
		return data.gardens;
	}

	function isGridLayout(style?: string) {
		return style === 'grid';
	}
</script>

{#if loading}
	<div class="grove-curio-skeleton" role="status">
		<span class="sr-only">Loading link garden…</span>
		<div class="linkgarden-skeleton">
			<div class="linkgarden-skeleton-title"></div>
			<div class="linkgarden-skeleton-links">
				{#each Array(3) as _}
					<div class="linkgarden-skeleton-link"></div>
				{/each}
			</div>
		</div>
	</div>
{:else if error}
	<span class="grove-curio-error">Link garden unavailable</span>
{:else if data}
	<div class="linkgarden-container">
		{#each getFilteredGardens() as garden (garden.id)}
			<div class="linkgarden" role="region" aria-label="Link garden: {garden.title}">
				<div class="linkgarden-header">
					<h3 class="linkgarden-title">{garden.title}</h3>
					{#if garden.description}
						<p class="linkgarden-description">{garden.description}</p>
					{/if}
				</div>
				<div class="linkgarden-links" class:linkgarden-grid={isGridLayout(garden.style)}>
					{#each garden.links as link (link.id)}
						<a href={link.url} class="linkgarden-link" target="_blank" rel="noopener noreferrer">
							{#if link.buttonImageUrl}
								<img
									src={link.buttonImageUrl}
									alt=""
									class="linkgarden-link-image"
									loading="lazy"
									width="40"
									height="40"
								/>
							{:else if link.faviconUrl}
								<img
									src={link.faviconUrl}
									alt=""
									class="linkgarden-link-favicon"
									loading="lazy"
									width="24"
									height="24"
								/>
							{:else}
								<div class="linkgarden-link-placeholder" aria-hidden="true"></div>
							{/if}
							<span class="linkgarden-link-title">{link.title}</span>
							{#if link.description}
								<span class="linkgarden-link-description">{link.description}</span>
							{/if}
						</a>
					{/each}
				</div>
			</div>
		{/each}
	</div>
{/if}

<style>
	.linkgarden-container {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.linkgarden {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.linkgarden-header {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.linkgarden-title {
		margin: 0;
		font-size: 1rem;
		font-weight: 700;
		line-height: 1.4;
	}

	.linkgarden-description {
		margin: 0;
		font-size: 0.875rem;
		opacity: 0.7;
		line-height: 1.4;
	}

	.linkgarden-links {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.linkgarden-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: 0.75rem;
	}

	.linkgarden-link {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.625rem 0.875rem;
		border-radius: 0.375rem;
		background: rgba(0, 0, 0, 0.04);
		text-decoration: none;
		color: inherit;
		transition: all 0.2s ease;
		overflow: hidden;
	}

	:global(.dark) .linkgarden-link {
		background: rgba(255, 255, 255, 0.06);
	}

	.linkgarden-link:hover {
		background: rgba(0, 0, 0, 0.08);
		transform: translateY(-1px);
	}

	:global(.dark) .linkgarden-link:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	.linkgarden-grid .linkgarden-link {
		flex-direction: column;
		align-items: center;
		gap: 0.375rem;
		padding: 0.75rem 0.5rem;
		text-align: center;
		min-height: 100px;
		justify-content: center;
	}

	.linkgarden-link-favicon {
		width: 24px;
		height: 24px;
		object-fit: contain;
		flex-shrink: 0;
	}

	.linkgarden-link-image {
		width: 40px;
		height: 40px;
		object-fit: contain;
		flex-shrink: 0;
	}

	.linkgarden-grid .linkgarden-link-image {
		width: 48px;
		height: 48px;
	}

	.linkgarden-link-placeholder {
		width: 24px;
		height: 24px;
		border-radius: 0.25rem;
		background: rgba(0, 0, 0, 0.1);
		flex-shrink: 0;
	}

	.linkgarden-link-title {
		font-weight: 600;
		font-size: 0.875rem;
		line-height: 1.3;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
	}

	.linkgarden-grid .linkgarden-link-title {
		white-space: normal;
	}

	.linkgarden-link-description {
		font-size: 0.75rem;
		opacity: 0.6;
		line-height: 1.3;
		overflow: hidden;
		text-overflow: ellipsis;
		display: none;
	}

	.linkgarden-link:hover .linkgarden-link-description {
		display: block;
	}

	/* Skeleton */
	.linkgarden-skeleton {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.linkgarden-skeleton-title {
		height: 1.5rem;
		background: rgba(0, 0, 0, 0.1);
		border-radius: 0.375rem;
		width: 40%;
	}

	.linkgarden-skeleton-links {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.linkgarden-skeleton-link {
		height: 2.75rem;
		background: rgba(0, 0, 0, 0.1);
		border-radius: 0.375rem;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		border: 0;
	}
</style>
