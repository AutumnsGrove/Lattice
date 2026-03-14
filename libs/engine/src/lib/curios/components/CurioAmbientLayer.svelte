<script lang="ts">
	/**
	 * CurioAmbientLayer — Global ambient sounds player
	 *
	 * Self-fetches ambient config from `/api/curios/ambient`.
	 * Renders a small floating play/pause button that lets visitors
	 * opt-in to ambient background sounds. Never autoplays.
	 *
	 * Mount once in the root layout — applies site-wide.
	 */
	import { browser } from '$app/environment';

	interface AmbientConfig {
		soundSet: string;
		volume: number;
		enabled: boolean;
		customUrl: string | null;
	}

	// Preset sound URLs — would point to R2-hosted audio files
	const SOUND_PRESETS: Record<string, string> = {
		'forest-rain': '/audio/ambient/forest-rain.mp3',
		'campfire': '/audio/ambient/campfire.mp3',
		'gentle-wind': '/audio/ambient/gentle-wind.mp3',
		'night-crickets': '/audio/ambient/night-crickets.mp3',
	};

	let config = $state<AmbientConfig | null>(null);
	let playing = $state(false);
	let audio = $state<HTMLAudioElement | null>(null);

	$effect(() => {
		if (!browser) return;

		fetch('/api/curios/ambient') // csrf-ok
			.then((r) => r.ok ? r.json() as Promise<{ config: AmbientConfig | null }> : null)
			.then((d) => {
				if (d?.config?.enabled) config = d.config;
			})
			.catch((err) => {
				console.warn('[CurioAmbientLayer] Failed to load config:', err);
			});
	});

	function togglePlay() {
		if (!config) return;

		if (playing && audio) {
			audio.pause();
			playing = false;
			return;
		}

		if (!audio) {
			const src = config.customUrl || SOUND_PRESETS[config.soundSet] || '';
			if (!src) return;

			const el = new Audio(src);
			el.loop = true;
			el.volume = Math.max(0, Math.min(1, config.volume));
			audio = el;
		}

		audio.play().then(() => {
			playing = true;
		}).catch(() => {
			// Browser blocked autoplay — user needs to interact
		});
	}

	// Cleanup audio on unmount
	$effect(() => {
		return () => {
			if (audio) {
				audio.pause();
				audio.src = '';
				audio = null;
			}
		};
	});
</script>

{#if config}
	<button
		class="ambient-toggle"
		onclick={togglePlay}
		aria-label={playing ? 'Pause ambient sounds' : 'Play ambient sounds'}
		title={playing ? 'Pause ambient sounds' : 'Play ambient sounds'}
	>
		{#if playing}
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<rect x="6" y="4" width="4" height="16" />
				<rect x="14" y="4" width="4" height="16" />
			</svg>
		{:else}
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
				<path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
			</svg>
		{/if}
	</button>
{/if}

<style>
	.ambient-toggle {
		position: fixed;
		bottom: 1rem;
		left: 1rem;
		z-index: 40;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		border: 1px solid rgba(0, 0, 0, 0.1);
		background: rgba(255, 255, 255, 0.8);
		backdrop-filter: blur(8px);
		color: #374151;
		cursor: pointer;
		transition: transform 0.15s ease, box-shadow 0.15s ease;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	:global(.dark) .ambient-toggle {
		background: rgba(30, 30, 30, 0.8);
		border-color: rgba(255, 255, 255, 0.1);
		color: #d1d5db;
	}

	.ambient-toggle:hover {
		transform: scale(1.1);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	}

	.ambient-toggle:active {
		transform: scale(0.95);
	}
</style>
