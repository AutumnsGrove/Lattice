<script lang="ts">
	/**
	 * CurioShelves — Universal shelf display with 4 display modes
	 *
	 * Fetches shelves from the API and renders them according to each shelf's
	 * display mode: cover-grid, card-list, buttons (88x31), spines, or masonry.
	 * Supports shelf materials (wood, glass, none) for the spines mode.
	 */

	let { arg = "" }: { arg?: string } = $props();

	interface ShelfItem {
		id: string;
		url: string;
		title: string;
		creator: string | null;
		description: string | null;
		coverUrl: string | null;
		thumbnailUrl: string | null;
		category: string | null;
		isStatus1: boolean;
		isStatus2: boolean;
		rating: number | null;
		note: string | null;
	}

	interface Shelf {
		id: string;
		name: string;
		description: string | null;
		preset: string;
		displayMode: string;
		material: string;
		creatorLabel: string;
		status1Label: string;
		status2Label: string;
		isFeatured: boolean;
		groupByCategory: boolean;
		items: ShelfItem[];
	}

	let data = $state<{ shelves: Shelf[] } | null>(null);
	let loading = $state(true);
	let error = $state(false);
	let expandedSpine = $state<string | null>(null);

	$effect(() => {
		fetch("/api/curios/shelves") // csrf-ok
			.then((r) => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				return r.json() as Promise<typeof data>;
			})
			.then((d) => {
				data = d;
				loading = false;
			})
			.catch((err) => {
				console.warn("[CurioShelves] Failed to load:", err);
				error = true;
				loading = false;
			});
	});

	function getFilteredShelves(): Shelf[] {
		if (!data) return [];
		if (arg) return data.shelves.filter((s) => s.id === arg);
		return data.shelves;
	}

	function toggleSpine(itemId: string) {
		expandedSpine = expandedSpine === itemId ? null : itemId;
	}

	function handleSpineKey(e: KeyboardEvent, itemId: string) {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			toggleSpine(itemId);
		}
	}

	/** Generate a warm color from category name for spine display */
	function spineColor(category: string | null, index: number): string {
		const palette = [
			"#8B6914",
			"#6B4423",
			"#4A6741",
			"#7B4B8A",
			"#4A708B",
			"#8B3A3A",
			"#556B2F",
			"#8B7355",
			"#5B3A6B",
			"#6B8E23",
		];
		if (category) {
			let hash = 0;
			for (let i = 0; i < category.length; i++) {
				hash = ((hash << 5) - hash + category.charCodeAt(i)) | 0;
			}
			return palette[Math.abs(hash) % palette.length];
		}
		return palette[index % palette.length];
	}

	/** Generate a warm gradient for masonry cards without cover images */
	function masonryGradient(category: string | null, index: number): string {
		const palette = [
			"#8B6914",
			"#6B4423",
			"#4A6741",
			"#7B4B8A",
			"#4A708B",
			"#8B3A3A",
			"#556B2F",
			"#8B7355",
			"#5B3A6B",
			"#6B8E23",
		];
		let base: string;
		if (category) {
			let hash = 0;
			for (let i = 0; i < category.length; i++) {
				hash = ((hash << 5) - hash + category.charCodeAt(i)) | 0;
			}
			base = palette[Math.abs(hash) % palette.length];
		} else {
			base = palette[index % palette.length];
		}
		// Parse hex and lighten by ~40% for the gradient end
		const r = parseInt(base.slice(1, 3), 16);
		const g = parseInt(base.slice(3, 5), 16);
		const b = parseInt(base.slice(5, 7), 16);
		const lighter = `rgb(${Math.min(255, r + 60)}, ${Math.min(255, g + 60)}, ${Math.min(255, b + 60)})`;
		return `linear-gradient(135deg, ${base}, ${lighter})`;
	}

	function renderStars(rating: number | null): string {
		if (!rating) return "";
		return "\u2605".repeat(rating) + "\u2606".repeat(5 - rating);
	}
</script>

