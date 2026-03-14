<script lang="ts">
	/**
	 * CurioNowplaying — What's currently playing
	 *
	 * Displays the tenant's current track (manual, Spotify, or Last.fm).
	 * Shows album art, track name, and artist in a compact card.
	 * The digital equivalent of music playing in the background of a cozy shop.
	 */

	let { arg = '' }: { arg?: string } = $props();

	let data = $state<{
		track: {
			trackName: string;
			artist: string;
			album?: string | null;
			albumArtUrl?: string | null;
			isPlaying?: boolean;
		} | null;
		style: string;
		showAlbumArt: boolean;
		fallbackText: string;
	} | null>(null);
	let loading = $state(true);
	let error = $state(false);

	$effect(() => {
		fetch('/api/curios/nowplaying') // csrf-ok
			.then((r) => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				return r.json() as Promise<{ nowPlaying: typeof data }>;
			})
			.then((d) => {
				data = d.nowPlaying;
				loading = false;
			})
			.catch((err) => {
				console.warn('[CurioNowplaying] Failed to load:', err);
				error = true;
				loading = false;
			});
	});
</script>

{#if loading}
	<div class="grove-curio-skeleton" role="status">
		<span class="sr-only">Loading now playing…</span>
		<div class="nowplaying-skeleton">
			<div class="nowplaying-skeleton-art"></div>
			<div class="nowplaying-skeleton-text">
				<div class="nowplaying-skeleton-line wide"></div>
				<div class="nowplaying-skeleton-line narrow"></div>
			</div>
		</div>
	</div>
{:else if error}
	<span class="grove-curio-error">Now playing unavailable</span>
{:else if data}
	<div class="nowplaying" role="status" aria-label={data.track ? `Now playing: ${data.track.trackName} by ${data.track.artist}` : data.fallbackText}>
		{#if data.track}
			{#if data.showAlbumArt && data.track.albumArtUrl}
				<img
					class="nowplaying-art"
					src={data.track.albumArtUrl}
					alt="Album art for {data.track.album || data.track.trackName}"
					loading="lazy"
					width="48"
					height="48"
				/>
			{:else}
				<div class="nowplaying-icon" aria-hidden="true">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M9 18V5l12-2v13" />
						<circle cx="6" cy="18" r="3" />
						<circle cx="18" cy="16" r="3" />
					</svg>
				</div>
			{/if}
			<div class="nowplaying-info">
				<span class="nowplaying-track">{data.track.trackName}</span>
				<span class="nowplaying-artist">{data.track.artist}</span>
			</div>
			{#if data.track.isPlaying}
				<div class="nowplaying-bars" aria-hidden="true">
					<span class="bar"></span>
					<span class="bar"></span>
					<span class="bar"></span>
				</div>
			{/if}
		{:else}
			<div class="nowplaying-icon" aria-hidden="true">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M9 18V5l12-2v13" />
					<circle cx="6" cy="18" r="3" />
					<circle cx="18" cy="16" r="3" />
				</svg>
			</div>
			<span class="nowplaying-fallback">{data.fallbackText}</span>
		{/if}
	</div>
{/if}

<style>
	.nowplaying {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.625rem 0.875rem;
		border-radius: 0.5rem;
		background: rgba(0, 0, 0, 0.04);
		min-height: 3.5rem;
	}

	:global(.dark) .nowplaying {
		background: rgba(255, 255, 255, 0.06);
	}

	.nowplaying-art {
		width: 48px;
		height: 48px;
		border-radius: 4px;
		object-fit: cover;
		flex-shrink: 0;
	}

	.nowplaying-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: rgba(0, 0, 0, 0.08);
		flex-shrink: 0;
		opacity: 0.6;
	}

	:global(.dark) .nowplaying-icon {
		background: rgba(255, 255, 255, 0.1);
	}

	.nowplaying-info {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
		flex: 1;
	}

	.nowplaying-track {
		font-weight: 600;
		font-size: 0.875rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.nowplaying-artist {
		font-size: 0.75rem;
		opacity: 0.7;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.nowplaying-fallback {
		font-size: 0.8125rem;
		font-style: italic;
		opacity: 0.6;
	}

	.nowplaying-bars {
		display: flex;
		align-items: flex-end;
		gap: 2px;
		height: 16px;
		flex-shrink: 0;
	}

	.bar {
		width: 3px;
		background: rgb(var(--grove-400, 74 222 128));
		border-radius: 1px;
		animation: nowplaying-bounce 1s ease-in-out infinite;
	}

	.bar:nth-child(1) { height: 60%; animation-delay: 0s; }
	.bar:nth-child(2) { height: 100%; animation-delay: 0.15s; }
	.bar:nth-child(3) { height: 40%; animation-delay: 0.3s; }

	@keyframes nowplaying-bounce {
		0%, 100% { transform: scaleY(0.4); }
		50% { transform: scaleY(1); }
	}

	@media (prefers-reduced-motion: reduce) {
		.bar {
			animation: none;
		}
		.bar:nth-child(1) { height: 40%; }
		.bar:nth-child(2) { height: 70%; }
		.bar:nth-child(3) { height: 55%; }
	}

	/* Skeleton */
	.nowplaying-skeleton {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.625rem 0.875rem;
	}

	.nowplaying-skeleton-art {
		width: 48px;
		height: 48px;
		border-radius: 4px;
		background: rgba(0, 0, 0, 0.1);
	}

	.nowplaying-skeleton-text {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		flex: 1;
	}

	.nowplaying-skeleton-line {
		height: 0.75rem;
		background: rgba(0, 0, 0, 0.1);
		border-radius: 4px;
	}

	.nowplaying-skeleton-line.wide { width: 70%; }
	.nowplaying-skeleton-line.narrow { width: 45%; }
</style>
