<script lang="ts">
	/**
	 * Vista - Infrastructure Monitoring Dashboard
	 *
	 * Enhanced placeholder page for the monitor.grove.place app.
	 * Vista provides a "single pane of glass" for all Grove services:
	 * - Real-time metrics (requests, errors, latency)
	 * - 90-day historical data
	 * - GitHub-style uptime grids
	 * - Smart alerting via email
	 *
	 * Full implementation: docs/specs/vista-spec.md
	 */
	import GlassCard from "$lib/ui/components/ui/GlassCard.svelte";
	import { Activity, Bell, TrendingUp, HandCoins } from "lucide-svelte";
</script>

<svelte:head>
	<title>Vista | Grove Infrastructure Monitoring</title>
	<meta name="description" content="Infrastructure monitoring dashboard for Grove services." />
</svelte:head>

<div class="vista-placeholder">
	<GlassCard gossamer="grove-mist" gossamerOpacity={0.15} class="main-card">
		<!-- Logo & Title -->
		<div class="header">
			<div class="logo">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="icon"
					aria-hidden="true"
				>
					<!-- Eye icon representing "vista" (view) -->
					<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
					<circle cx="12" cy="12" r="3" />
				</svg>
			</div>
			<h1>Vista</h1>
			<p class="subtitle">Infrastructure Monitoring Dashboard</p>
		</div>

		<!-- Feature Preview Grid -->
		<div class="features">
			<div class="feature">
				<span class="feature-icon" aria-hidden="true">
					<Activity class="w-6 h-6" />
				</span>
				<div class="feature-text">
					<span class="feature-title">Real-time Metrics</span>
					<span class="feature-desc">Requests, errors, latency (p50/p95/p99)</span>
				</div>
			</div>

			<div class="feature">
				<span class="feature-icon" aria-hidden="true">
					<Bell class="w-6 h-6" />
				</span>
				<div class="feature-text">
					<span class="feature-title">Smart Alerting</span>
					<span class="feature-desc">Email notifications when things go wrong</span>
				</div>
			</div>

			<div class="feature">
				<span class="feature-icon" aria-hidden="true">
					<TrendingUp class="w-6 h-6" />
				</span>
				<div class="feature-text">
					<span class="feature-title">90-Day History</span>
					<span class="feature-desc">GitHub-style uptime contribution grids</span>
				</div>
			</div>

			<div class="feature">
				<span class="feature-icon" aria-hidden="true">
					<HandCoins class="w-6 h-6" />
				</span>
				<div class="feature-text">
					<span class="feature-title">Cost Tracking</span>
					<span class="feature-desc">Per-resource usage and cost breakdown</span>
				</div>
			</div>
		</div>

		<!-- Service Preview -->
		<!-- Infrastructure counts snapshot from 2026-01-19. Update periodically as Grove grows. -->
		<div class="services-preview">
			<p class="services-label">Monitoring Grove infrastructure:</p>
			<div class="service-badges">
				<span class="badge">9 Workers</span>
				<span class="badge">9 D1 Databases</span>
				<span class="badge">6 R2 Buckets</span>
				<span class="badge">7 KV Namespaces</span>
			</div>
		</div>

		<!-- Timeline -->
		<div class="timeline">
			<span class="timeline-badge">Coming Soon</span>
		</div>

		<!-- Status Link -->
		<div class="status-link">
			<p>In the meantime, check our public status page:</p>
			<a href="https://status.grove.place" class="link" target="_blank" rel="noopener noreferrer">
				status.grove.place
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="external-icon"
					aria-hidden="true"
				>
					<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
					<polyline points="15 3 21 3 21 9" />
					<line x1="10" x2="21" y1="14" y2="3" />
				</svg>
			</a>
		</div>
	</GlassCard>
</div>

