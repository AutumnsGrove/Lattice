<!--
  FeatureCard.svelte
  Card component for showcasing individual features

  Usage:
  <FeatureCard
    title="Storage Overview"
    description="See usage across posts and media"
    status="ready"
    icon="HardDrive"
  >
    <DemoComponent slot="demo" />
  </FeatureCard>
-->
<script lang="ts">
	import type { FeatureCardProps } from "../../types/index.js";
	import type { Snippet, Component } from "svelte";
	import StatusBadge from "./StatusBadge.svelte";
	import * as icons from "lucide-svelte";

	interface Props extends FeatureCardProps {
		demo?: Snippet;
	}

	let { title, description, status, icon, demo }: Props = $props();

	const IconComponent = $derived(
		icon && icon in icons ? (icons as unknown as Record<string, Component>)[icon] : null,
	);
</script>

<article class="feature-card" data-status={status}>
	<div class="card-header">
		{#if IconComponent}
			<div class="feature-icon">
				<IconComponent size={24} />
			</div>
		{/if}
		<div class="feature-status">
			<StatusBadge {status} />
		</div>
	</div>

	<div class="feature-content">
		<h3 class="feature-title">{title}</h3>
		<p class="feature-description">{description}</p>
	</div>

	{#if demo}
		<div class="feature-demo">
			{@render demo()}
		</div>
	{/if}
</article>

<style>
	.feature-card {
		background: var(--color-surface, rgba(255, 255, 255, 0.5));
		backdrop-filter: blur(12px);
		border: 1px solid var(--color-border-subtle, rgba(0, 0, 0, 0.08));
		border-radius: 1rem;
		padding: 1.5rem;
		transition:
			transform 0.3s ease,
			box-shadow 0.3s ease,
			border-color 0.3s ease;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.feature-card:hover {
		transform: translateY(-4px);
		box-shadow: var(--shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.1));
		border-color: var(--color-primary, #16a34a);
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	.feature-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 3rem;
		height: 3rem;
		background: var(--color-accent-bg, #f0fdf4);
		border-radius: 0.75rem;
		color: var(--color-primary, #16a34a);
	}

	.feature-status {
		flex-shrink: 0;
	}

	.feature-content {
		flex: 1;
	}

	.feature-title {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-foreground, #292524);
		margin: 0 0 0.5rem;
	}

	.feature-description {
		font-size: 0.9375rem;
		color: var(--color-foreground-muted, rgba(61, 41, 20, 0.7));
		margin: 0;
		line-height: 1.6;
	}

	.feature-demo {
		margin-top: 0.5rem;
		padding-top: 1rem;
		border-top: 1px solid var(--color-border-subtle, rgba(0, 0, 0, 0.08));
	}

	@media (prefers-reduced-motion: reduce) {
		.feature-card {
			transition: none;
		}
		.feature-card:hover {
			transform: none;
		}
	}
</style>
