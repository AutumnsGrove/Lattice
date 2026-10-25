<script lang="ts">
	import { onMount } from "svelte";
	import GlassCard from "@autumnsgrove/lattice/ui/components/ui/GlassCard.svelte";
	import Skeleton from "@autumnsgrove/lattice/ui/components/ui/Skeleton.svelte";
	import {
		actionIcons,
		authIcons,
		chromeIcons,
		featureIcons,
		natureIcons,
		phaseIcons,
	} from "@autumnsgrove/prism/icons";
	import { FONT_PRESETS } from "@autumnsgrove/lattice/platform/config/presets";
	import { SEASON_LABELS, type Season } from "@autumnsgrove/lattice/ui/types/season";
	import { getSeasonFavicons, SEASON_THEME_COLORS } from "@autumnsgrove/lattice/ui/season-meta";
	import { api } from "@autumnsgrove/lattice/utils";

	let { data } = $props();

	// ── Parent layout data ──────────────────────────────────────────────────
	// Root layout provides: data.siteSettings, data.context, data.user
	// Arbor layout provides: data.tenant (id, subdomain, displayName)
	// Page server load provides: data.customBlazeCount
	const settings = $derived(data.siteSettings || {});
	const subdomain = $derived(data.tenant?.subdomain || "");
	const groveTitle = $derived(settings.grove_title || "");
	const avatarUrl = $derived(settings.avatar_url || null);
	const fontFamily = $derived(settings.font_family || "");
	const accentColor = $derived(settings.accent_color || "");
	const preferredSeason = $derived(settings.preferred_season || "");
	const curiosCount = $derived(data.curiosCount ?? 0);

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
	const displayAvatar = $derived(avatarUrl || data.user?.picture || null);
	const fontDef = $derived(FONT_PRESETS.find((f) => f.id === fontFamily));
	const fontName = $derived(fontDef?.name || "Lexend");
	const fontCssFamily = $derived(fontDef?.family || "");
	const seasonLabel = $derived(
		preferredSeason ? SEASON_LABELS[preferredSeason as Season] || "" : "follows the season",
	);
	const seasonFavicon = $derived(
		preferredSeason ? getSeasonFavicons(preferredSeason as Season).png32 : null,
	);
	const seasonColor = $derived(
		preferredSeason ? SEASON_THEME_COLORS[preferredSeason as Season] : null,
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
			<GlassCard variant="frosted" hoverable flush class="h-full flex flex-col">
				<div class="card-body">
					<div class="card-header">
						<chromeIcons.sliders class="card-icon" />
						<h2 class="card-title">Profile</h2>
					</div>
					<div class="profile-preview">
						<div class="avatar-thumb">
							{#if displayAvatar}
								<img src={displayAvatar} alt="" class="avatar-img" />
							{:else}
								<span class="avatar-initial">
									{subdomain?.[0]?.toUpperCase() || "?"}
								</span>
							{/if}
						</div>
						<div class="profile-info">
							<span class="profile-address">{subdomain}.grove.place</span>
							{#if groveTitle}
								<span class="profile-title">&ldquo;{groveTitle}&rdquo;</span>
							{:else}
								<span class="profile-title muted">no title yet</span>
							{/if}
						</div>
					</div>
					<span class="card-action">Edit profile &rarr;</span>
				</div>
			</GlassCard>
		</a>

		<!-- Appearance Card -->
		<a href="/arbor/settings/appearance" class="card-link">
			<GlassCard variant="frosted" hoverable flush class="h-full flex flex-col">
				<div class="card-body">
					<div class="card-header">
						<featureIcons.palette class="card-icon" />
						<h2 class="card-title">Appearance</h2>
					</div>
					<div class="appearance-preview">
						<div class="appearance-row">
							<span class="appear-label">Font</span>
							<span class="font-preview" style:font-family={fontCssFamily}>{fontName}</span>
						</div>
						<div class="appearance-row">
							<span class="appear-label">Accent</span>
							{#if accentColor}
								<span class="accent-swatch">
									<span class="accent-dot" style:background={accentColor} aria-hidden="true"></span>
									<span class="accent-hex">{accentColor}</span>
								</span>
							{:else}
								<span class="appear-value muted">Grove green</span>
							{/if}
						</div>
						<div class="appearance-row">
							<span class="appear-label">Season</span>
							<span class="season-preview">
								{#if seasonFavicon}
									<img
										src={seasonFavicon}
										alt=""
										aria-hidden="true"
										class="season-icon-sm"
										width="18"
										height="18"
									/>
								{/if}
								<span class="appear-value" style:color={seasonColor || "inherit"}>
									{seasonLabel}
								</span>
							</span>
						</div>
					</div>
					<span class="card-action">Customize &rarr;</span>
				</div>
			</GlassCard>
		</a>

		<!-- Content Card -->
		<a href="/arbor/settings/content" class="card-link">
			<GlassCard variant="frosted" hoverable flush class="h-full flex flex-col">
				<div class="card-body">
					<div class="card-header">
						<natureIcons.flame class="card-icon" />
						<h2 class="card-title">Content</h2>
					</div>
					<div class="card-status">
						<span class="status-line">
							<span class="count-highlight">
								{data.customBlazeCount}
							</span>
							custom blaze{data.customBlazeCount === 1 ? "" : "s"}
						</span>
						<span class="status-line subtle">8 defaults included</span>
						<span class="status-line subtle">Up to 20 per grove</span>
					</div>
					<span class="card-action">Create &rarr;</span>
				</div>
			</GlassCard>
		</a>

		<!-- Security Card -->
		<a href="/arbor/settings/security" class="card-link">
			<GlassCard variant="frosted" hoverable flush class="h-full flex flex-col">
				<div class="card-body">
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
						<span class="status-line subtle">2FA managed on login hub</span>
					</div>
					<span class="card-action">Review &rarr;</span>
				</div>
			</GlassCard>
		</a>

		<!-- Features Card -->
		<a href="/arbor/settings/features" class="card-link">
			<GlassCard variant="frosted" hoverable flush class="h-full flex flex-col">
				<div class="card-body">
					<div class="card-header">
						<phaseIcons.sparkles class="card-icon" />
						<h2 class="card-title">Features</h2>
					</div>
					<div class="card-status">
						<span class="status-line">Rings &middot; Reeds</span>
						<span class="status-line">Curios</span>
						{#if curiosCount > 0}
							<span class="status-line subtle"
								>{curiosCount} curio{curiosCount === 1 ? "" : "s"} active</span
							>
						{/if}
					</div>
					<span class="card-action">Explore &rarr;</span>
				</div>
			</GlassCard>
		</a>

		<!-- Short Links Card -->
		<a href="/arbor/settings/links" class="card-link">
			<GlassCard variant="frosted" hoverable flush class="h-full flex flex-col">
				<div class="card-body">
					<div class="card-header">
						<actionIcons.link class="card-icon" />
						<h2 class="card-title">Short Links</h2>
					</div>
					<div class="card-status">
						<span class="status-line">Easy-to-share addresses for your grove</span>
						<span class="status-line subtle">link.grove.place</span>
					</div>
					<span class="card-action">Manage &rarr;</span>
				</div>
			</GlassCard>
		</a>

		<!-- Subscriptions Card -->
		<a href="/arbor/subscriptions" class="card-link">
			<GlassCard variant="frosted" hoverable flush class="h-full flex flex-col">
				<div class="card-body">
					<div class="card-header">
						<featureIcons.mail class="card-icon" />
						<h2 class="card-title">Subscriptions</h2>
					</div>
					<div class="card-status">
						<span class="status-line">Email updates from groves you follow</span>
						<span class="status-line subtle">Timezone &middot; schedule &middot; preferences</span>
					</div>
					<span class="card-action">Manage &rarr;</span>
				</div>
			</GlassCard>
		</a>

		<!-- Your Data Card -->
		<a href="/arbor/export" class="card-link">
			<GlassCard variant="frosted" hoverable flush class="h-full flex flex-col">
				<div class="card-body">
					<div class="card-header">
						<featureIcons.archive class="card-icon" />
						<h2 class="card-title">Your Data</h2>
					</div>
					<div class="card-status">
						<span class="status-line">You own everything you create</span>
						<span class="status-line subtle">Export anytime &mdash; no lock-in</span>
					</div>
					<span class="card-action">Export &rarr;</span>
				</div>
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
		height: 100%;
	}

	/* GlassCard needs full height to fill the grid cell */
	.card-link > :global(:first-child) {
		height: 100%;
	}

	.card-body {
		display: flex;
		flex-direction: column;
		padding: 1rem 1.5rem;
		height: 100%;
	}

	/* ── Card header ──────────────────────────────────────────────────────── */
	.card-header {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		margin-bottom: 1rem;
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

	/* ── Card action link ─────────────────────────────────────────────────── */
	.card-action {
		display: inline-block;
		margin-top: auto;
		padding-top: 1rem;
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--user-accent, var(--color-primary));
	}

	/* ── Profile card ─────────────────────────────────────────────────────── */
	.profile-preview {
		display: flex;
		align-items: center;
		gap: 0.875rem;
	}

	.avatar-thumb {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		overflow: hidden;
		flex-shrink: 0;
		background: var(--color-surface-elevated, var(--color-surface));
		border: 2px solid var(--color-border);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.avatar-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.avatar-initial {
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--user-accent, var(--color-primary));
		text-transform: uppercase;
	}

	.profile-info {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
	}

	.profile-address {
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--color-text);
	}

	.profile-title {
		font-size: 0.8rem;
		color: var(--color-text-muted);
		font-style: italic;
	}

	.profile-title.muted {
		font-style: normal;
		opacity: 0.6;
	}

	/* ── Appearance card ──────────────────────────────────────────────────── */
	.appearance-preview {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.appearance-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.appear-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		width: 3.5rem;
		flex-shrink: 0;
	}

	.appear-value {
		font-size: 0.85rem;
		color: var(--color-text);
	}

	.appear-value.muted {
		color: var(--color-text-muted);
	}

	.font-preview {
		font-size: 0.95rem;
		color: var(--color-text);
		line-height: 1.2;
	}

	.accent-swatch {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.accent-dot {
		display: inline-block;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		border: 1.5px solid rgba(255, 255, 255, 0.15);
		flex-shrink: 0;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
	}

	.accent-hex {
		font-size: 0.8rem;
		font-family: monospace;
		color: var(--color-text-muted);
	}

	.season-preview {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.season-icon-sm {
		image-rendering: pixelated;
		flex-shrink: 0;
	}

	/* ── Generic status lines (Content, Security) ─────────────────────────── */
	.card-status {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.status-line {
		font-size: 0.85rem;
		color: var(--color-text-muted);
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.status-line.subtle {
		font-size: 0.8rem;
		opacity: 0.65;
	}

	.count-highlight {
		font-weight: 600;
		color: var(--user-accent, var(--color-primary));
		font-size: 1rem;
	}

	/* ── Responsive ───────────────────────────────────────────────────────── */
	@media (max-width: 700px) {
		.settings-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
