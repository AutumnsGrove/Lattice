<script lang="ts">
	import {
		VineyardLayout,
		FeatureCard,
		StatusBadge,
		DemoContainer,
		CodeExample,
		RoadmapSection
	} from '$lib/vineyard';
	import { Grape, Layout, CreditCard, Code, Lock, Map, Sparkles } from 'lucide-svelte';
</script>

<VineyardLayout tool="foliage" tagline="Where Grove tools bloom" status="preview">
	<!-- Introduction -->
	<section class="intro">
		<p class="lead">
			Vineyard is the documentation and demo pattern for the Grove ecosystem. Each tool gets its
			own <code>/vineyard</code> route — a consistent, discoverable way to explore what each tool does,
			how it works, and where it's headed.
		</p>
	</section>

	<!-- Components Section -->
	<section class="components">
		<h2>Components</h2>
		<p class="section-desc">
			These shared components create consistent showcase pages across all Grove tools.
		</p>

		<div class="grid">
			<FeatureCard
				title="VineyardLayout"
				description="Main page wrapper with hero section, tool branding, and related tools footer."
				status="ready"
				icon="Layout"
			/>
			<FeatureCard
				title="FeatureCard"
				description="Showcase individual features with icons, status badges, and optional demo slots."
				status="ready"
				icon="CreditCard"
			/>
			<FeatureCard
				title="StatusBadge"
				description="Consistent status indicators: Ready, Preview, Demo, Coming Soon, In Development."
				status="ready"
				icon="Sparkles"
			/>
			<FeatureCard
				title="DemoContainer"
				description="Wrapper for interactive demos with mock data indicator and visual styling."
				status="ready"
				icon="Code"
			/>
			<FeatureCard
				title="CodeExample"
				description="Syntax-highlighted code blocks with copy-to-clipboard functionality."
				status="ready"
				icon="Code"
			/>
			<FeatureCard
				title="TierGate"
				description="Tier-based access control with blur preview and upgrade prompts."
				status="ready"
				icon="Lock"
			/>
			<FeatureCard
				title="RoadmapSection"
				description="Visual timeline showing built, in-progress, and planned features."
				status="ready"
				icon="Map"
			/>
		</div>
	</section>

	<!-- Status Badges Demo -->
	<section class="badges-demo">
		<h2>Status Badges</h2>
		<DemoContainer title="All Status Types" description="Visual indicators for feature readiness">
			<div class="badge-row">
				<StatusBadge status="ready" />
				<StatusBadge status="preview" />
				<StatusBadge status="demo" />
				<StatusBadge status="coming-soon" />
				<StatusBadge status="in-development" />
			</div>
		</DemoContainer>
	</section>

	<!-- Code Example -->
	<section class="code-section">
		<h2>Quick Start</h2>
		<CodeExample language="svelte" filename="src/routes/vineyard/+page.svelte">
			{`<script>
  import {
    VineyardLayout,
    FeatureCard,
    StatusBadge
  } from '$lib/vineyard';
</script>

<VineyardLayout
  tool="amber"
  tagline="Your files, preserved"
  status="preview"
>
  <FeatureCard
    title="Storage Overview"
    description="See usage across posts and media"
    status="ready"
    icon="HardDrive"
  />
</VineyardLayout>`}
		</CodeExample>
	</section>

	<!-- Available Vineyards -->
	<section class="vineyards">
		<h2>Grove Vineyards</h2>
		<p class="section-desc">
			Explore what each Grove tool offers through their dedicated Vineyard pages.
		</p>

		<div class="vineyard-grid">
			<a href="https://amber.grove.place/vineyard" class="vineyard-link">
				<span class="vineyard-name">Amber</span>
				<span class="vineyard-tagline">File storage</span>
				<StatusBadge status="coming-soon" />
			</a>
			<a href="https://ivy.grove.place/vineyard" class="vineyard-link">
				<span class="vineyard-name">Ivy</span>
				<span class="vineyard-tagline">Email client</span>
				<StatusBadge status="coming-soon" />
			</a>
			<a href="https://foliage.grove.place/vineyard" class="vineyard-link">
				<span class="vineyard-name">Foliage</span>
				<span class="vineyard-tagline">Theming system</span>
				<StatusBadge status="coming-soon" />
			</a>
			<a href="https://meadow.grove.place/vineyard" class="vineyard-link">
				<span class="vineyard-name">Meadow</span>
				<span class="vineyard-tagline">Social layer</span>
				<StatusBadge status="coming-soon" />
			</a>
			<a href="https://heartwood.grove.place/vineyard" class="vineyard-link">
				<span class="vineyard-name">Heartwood</span>
				<span class="vineyard-tagline">Authentication</span>
				<StatusBadge status="coming-soon" />
			</a>
			<a href="https://forage.grove.place/vineyard" class="vineyard-link">
				<span class="vineyard-name">Forage</span>
				<span class="vineyard-tagline">Domain discovery</span>
				<StatusBadge status="coming-soon" />
			</a>
		</div>
	</section>

	<!-- Roadmap -->
	<RoadmapSection
		built={[
			'Core component library (7 components)',
			'Grove glassmorphism design system',
			'Lexend typography',
			'Responsive layouts',
			'Copy-to-clipboard for code blocks',
			'Status badge animations'
		]}
		inProgress={['vineyard.grove.place showcase site', 'Integration guides for Grove tools']}
		planned={[
			'Amber Vineyard page',
			'Foliage Vineyard page',
			'Storybook component preview',
			'Unit test coverage',
			'Accessibility improvements'
		]}
	/>
</VineyardLayout>

<style>
	section {
		margin-bottom: 4rem;
	}

	h2 {
		font-size: 1.75rem;
		font-weight: 600;
		color: var(--grove-stone-800);
		margin: 0 0 0.5rem;
	}

	.section-desc {
		color: #78716c;
		margin: 0 0 1.5rem;
	}

	.intro {
		text-align: center;
		max-width: 48rem;
		margin: 0 auto 4rem;
	}

	.lead {
		font-size: 1.125rem;
		line-height: 1.8;
		color: var(--grove-stone-800);
	}

	.lead code {
		background: var(--grove-amber-100);
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		font-family: ui-monospace, monospace;
		font-size: 0.9em;
		color: var(--grove-amber-600);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1.5rem;
	}

	.badge-row {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		justify-content: center;
	}

	.code-section {
		max-width: 48rem;
		margin-left: auto;
		margin-right: auto;
	}

	.vineyard-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	.vineyard-link {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1.25rem;
		background: rgba(255, 251, 235, 0.7);
		border: 1px solid rgba(245, 158, 11, 0.2);
		border-radius: 0.75rem;
		text-decoration: none;
		transition: all 0.2s ease;
	}

	.vineyard-link:hover {
		background: var(--grove-amber-100);
		border-color: var(--grove-amber-500);
		transform: translateY(-2px);
	}

	.vineyard-name {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--grove-stone-800);
	}

	.vineyard-tagline {
		font-size: 0.875rem;
		color: #78716c;
	}

	@media (max-width: 640px) {
		h2 {
			font-size: 1.5rem;
		}

		.lead {
			font-size: 1rem;
		}
	}
</style>