<style>
	/*
	 * CSS Custom Properties Reference:
	 * --color-bg-primary, --color-bg-secondary: Defined in engine's global CSS (app.css)
	 * --color-text-primary, --color-text-muted: Theme text colors from Tailwind preset
	 * --color-accent: Grove green accent (#2c5f2d) from theme
	 * --color-border: Border color from theme
	 *
	 * Fallback values ensure the page renders correctly even if loaded standalone.
	 */
	.vista-placeholder {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		background: linear-gradient(
			135deg,
			var(--color-bg-primary, #fafafa) 0%,
			var(--color-bg-secondary, #f0f0f0) 100%
		);
	}

	:global(.dark) .vista-placeholder {
		background: linear-gradient(
			135deg,
			var(--color-bg-primary, #1a1a2e) 0%,
			var(--color-bg-secondary, #16213e) 100%
		);
	}

	:global(.main-card) {
		max-width: 600px;
		width: 100%;
	}

	.header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.logo {
		display: flex;
		justify-content: center;
		margin-bottom: 1rem;
	}

	.icon {
		width: 4rem;
		height: 4rem;
		color: var(--color-accent, #2c5f2d);
	}

	h1 {
		font-size: 2.5rem;
		font-weight: 700;
		color: var(--color-text-primary, #1a1a1a);
		margin: 0 0 0.5rem 0;
		letter-spacing: -0.02em;
	}

	:global(.dark) h1 {
		color: var(--color-text-primary, #f5f5f5);
	}

	.subtitle {
		font-size: 1.1rem;
		color: var(--color-text-muted, #666);
		margin: 0;
	}

	.features {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
		margin-bottom: 2rem;
	}

	@media (max-width: 500px) {
		.features {
			grid-template-columns: 1fr;
		}
	}

	.feature {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 1rem;
		border-radius: 0.75rem;
		background: var(--color-bg-secondary, rgba(255, 255, 255, 0.5));
		border: 1px solid var(--color-border, rgba(0, 0, 0, 0.08));
	}

	:global(.dark) .feature {
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.1);
	}

	.feature-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-accent, #2c5f2d);
	}

	.feature-text {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.feature-title {
		font-weight: 600;
		font-size: 0.95rem;
		color: var(--color-text-primary, #1a1a1a);
	}

	:global(.dark) .feature-title {
		color: var(--color-text-primary, #f5f5f5);
	}

	.feature-desc {
		font-size: 0.85rem;
		color: var(--color-text-muted, #666);
	}

	.services-preview {
		text-align: center;
		margin-bottom: 1.5rem;
		padding: 1rem;
		border-radius: 0.75rem;
		background: var(--color-bg-secondary, rgba(255, 255, 255, 0.3));
	}

	:global(.dark) .services-preview {
		background: rgba(255, 255, 255, 0.03);
	}

	.services-label {
		font-size: 0.9rem;
		color: var(--color-text-muted, #666);
		margin: 0 0 0.75rem 0;
	}

	.service-badges {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.5rem;
	}

	.badge {
		display: inline-block;
		padding: 0.35rem 0.75rem;
		font-size: 0.8rem;
		font-weight: 500;
		border-radius: 9999px;
		background: var(--color-accent, #2c5f2d);
		color: white;
	}

	.timeline {
		text-align: center;
		margin-bottom: 1.5rem;
	}

	.timeline-badge {
		display: inline-block;
		padding: 0.5rem 1.25rem;
		font-size: 0.9rem;
		font-weight: 600;
		border-radius: 9999px;
		background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
		color: white;
		box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
	}

	.status-link {
		text-align: center;
		padding-top: 1rem;
		border-top: 1px solid var(--color-border, rgba(0, 0, 0, 0.08));
	}

	:global(.dark) .status-link {
		border-top-color: rgba(255, 255, 255, 0.1);
	}

	.status-link p {
		font-size: 0.9rem;
		color: var(--color-text-muted, #666);
		margin: 0 0 0.5rem 0;
	}

	.link {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-weight: 600;
		color: var(--color-accent, #2c5f2d);
		text-decoration: none;
		transition: opacity 0.2s;
	}

	.link:hover {
		opacity: 0.8;
		text-decoration: underline;
	}

	.external-icon {
		width: 1rem;
		height: 1rem;
	}

	/* Accessibility: Respect reduced motion preferences */
	@media (prefers-reduced-motion: reduce) {
		.link {
			transition: none;
		}

		/*
		 * Note: Gossamer mist animation is handled by GlassCard component,
		 * which respects prefers-reduced-motion internally.
		 */
	}
</style>
