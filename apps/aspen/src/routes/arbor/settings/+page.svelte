<script lang="ts">
	import { onMount } from "svelte";
	import GlassCard from "@autumnsgrove/lattice/ui/components/ui/GlassCard.svelte";
	import Skeleton from "@autumnsgrove/lattice/ui/components/ui/Skeleton.svelte";
	import { authIcons, chromeIcons, featureIcons, natureIcons } from "@autumnsgrove/prism/icons";
	import { FONT_PRESETS } from "@autumnsgrove/lattice/config/presets";
	import { SEASON_LABELS } from "@autumnsgrove/lattice/ui/types/season";
	import { api } from "@autumnsgrove/lattice/utils";

	let { data } = $props();

	// Session count loaded client-side (real-time from SessionDO)
	let sessionCount = $state<number | null>(null);
	let loadingSessions = $state(true);

	onMount(async () => {
		try {
			const result = await api.get("/api/auth/sessions");
			sessionCount = (result.sessions || []).length;
		} catch {
			sessionCount = null;
		}
		loadingSessions = false;
	});

	// Derive display values
	const displayAvatar = $derived(data.avatarUrl || data.oauthAvatarUrl);
	const fontName = $derived(FONT_PRESETS.find((f) => f.id === data.fontFamily)?.name || "Lexend");
	const seasonLabel = $derived(
		data.preferredSeason
			? SEASON_LABELS[data.preferredSeason as keyof typeof SEASON_LABELS] || ""
			: "Default",
	);
</script>

<div class="settings-hub">
	<header class="page-header">
		<h1>Settings</h1>
		<p class="subtitle">Your grove, at a glance.</p>
	</header>

	<div class="settings-grid">
		<!-- Profile Card -->
		<a href="/arbor/settings/profile" class="card-link">
			<GlassCard variant="frosted" hoverable>
				<div class="card-header">
					<chromeIcons.sliders class="card-icon" />
					<h2 class="card-title">Profile</h2>
				</div>
				<div class="card-status">
					<span class="status-line">{data.currentSubdomain}.grove.place</span>
					<span class="status-line">Photo: {displayAvatar ? "set" : "not set"}</span>
					<span class="status-line">
						Title: {data.groveTitle ? `"${data.groveTitle}"` : "default"}
					</span>
				</div>
				<span class="card-action">Edit profile &rarr;</span>
			</GlassCard>
		</a>

		<!-- Appearance Card -->
		<a href="/arbor/settings/appearance" class="card-link">
			<GlassCard variant="frosted" hoverable>
				<div class="card-header">
					<featureIcons.palette class="card-icon" />
					<h2 class="card-title">Appearance</h2>
				</div>
				<div class="card-status">
					<span class="status-line">Font: {fontName}</span>
					<span class="status-line">
						Accent:
						{#if data.accentColor}
							<span class="color-dot" style:background={data.accentColor} aria-hidden="true"></span>
							{data.accentColor}
						{:else}
							default
						{/if}
					</span>
					<span class="status-line">Season: {seasonLabel}</span>
				</div>
				<span class="card-action">Customize &rarr;</span>
			</GlassCard>
		</a>

		<!-- Community Card -->
		<a href="/arbor/settings/community" class="card-link">
			<GlassCard variant="frosted" hoverable>
				<div class="card-header">
					<natureIcons.trees class="card-icon" />
					<h2 class="card-title">Community</h2>
				</div>
				<div class="card-status">
					<span class="status-line">
						Canopy: {data.canopyVisible ? "visible" : "hidden"}
					</span>
					<span class="status-line">
						Meadow: {data.meadowOptIn ? "sharing" : "off"}
					</span>
					<span class="status-line">
						human.json: {data.humanJsonEnabled ? "on" : "off"}
					</span>
				</div>
				<span class="card-action">Connect &rarr;</span>
			</GlassCard>
		</a>

		<!-- Content Card -->
		<a href="/arbor/settings/content" class="card-link">
			<GlassCard variant="frosted" hoverable>
				<div class="card-header">
					<natureIcons.flame class="card-icon" />
					<h2 class="card-title">Content</h2>
				</div>
				<div class="card-status">
					<span class="status-line">
						{data.customBlazeCount} custom blaze{data.customBlazeCount === 1 ? "" : "s"}
					</span>
					<span class="status-line">8 defaults</span>
					<span class="status-line">Up to 20 per grove</span>
				</div>
				<span class="card-action">Create &rarr;</span>
			</GlassCard>
		</a>

		<!-- Security Card -->
		<a href="/arbor/settings/security" class="card-link">
			<GlassCard variant="frosted" hoverable>
				<div class="card-header">
					<authIcons.shieldCheck class="card-icon" />
					<h2 class="card-title">Security</h2>
				</div>
				<div class="card-status">
					{#if loadingSessions}
						<Skeleton class="h-4 w-32" />
					{:else}
						<span class="status-line">
							{sessionCount !== null
								? `${sessionCount} active session${sessionCount === 1 ? "" : "s"}`
								: "Sessions unavailable"}
						</span>
					{/if}
					<span class="status-line">Passkey: manage on login hub</span>
				</div>
				<span class="card-action">Review &rarr;</span>
			</GlassCard>
		</a>
	</div>
</div>

<style>
	.settings-hub {
		max-width: 900px;
	}

	.page-header {
		margin-bottom: 2rem;
	}
	.page-header h1 {
		margin: 0 0 0.25rem 0;
		font-size: 2rem;
		color: var(--color-text);
	}
	.subtitle {
		margin: 0;
		color: var(--color-text-muted);
	}

	.settings-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
		gap: 1.5rem;
	}

	.card-link {
		text-decoration: none;
		color: inherit;
		display: block;
	}

	.card-header {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		margin-bottom: 0.75rem;
	}

	:global(.card-icon) {
		width: 1.25rem;
		height: 1.25rem;
		color: var(--user-accent, var(--color-primary));
		flex-shrink: 0;
	}

	.card-title {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--color-text);
	}

	.card-status {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin-bottom: 0.75rem;
	}

	.status-line {
		font-size: 0.85rem;
		color: var(--color-text-muted);
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.color-dot {
		display: inline-block;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		border: 1px solid var(--color-border);
		flex-shrink: 0;
	}

	.card-action {
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--user-accent, var(--color-primary));
	}

	@media (max-width: 700px) {
		.settings-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