{#if loading}
	<div class="grove-curio-skeleton" role="status">
		<span class="sr-only">Loading shelves…</span>
		<div class="shelves-skeleton">
			{#each Array(2) as _}
				<div class="skeleton-shelf">
					<div class="skeleton-title">&nbsp;</div>
					<div class="skeleton-items">
						{#each Array(3) as _}
							<div class="skeleton-item">&nbsp;</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>
{:else if error}
	<span class="grove-curio-error">Shelves unavailable</span>
{:else if data}
	<div class="shelves" role="region" aria-label="Shelves">
		{#each getFilteredShelves() as shelf (shelf.id)}
			<section class="shelf-section">
				<div class="shelf-header">
					<h2 class="shelf-title">{shelf.name}</h2>
					{#if shelf.description}
						<p class="shelf-description">{shelf.description}</p>
					{/if}
				</div>

				{#if shelf.items.length === 0}
					<p class="shelf-empty">Nothing on this shelf yet</p>

					<!-- COVER GRID -->
				{:else if shelf.displayMode === "cover-grid"}
					<div class="display-cover-grid">
						{#each shelf.items as item (item.id)}
							<a
								href={item.url}
								target="_blank"
								rel="noopener noreferrer"
								class="cover-card"
								title={item.title}
							>
								{#if item.coverUrl}
									<img src={item.coverUrl} alt="" class="cover-image" loading="lazy" />
								{:else if item.thumbnailUrl}
									<img
										src={item.thumbnailUrl}
										alt=""
										class="cover-image cover-image--thumb"
										loading="lazy"
									/>
								{:else}
									<div class="cover-placeholder">
										<span class="cover-placeholder-text">{item.title.slice(0, 2)}</span>
									</div>
								{/if}
								<div class="cover-overlay">
									<span class="cover-overlay-title">{item.title}</span>
									{#if item.creator}
										<span class="cover-overlay-creator">{item.creator}</span>
									{/if}
								</div>
								{#if item.isStatus1 || item.isStatus2}
									<div class="cover-badges">
										{#if item.isStatus1}
											<span class="badge badge--status1">{shelf.status1Label}</span>
										{/if}
										{#if item.isStatus2}
											<span class="badge badge--status2">{shelf.status2Label}</span>
										{/if}
									</div>
								{/if}
							</a>
						{/each}
					</div>

					<!-- CARD LIST -->
				{:else if shelf.displayMode === "card-list"}
					<div class="display-card-list">
						{#each shelf.items as item (item.id)}
							<a href={item.url} target="_blank" rel="noopener noreferrer" class="list-card">
								{#if item.coverUrl || item.thumbnailUrl}
									<img
										src={item.coverUrl || item.thumbnailUrl}
										alt=""
										class="list-card-image"
										loading="lazy"
									/>
								{/if}
								<div class="list-card-content">
									<h3 class="list-card-title">{item.title}</h3>
									{#if item.creator}
										<p class="list-card-creator">{shelf.creatorLabel}: {item.creator}</p>
									{/if}
									{#if item.description}
										<p class="list-card-desc">{item.description}</p>
									{/if}
									<div class="list-card-meta">
										{#if item.rating}
											<span class="list-card-rating" aria-label="{item.rating} out of 5 stars"
												>{renderStars(item.rating)}</span
											>
										{/if}
										{#if item.isStatus1}
											<span class="badge badge--status1">{shelf.status1Label}</span>
										{/if}
										{#if item.isStatus2}
											<span class="badge badge--status2">{shelf.status2Label}</span>
										{/if}
									</div>
									{#if item.note}
										<p class="list-card-note">{item.note}</p>
									{/if}
								</div>
							</a>
						{/each}
					</div>

					<!-- BUTTONS (88x31) -->
				{:else if shelf.displayMode === "buttons"}
					<div class="display-buttons">
						{#each shelf.items as item (item.id)}
							<a
								href={item.url}
								target="_blank"
								rel="noopener noreferrer"
								class="button-tile"
								title={item.title}
							>
								{#if item.thumbnailUrl}
									<img
										src={item.thumbnailUrl}
										alt={item.title}
										class="button-image"
										loading="lazy"
										width="88"
										height="31"
									/>
								{:else}
									<span class="button-text">{item.title}</span>
								{/if}
							</a>
						{/each}
					</div>

					<!-- SPINES -->
				{:else if shelf.displayMode === "spines"}
					<div class="display-spines">
						<ul class="spines-row" role="list">
							{#each shelf.items as item, idx (item.id)}
								<li class="spine-slot">
									<button
										class="spine"
										style:--spine-color={spineColor(item.category, idx)}
										aria-expanded={expandedSpine === item.id}
										onclick={() => toggleSpine(item.id)}
										onkeydown={(e) => handleSpineKey(e, item.id)}
									>
										<span class="spine-title">{item.title}</span>
										{#if item.creator}
											<span class="spine-creator">{item.creator}</span>
										{/if}
									</button>
								</li>
							{/each}
						</ul>
						<div class="shelf-plank shelf-plank--{shelf.material}"></div>
						{#if expandedSpine}
							{@const expanded = shelf.items.find((i) => i.id === expandedSpine)}
							{#if expanded}
								<div class="spine-detail">
									{#if expanded.coverUrl}
										<img src={expanded.coverUrl} alt="" class="spine-detail-cover" />
									{/if}
									<div class="spine-detail-info">
										<h3 class="spine-detail-title">
											<a href={expanded.url} target="_blank" rel="noopener noreferrer"
												>{expanded.title}</a
											>
										</h3>
										{#if expanded.creator}
											<p class="spine-detail-creator">{shelf.creatorLabel}: {expanded.creator}</p>
										{/if}
										{#if expanded.description}
											<p class="spine-detail-desc">{expanded.description}</p>
										{/if}
										{#if expanded.rating}
											<span class="spine-detail-rating">{renderStars(expanded.rating)}</span>
										{/if}
										{#if expanded.note}
											<p class="spine-detail-note">{expanded.note}</p>
										{/if}
										<div class="spine-detail-badges">
											{#if expanded.isStatus1}
												<span class="badge badge--status1">{shelf.status1Label}</span>
											{/if}
											{#if expanded.isStatus2}
												<span class="badge badge--status2">{shelf.status2Label}</span>
											{/if}
										</div>
									</div>
								</div>
							{/if}
						{/if}
					</div>

					<!-- MASONRY -->
				{:else if shelf.displayMode === "masonry"}
					<div class="display-masonry">
						{#each shelf.items as item, idx (item.id)}
							<a href={item.url} target="_blank" rel="noopener noreferrer" class="masonry-card">
								{#if item.coverUrl}
									<img src={item.coverUrl} alt="" class="masonry-card-image" loading="lazy" />
								{:else if item.thumbnailUrl}
									<img src={item.thumbnailUrl} alt="" class="masonry-card-image" loading="lazy" />
								{:else}
									<div
										class="masonry-card-gradient"
										style:background={masonryGradient(item.category, idx)}
									>
										<span class="masonry-card-initial">{item.title.slice(0, 2)}</span>
									</div>
								{/if}
								<div class="masonry-card-body">
									<h3 class="masonry-card-title">{item.title}</h3>
									{#if item.creator}
										<p class="masonry-card-creator">{shelf.creatorLabel}: {item.creator}</p>
									{/if}
									{#if item.description}
										<p class="masonry-card-desc">{item.description}</p>
									{/if}
									<div class="masonry-card-meta">
										{#if item.rating}
											<span class="masonry-card-rating" aria-label="{item.rating} out of 5 stars"
												>{renderStars(item.rating)}</span
											>
										{/if}
										{#if item.isStatus1}
											<span class="badge badge--status1">{shelf.status1Label}</span>
										{/if}
										{#if item.isStatus2}
											<span class="badge badge--status2">{shelf.status2Label}</span>
										{/if}
									</div>
								</div>
							</a>
						{/each}
					</div>

					<!-- FALLBACK to cover-grid -->
				{:else}
					<div class="display-cover-grid">
						{#each shelf.items as item (item.id)}
							<a
								href={item.url}
								target="_blank"
								rel="noopener noreferrer"
								class="cover-card"
								title={item.title}
							>
								<div class="cover-placeholder">
									<span class="cover-placeholder-text">{item.title.slice(0, 2)}</span>
								</div>
								<div class="cover-overlay">
									<span class="cover-overlay-title">{item.title}</span>
								</div>
							</a>
						{/each}
					</div>
				{/if}
			</section>
		{/each}
	</div>
{/if}

<style>
	/* ===== Layout ===== */
	.shelves {
		padding: 0.5rem 0;
	}

	.shelf-section {
		margin-bottom: 2.5rem;
	}
	.shelf-section:last-child {
		margin-bottom: 0;
	}

	.shelf-header {
		margin-bottom: 1rem;
	}

	.shelf-title {
		margin: 0 0 0.25rem 0;
		font-size: 1.125rem;
		font-weight: 600;
	}

	.shelf-description {
		margin: 0;
		font-size: 0.875rem;
		opacity: 0.7;
	}

	.shelf-empty {
		margin: 1rem 0;
		font-size: 0.875rem;
		opacity: 0.6;
		font-style: italic;
	}

	/* ===== Badges (shared) ===== */
	.badge {
		display: inline-block;
		padding: 0.1875rem 0.375rem;
		border-radius: 0.1875rem;
		font-size: 0.625rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.02em;
	}

	.badge--status1 {
		background: rgba(59, 130, 246, 0.1);
		color: rgb(37, 99, 235);
	}

	.badge--status2 {
		background: rgba(236, 72, 153, 0.1);
		color: rgb(190, 24, 93);
	}

	:global(.dark) .badge--status1 {
		background: rgba(59, 130, 246, 0.15);
		color: rgb(147, 197, 253);
	}

	:global(.dark) .badge--status2 {
		background: rgba(236, 72, 153, 0.15);
		color: rgb(249, 168, 212);
	}

	/* ===== COVER GRID ===== */
	.display-cover-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
		gap: 1rem;
	}

	.cover-card {
		position: relative;
		display: flex;
		flex-direction: column;
		text-decoration: none;
		color: inherit;
		border-radius: 0.375rem;
		overflow: hidden;
		transition: transform 0.2s ease;
	}

	.cover-card:hover {
		transform: translateY(-2px);
	}
	.cover-card:focus-visible {
		outline: 2px solid currentColor;
		outline-offset: 2px;
	}

	.cover-image {
		width: 100%;
		height: 12rem;
		object-fit: cover;
		background: rgba(0, 0, 0, 0.05);
	}

	.cover-image--thumb {
		object-fit: contain;
		background: rgba(0, 0, 0, 0.03);
	}

	.cover-placeholder {
		width: 100%;
		height: 12rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, rgba(74, 222, 128, 0.15), rgba(34, 197, 94, 0.08));
		border-radius: 0.375rem;
	}

	.cover-placeholder-text {
		font-size: 2rem;
		font-weight: 700;
		opacity: 0.3;
		text-transform: uppercase;
	}

	.cover-overlay {
		padding: 0.5rem 0.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.cover-overlay-title {
		font-size: 0.8125rem;
		font-weight: 600;
		line-height: 1.3;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.cover-overlay-creator {
		font-size: 0.6875rem;
		opacity: 0.6;
	}

	.cover-badges {
		position: absolute;
		top: 0.375rem;
		right: 0.375rem;
		display: flex;
		gap: 0.25rem;
	}

	/* ===== CARD LIST ===== */
	.display-card-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.list-card {
		display: flex;
		gap: 0.875rem;
		padding: 0.75rem;
		border-radius: 0.5rem;
		background: rgba(0, 0, 0, 0.03);
		text-decoration: none;
		color: inherit;
		transition: background 0.2s ease;
	}

	.list-card:hover {
		background: rgba(0, 0, 0, 0.06);
	}
	:global(.dark) .list-card {
		background: rgba(255, 255, 255, 0.04);
	}
	:global(.dark) .list-card:hover {
		background: rgba(255, 255, 255, 0.08);
	}

	.list-card:focus-visible {
		outline: 2px solid currentColor;
		outline-offset: 2px;
	}

	.list-card-image {
		width: 4rem;
		height: 5.5rem;
		object-fit: cover;
		border-radius: 0.25rem;
		flex-shrink: 0;
	}

	.list-card-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;
	}

	.list-card-title {
		margin: 0;
		font-size: 0.9375rem;
		font-weight: 600;
		line-height: 1.3;
	}

	.list-card-creator {
		margin: 0;
		font-size: 0.8125rem;
		opacity: 0.7;
	}

	.list-card-desc {
		margin: 0;
		font-size: 0.8125rem;
		opacity: 0.6;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.list-card-meta {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		flex-wrap: wrap;
		margin-top: 0.125rem;
	}

	.list-card-rating {
		font-size: 0.75rem;
		color: rgb(234, 179, 8);
	}

	.list-card-note {
		margin: 0.25rem 0 0;
		font-size: 0.75rem;
		font-style: italic;
		opacity: 0.6;
	}

	/* ===== BUTTONS (88x31) ===== */
	.display-buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.button-tile {
		display: block;
		width: 88px;
		height: 31px;
		flex-shrink: 0;
		text-decoration: none;
		transition: opacity 0.15s ease;
	}

	.button-tile:hover {
		opacity: 0.85;
	}
	.button-tile:focus-visible {
		outline: 2px solid currentColor;
		outline-offset: 1px;
	}

	.button-image {
		width: 88px;
		height: 31px;
		object-fit: cover;
		display: block;
		image-rendering: pixelated;
	}

	.button-text {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 88px;
		height: 31px;
		background: rgb(34, 197, 94);
		color: white;
		font-size: 0.5625rem;
		font-weight: 600;
		text-align: center;
		line-height: 1.1;
		padding: 0 0.125rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* ===== SPINES ===== */
	.display-spines {
		display: flex;
		flex-direction: column;
	}

	.spines-row {
		display: flex;
		align-items: flex-end;
		gap: 0;
		min-height: 8rem;
		padding: 0 0.5rem;
		list-style: none;
		margin: 0;
	}

	.spine-slot {
		display: contents;
	}

	.spine {
		writing-mode: vertical-rl;
		text-orientation: mixed;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		padding: 0.5rem 0.375rem;
		min-height: 6rem;
		max-height: 10rem;
		background: var(--spine-color, #8b6914);
		color: white;
		border: none;
		font: inherit;
		border-radius: 0.125rem 0.125rem 0 0;
		cursor: pointer;
		transition:
			filter 0.2s ease,
			transform 0.2s ease;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
		flex-shrink: 0;
	}

	.spine:hover {
		filter: brightness(1.1);
		transform: translateY(-2px);
	}

	.spine:focus-visible {
		outline: 2px solid white;
		outline-offset: -2px;
		z-index: 1;
	}

	.spine[aria-expanded="true"] {
		filter: brightness(1.2);
		transform: translateY(-4px);
	}

	.spine-title {
		font-size: 0.6875rem;
		font-weight: 600;
		line-height: 1;
		max-height: 6rem;
		overflow: hidden;
	}

	.spine-creator {
		font-size: 0.5625rem;
		opacity: 0.8;
		max-height: 3rem;
		overflow: hidden;
	}

	/* Shelf plank */
	.shelf-plank {
		height: 0.75rem;
		border-radius: 0 0 0.25rem 0.25rem;
	}

	.shelf-plank--wood {
		background: linear-gradient(to bottom, #a0522d, #8b4513);
		box-shadow:
			0 3px 6px rgba(0, 0, 0, 0.2),
			inset 0 1px 0 rgba(255, 255, 255, 0.1);
	}

	.shelf-plank--glass {
		background: rgba(255, 255, 255, 0.15);
		backdrop-filter: blur(8px);
		border: 1px solid rgba(255, 255, 255, 0.2);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	:global(.dark) .shelf-plank--glass {
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.1);
	}

	.shelf-plank--none {
		display: none;
	}

	/* Spine detail card */
	.spine-detail {
		display: flex;
		gap: 1rem;
		padding: 1rem;
		margin-top: 0.75rem;
		border-radius: 0.5rem;
		background: rgba(0, 0, 0, 0.03);
	}

	:global(.dark) .spine-detail {
		background: rgba(255, 255, 255, 0.04);
	}

	.spine-detail-cover {
		width: 5rem;
		height: 7rem;
		object-fit: cover;
		border-radius: 0.25rem;
		flex-shrink: 0;
	}

	.spine-detail-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.spine-detail-title {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
	}

	.spine-detail-title a {
		color: inherit;
		text-decoration: none;
	}

	.spine-detail-title a:hover {
		text-decoration: underline;
	}

	.spine-detail-creator {
		margin: 0;
		font-size: 0.875rem;
		opacity: 0.7;
	}

	.spine-detail-desc {
		margin: 0.25rem 0 0;
		font-size: 0.8125rem;
		opacity: 0.7;
		line-height: 1.4;
	}

	.spine-detail-rating {
		font-size: 0.875rem;
		color: rgb(234, 179, 8);
	}

	.spine-detail-note {
		margin: 0.25rem 0 0;
		font-size: 0.8125rem;
		font-style: italic;
		opacity: 0.6;
	}

	.spine-detail-badges {
		display: flex;
		gap: 0.375rem;
		margin-top: 0.25rem;
	}

	/* ===== MASONRY ===== */
	.display-masonry {
		column-width: 17.5rem;
		column-gap: 1rem;
		column-fill: balance;
	}

	.masonry-card {
		display: inline-block;
		width: 100%;
		margin-bottom: 1rem;
		border-radius: 0.625rem;
		overflow: hidden;
		background: rgba(255, 255, 255, 0.55);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		border: 1px solid rgba(255, 255, 255, 0.3);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
		text-decoration: none;
		color: inherit;
		break-inside: avoid;
		transition:
			transform 0.2s ease,
			box-shadow 0.2s ease;
	}

	.masonry-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
	}

	.masonry-card:focus-visible {
		outline: 2px solid rgb(34, 197, 94);
		outline-offset: 2px;
	}

	.masonry-card-image {
		width: 100%;
		height: auto;
		aspect-ratio: auto;
		display: block;
	}

	.masonry-card-gradient {
		width: 100%;
		aspect-ratio: 4 / 3;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.masonry-card-initial {
		font-size: 2.5rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.5);
		text-transform: uppercase;
	}

	.masonry-card-body {
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.masonry-card-title {
		margin: 0;
		font-size: 0.9375rem;
		font-weight: 600;
		line-height: 1.3;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.masonry-card-creator {
		margin: 0;
		font-size: 0.8125rem;
		opacity: 0.7;
	}

	.masonry-card-desc {
		margin: 0;
		font-size: 0.8125rem;
		opacity: 0.6;
		line-height: 1.4;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.masonry-card-meta {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		flex-wrap: wrap;
		margin-top: 0.125rem;
	}

	.masonry-card-rating {
		font-size: 0.75rem;
		color: rgb(234, 179, 8);
	}

	:global(.dark) .masonry-card {
		background: rgba(30, 30, 30, 0.6);
		border-color: rgba(255, 255, 255, 0.1);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
	}

	:global(.dark) .masonry-card:hover {
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
	}

	/* ===== Skeleton ===== */
	.shelves-skeleton {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.skeleton-shelf {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.skeleton-title {
		height: 1.5rem;
		width: 50%;
		background: rgba(0, 0, 0, 0.08);
		border-radius: 0.375rem;
	}

	.skeleton-items {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
		gap: 1rem;
	}

	.skeleton-item {
		height: 12rem;
		background: rgba(0, 0, 0, 0.06);
		border-radius: 0.375rem;
	}

	:global(.dark) .skeleton-title {
		background: rgba(255, 255, 255, 0.1);
	}
	:global(.dark) .skeleton-item {
		background: rgba(255, 255, 255, 0.08);
	}

	:global(.dark) .cover-placeholder {
		background: linear-gradient(135deg, rgba(74, 222, 128, 0.1), rgba(34, 197, 94, 0.05));
	}

	:global(.dark) .cover-image {
		background: rgba(255, 255, 255, 0.05);
	}

	/* ===== Reduced motion ===== */
	@media (prefers-reduced-motion: reduce) {
		.cover-card,
		.list-card,
		.button-tile,
		.spine,
		.masonry-card {
			transition: none;
		}

		.cover-card:hover,
		.spine:hover,
		.spine[aria-expanded="true"],
		.masonry-card:hover {
			transform: none;
		}
	}
</style>
