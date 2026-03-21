<script lang="ts">
	import InternalsPostViewer from "@autumnsgrove/lattice/components/custom/InternalsPostViewer.svelte";
	import Button from "@autumnsgrove/lattice/ui/components/ui/Button.svelte";
	import GlassCard from "@autumnsgrove/lattice/ui/components/ui/GlassCard.svelte";
	import GroveTerm from "@autumnsgrove/lattice/components/terminology/GroveTerm.svelte";
	import FollowButton from "@autumnsgrove/lattice/ui/components/chrome/FollowButton.svelte";
	import ShareButton from "@autumnsgrove/lattice/ui/components/chrome/ShareButton.svelte";

	let { data } = $props();

	// Show follow button when a logged-in visitor is on someone else's grove
	const showFollow = $derived(data.user && !data.isOwner && data.context?.type === "tenant");
	// Show share button for the grove owner
	const showShare = $derived(data.isOwner);
</script>

<svelte:head>
	<title
		>{data.title}{data.context?.type === "tenant" ? ` - ${data.context.tenant.name}` : ""}</title
	>
	<meta name="description" content={data.description || ""} />
</svelte:head>

{#if data.needsSetup}
	<div class="setup-page">
		<div class="setup-content">
			<div class="setup-icon">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="64"
					height="64"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
				</svg>
			</div>
			<h1>Welcome to {data.tenantName}</h1>
			<p class="setup-subtitle">Your new grove is ready to be set up!</p>
			<p class="setup-description">
				Sign in to the <GroveTerm term="arbor" standard="dashboard">admin panel</GroveTerm> to create
				your first post, customize your theme, and make this space your own.
			</p>
			<div class="setup-actions">
				<Button href="/arbor" variant="default" size="lg">Set Up Your Grove</Button>
			</div>
			<p class="setup-hint">You'll be asked to sign in with your Grove account to continue.</p>
		</div>
	</div>
{:else if data.hero}
	<GlassCard variant="muted" as="section" class="hero" hoverable={false} gossamer="ambient-clouds">
		<div class="hero-inner">
			<h1 class="hero-title">{data.hero.title}</h1>
			{#if data.hero.subtitle}
				<p class="hero-subtitle">{data.hero.subtitle}</p>
			{/if}
			{#if data.hero.cta || showFollow || showShare}
				<div class="hero-actions">
					{#if data.hero.cta}
						<Button href={data.hero.cta.link} variant="default" size="lg"
							>{data.hero.cta.text}</Button
						>
					{/if}
					{#if showFollow && data.context?.type === "tenant"}
						<FollowButton
							tenantId={data.context.tenant.id}
							subdomain={data.context.tenant.subdomain}
							name={data.context.tenant.name}
						/>
					{/if}
					{#if showShare && data.context?.type === "tenant"}
						<ShareButton title={data.context.tenant.name} />
					{/if}
				</div>
			{/if}
		</div>
	</GlassCard>
{/if}

{#if data.content}
	<div class="intro">
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- server-sanitized HTML content -->
		{@html data.content}
	</div>
{/if}

{#if data.latestPost}
	<section class="latest-post-section">
		<h2 class="section-title">Fresh from the garden</h2>
		<InternalsPostViewer post={data.latestPost} />
	</section>
{:else if !data.needsSetup}
	<section class="latest-post-section">
		<GlassCard variant="muted" as="aside" class="empty-garden">
			<p class="empty-garden-text">
				The garden is quiet for now — check back soon, or wander through the rest of this grove.
			</p>
		</GlassCard>
	</section>
{/if}

<style>
	/* Setup flow — new grove with no content */
	.setup-page {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 60vh;
		padding: 2rem;
	}
	.setup-content {
		text-align: center;
		max-width: 500px;
	}
	.setup-icon {
		color: var(--color-primary);
		margin-bottom: 1.5rem;
		transition: color 0.3s ease;
	}
	.setup-page h1 {
		font-size: 2rem;
		color: var(--color-text);
		margin: 0 0 0.5rem 0;
		transition: color 0.3s ease;
	}
	.setup-subtitle {
		font-size: 1.25rem;
		color: var(--color-primary);
		margin: 0 0 1.5rem 0;
		font-weight: 500;
		transition: color 0.3s ease;
	}
	.setup-description {
		font-size: 1rem;
		color: var(--color-text-muted);
		line-height: 1.6;
		margin: 0 0 2rem 0;
		transition: color 0.3s ease;
	}
	.setup-actions {
		margin-bottom: 1.5rem;
	}
	.setup-hint {
		font-size: 0.875rem;
		color: var(--color-text-muted);
		margin: 0;
		opacity: 0.8;
		transition: color 0.3s ease;
	}

	/* Hero section — Glass-based, accent-aware */
	:global(.hero) {
		margin-bottom: 3rem;
	}
	.hero-inner {
		text-align: center;
		padding: 3rem 2rem;
	}
	.hero-title {
		font-size: 3rem;
		margin: 0 0 1rem 0;
		color: var(--color-text);
		transition: color 0.3s ease;
	}
	.hero-subtitle {
		font-size: 1.25rem;
		color: var(--color-text-muted);
		margin: 0 0 2rem 0;
		max-width: 600px;
		margin-inline: auto;
		line-height: 1.6;
		transition: color 0.3s ease;
	}
	.hero-actions {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	/* Content area — user's custom home page content */
	.intro {
		max-width: 700px;
		margin: 0 auto;
	}
	.intro :global(h2) {
		color: var(--color-text);
		margin-bottom: 1rem;
		transition: color 0.3s ease;
	}
	.intro :global(p) {
		font-size: 1.1rem;
		color: var(--color-text-muted);
		line-height: 1.8;
		transition: color 0.3s ease;
	}

	/* Latest post / empty garden section */
	.latest-post-section {
		max-width: 700px;
		margin: 3rem auto 0;
	}
	.section-title {
		font-size: 1.5rem;
		color: var(--color-primary);
		margin-bottom: 1.25rem;
		padding-bottom: 0.5rem;
		border-bottom: 2px solid var(--grove-border-subtle);
		transition:
			color 0.3s ease,
			border-color 0.3s ease;
	}
	:global(.dark) .section-title {
		color: var(--color-primary-light);
		border-bottom-color: var(--grove-border-subtle);
	}

	/* Empty garden state */
	:global(.empty-garden) {
		text-align: center;
		padding: 2.5rem 2rem;
	}
	.empty-garden-text {
		margin: 0;
		font-size: 1rem;
		color: var(--color-text-muted);
		line-height: 1.7;
		font-style: italic;
	}

	@media (max-width: 768px) {
		.hero-title {
			font-size: 2rem;
		}
		.hero-inner {
			padding: 2rem 1rem;
		}
		.hero-subtitle {
			font-size: 1rem;
		}
		.latest-post-section {
			margin: 2rem 1rem 0;
		}
		.section-title {
			font-size: 1.25rem;
		}
	}
</style>
