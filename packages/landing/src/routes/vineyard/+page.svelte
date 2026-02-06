<script lang="ts">
	import SEO from '$lib/components/SEO.svelte';

	// Lucide Icons
	import {
		Sparkles,
		TreePine as TreeIcon,
		Palette,
		Type,
		Eye,
		ChevronDown
	} from 'lucide-svelte';

	// Import Glass components
	import {
		Glass,
		GlassButton,
		GlassCard,
		GlassLogo,
		GlassOverlay,
		GlassCarousel,
		GroveTerm,
		GroveIntro,
	} from '@autumnsgrove/groveengine/ui';

	// Import nature assets
	import {
		Logo,
		TreePine, TreeCherry, TreeAspen, TreeBirch,
		Mushroom, MushroomCluster, Fern, Bush, GrassTuft, Rock, Stump, Log,
		FlowerWild, Tulip, Crocus, Daffodil,
		Firefly, Butterfly, Bird, BirdFlying, Cardinal, Chickadee, Robin, Bluebird,
		Bee, Rabbit, Deer, Owl, Squirrel,
		Cloud, CloudWispy, Sun, Moon, Star, StarCluster, StarShooting, Rainbow,
		Pond, LilyPad, Reeds, Stream,
		Leaf, LeafFalling, PetalFalling, Acorn, PineCone, Berry, DandelionPuff, Vine,
		Lattice as LatticeStructure, LatticeWithVine, Birdhouse, GardenGate, FencePost, StonePath, Bridge, Lantern,
		greens, bark, earth, natural, autumn, pinks, autumnReds, spring, springBlossoms, winter, midnightBloom
	} from '@autumnsgrove/groveengine/ui/nature';

	// Import typography components
	import {
		FontProvider,
		Lexend, Atkinson, OpenDyslexic,
		Quicksand, PlusJakartaSans,
		IBMPlexMono, Cozette,
		Alagard, Calistoga, Caveat,
		fonts,
		type FontId,
	} from '@autumnsgrove/groveengine/ui/typography';

	// Typography state
	let selectedFont = $state<FontId>('lexend');

	// Glass component demos state
	let glassVariant = $state<'surface' | 'overlay' | 'card' | 'tint' | 'accent' | 'muted'>('card');
	let glassIntensity = $state<'none' | 'light' | 'medium' | 'strong'>('medium');
	let logoSeason = $state<'spring' | 'summer' | 'autumn' | 'winter'>('summer');

	// Gossamer state
	type GossamerPreset = 'grove-mist' | 'grove-fireflies' | 'grove-rain' | 'grove-dew' | 'winter-snow' | 'autumn-leaves' | 'spring-petals' | 'summer-heat' | 'ambient-static' | 'ambient-waves' | 'ambient-clouds';
	let glassGossamerEnabled = $state(false);
	let glassGossamerPreset = $state<GossamerPreset>('grove-mist');

	const gossamerPresets: GossamerPreset[] = [
		'grove-mist', 'grove-fireflies', 'grove-rain', 'grove-dew',
		'winter-snow', 'autumn-leaves', 'spring-petals', 'summer-heat',
		'ambient-static', 'ambient-waves', 'ambient-clouds'
	];

	// Overlay demo state
	let showOverlayDemo = $state(false);

	// Nature asset viewer state
	import type { Component } from 'svelte';

	type AssetInfo = {
		component: Component<Record<string, unknown>>;
		category: string;
		props: string[];
	};

	// Component render error state
	let componentError = $state<string | null>(null);

	// Debounced color input state
	let colorInputTimeout: ReturnType<typeof setTimeout> | null = null;
	let pendingColorValues = $state<Record<string, string>>({});

	function debouncedColorUpdate(prop: string, value: string) {
		pendingColorValues[prop] = value;
		if (colorInputTimeout) clearTimeout(colorInputTimeout);
		colorInputTimeout = setTimeout(() => {
			if (isValidHexColor(value) || value === '') {
				propValues[prop] = value || undefined;
			}
		}, 150);
	}

	function isValidHexColor(value: string): boolean {
		return /^#[0-9A-Fa-f]{6}$/.test(value);
	}

	function getColorInputError(prop: string): string | null {
		const value = pendingColorValues[prop];
		if (!value || value === '') return null;
		if (!isValidHexColor(value)) return 'Use format: #RRGGBB';
		return null;
	}

	// Numeric prop ranges configuration
	const numericPropRanges: Record<string, { min: number; max: number; step: number }> = {
		opacity: { min: 0, max: 1, step: 0.1 },
	};

	function getNumericRange(prop: string) {
		return numericPropRanges[prop] ?? { min: 0, max: 100, step: 1 };
	}

	const assets: Record<string, AssetInfo> = {
		'Logo': { component: Logo, category: 'Trees', props: ['season', 'size', 'rotation', 'shadow', 'interactive', 'monochromeColor', 'monochromeTrunk'] },
		'GlassLogo': { component: GlassLogo, category: 'Trees', props: ['variant', 'season', 'size', 'rotation', 'shadow', 'interactive', 'accentColor', 'monochromeTrunk'] },
		'TreePine': { component: TreePine, category: 'Trees', props: ['color', 'trunkColor', 'season', 'animate'] },
		'TreeCherry': { component: TreeCherry, category: 'Trees', props: ['color', 'trunkColor', 'season', 'animate'] },
		'TreeAspen': { component: TreeAspen, category: 'Trees', props: ['color', 'trunkColor', 'season', 'animate'] },
		'TreeBirch': { component: TreeBirch, category: 'Trees', props: ['color', 'trunkColor', 'season', 'animate'] },
		'Mushroom': { component: Mushroom, category: 'Ground', props: ['capColor', 'stemColor', 'spotted'] },
		'MushroomCluster': { component: MushroomCluster, category: 'Ground', props: ['capColor', 'stemColor'] },
		'Fern': { component: Fern, category: 'Ground', props: ['color', 'season', 'animate'] },
		'Bush': { component: Bush, category: 'Ground', props: ['color', 'season', 'animate'] },
		'GrassTuft': { component: GrassTuft, category: 'Ground', props: ['color', 'season', 'animate'] },
		'Rock': { component: Rock, category: 'Ground', props: ['color', 'variant'] },
		'Stump': { component: Stump, category: 'Ground', props: ['barkColor', 'ringColor'] },
		'Log': { component: Log, category: 'Ground', props: ['barkColor'] },
		'FlowerWild': { component: FlowerWild, category: 'Ground', props: ['petalColor', 'centerColor', 'stemColor', 'animate'] },
		'Tulip': { component: Tulip, category: 'Ground', props: ['petalColor', 'stemColor', 'variant', 'animate'] },
		'Crocus': { component: Crocus, category: 'Ground', props: ['petalColor', 'centerColor', 'stemColor', 'variant', 'animate'] },
		'Daffodil': { component: Daffodil, category: 'Ground', props: ['petalColor', 'trumpetColor', 'stemColor', 'animate'] },
		'Firefly': { component: Firefly, category: 'Creatures', props: ['glowColor', 'bodyColor', 'animate', 'intensity'] },
		'Butterfly': { component: Butterfly, category: 'Creatures', props: ['wingColor', 'accentColor', 'animate'] },
		'Bird': { component: Bird, category: 'Creatures', props: ['bodyColor', 'breastColor', 'beakColor', 'animate', 'facing'] },
		'BirdFlying': { component: BirdFlying, category: 'Creatures', props: ['color', 'animate', 'facing'] },
		'Cardinal': { component: Cardinal, category: 'Creatures', props: ['bodyColor', 'maskColor', 'beakColor', 'animate', 'facing'] },
		'Chickadee': { component: Chickadee, category: 'Creatures', props: ['capColor', 'cheekColor', 'bodyColor', 'animate', 'facing'] },
		'Robin': { component: Robin, category: 'Creatures', props: ['bodyColor', 'breastColor', 'beakColor', 'animate', 'facing'] },
		'Bluebird': { component: Bluebird, category: 'Creatures', props: ['bodyColor', 'breastColor', 'beakColor', 'animate', 'facing'] },
		'Bee': { component: Bee, category: 'Creatures', props: ['bodyColor', 'stripeColor', 'animate'] },
		'Rabbit': { component: Rabbit, category: 'Creatures', props: ['furColor', 'animate', 'facing'] },
		'Deer': { component: Deer, category: 'Creatures', props: ['furColor', 'animate', 'facing'] },
		'Owl': { component: Owl, category: 'Creatures', props: ['featherColor', 'animate', 'facing'] },
		'Squirrel': { component: Squirrel, category: 'Creatures', props: ['furColor', 'animate', 'facing'] },
		'Cloud': { component: Cloud, category: 'Sky', props: ['color', 'animate', 'speed'] },
		'CloudWispy': { component: CloudWispy, category: 'Sky', props: ['color', 'animate', 'speed'] },
		'Sun': { component: Sun, category: 'Sky', props: ['color', 'rays', 'animate'] },
		'Moon': { component: Moon, category: 'Sky', props: ['color', 'phase', 'animate'] },
		'Star': { component: Star, category: 'Sky', props: ['color', 'animate', 'variant', 'speed'] },
		'StarCluster': { component: StarCluster, category: 'Sky', props: ['color', 'animate', 'density'] },
		'StarShooting': { component: StarShooting, category: 'Sky', props: ['color', 'animate', 'direction'] },
		'Rainbow': { component: Rainbow, category: 'Sky', props: ['opacity', 'animate'] },
		'Pond': { component: Pond, category: 'Water', props: ['color', 'animate'] },
		'LilyPad': { component: LilyPad, category: 'Water', props: ['padColor', 'flowerColor', 'hasFlower', 'animate'] },
		'Reeds': { component: Reeds, category: 'Water', props: ['color', 'season', 'animate', 'variant'] },
		'Stream': { component: Stream, category: 'Water', props: ['color', 'animate'] },
		'Leaf': { component: Leaf, category: 'Botanical', props: ['color', 'season', 'variant'] },
		'LeafFalling': { component: LeafFalling, category: 'Botanical', props: ['color', 'season', 'animate', 'variant'] },
		'PetalFalling': { component: PetalFalling, category: 'Botanical', props: ['color', 'variant', 'animate', 'opacity'] },
		'Acorn': { component: Acorn, category: 'Botanical', props: ['capColor', 'nutColor'] },
		'PineCone': { component: PineCone, category: 'Botanical', props: ['color'] },
		'Berry': { component: Berry, category: 'Botanical', props: ['berryColor', 'variant'] },
		'DandelionPuff': { component: DandelionPuff, category: 'Botanical', props: ['seedColor', 'animate'] },
		'Vine': { component: Vine, category: 'Botanical', props: ['color', 'season', 'animate', 'variant'] },
		'Lattice': { component: LatticeStructure, category: 'Structural', props: ['color', 'variant'] },
		'LatticeWithVine': { component: LatticeWithVine, category: 'Structural', props: ['woodColor', 'vineColor', 'season', 'hasFlowers'] },
		'Birdhouse': { component: Birdhouse, category: 'Structural', props: ['bodyColor', 'roofColor'] },
		'GardenGate': { component: GardenGate, category: 'Structural', props: ['color', 'open'] },
		'FencePost': { component: FencePost, category: 'Structural', props: ['color', 'variant'] },
		'StonePath': { component: StonePath, category: 'Structural', props: ['stoneColor'] },
		'Bridge': { component: Bridge, category: 'Structural', props: ['woodColor'] },
		'Lantern': { component: Lantern, category: 'Structural', props: ['frameColor', 'lit', 'animate', 'variant'] },
	};

	// Color presets
	const colorPresets = [
		{ name: 'Grove Green', value: greens.grove },
		{ name: 'Deep Green', value: greens.deepGreen },
		{ name: 'Meadow', value: greens.meadow },
		{ name: 'Autumn Amber', value: autumn.amber },
		{ name: 'Autumn Rust', value: autumn.rust },
		{ name: 'Gold', value: autumn.gold },
		{ name: 'Cherry Pink', value: pinks.blush },
		{ name: 'Warm Bark', value: bark.warmBark },
		{ name: 'Stone', value: earth.stone },
		{ name: 'Cream', value: natural.cream },
	];

	// Prop options
	const propOptions: Record<string, string[]> = {
		season: ['spring', 'summer', 'autumn', 'winter'],
		variant: ['default'],
		facing: ['left', 'right'],
		phase: ['full', 'waning', 'crescent', 'new'],
		speed: ['slow', 'normal', 'fast'],
		breathingSpeed: ['slow', 'normal', 'fast'],
		intensity: ['subtle', 'normal', 'bright'],
		density: ['sparse', 'normal', 'dense'],
		direction: ['left', 'right'],
	};

	const assetVariants: Record<string, string[]> = {
		'GlassLogo': ['default', 'accent', 'frosted', 'dark', 'ethereal'],
		'Rock': ['round', 'flat', 'jagged'],
		'Leaf': ['oak', 'maple', 'simple', 'aspen'],
		'LeafFalling': ['simple', 'maple'],
		'PetalFalling': ['round', 'pointed', 'heart', 'curled', 'tiny'],
		'Berry': ['cluster', 'single', 'branch'],
		'Vine': ['tendril', 'ivy', 'flowering'],
		'Reeds': ['cattail', 'grass'],
		'Star': ['twinkle', 'point', 'burst', 'classic', 'tiny'],
		'Lattice': ['trellis', 'fence', 'archway'],
		'FencePost': ['pointed', 'flat', 'round'],
		'Lantern': ['hanging', 'standing', 'post'],
		'Tulip': ['red', 'pink', 'yellow', 'purple'],
		'Crocus': ['purple', 'yellow', 'white'],
	};

	let selectedAsset = $state('Logo');
	let propValues = $state<Record<string, any>>({});

	const categories = [...new Set(Object.values(assets).map(a => a.category))];

	function getAssetsByCategory(category: string) {
		return Object.entries(assets).filter(([_, a]) => a.category === category);
	}

	function getCurrentAsset() {
		return assets[selectedAsset as keyof typeof assets];
	}

	function isColorProp(prop: string): boolean {
		return prop.toLowerCase().includes('color');
	}

	function isBooleanProp(prop: string): boolean {
		return ['animate', 'animateEntrance', 'breathing', 'spotted', 'rays', 'hasFlower', 'hasFlowers', 'lit', 'open'].includes(prop);
	}

	function hasOptions(prop: string): boolean {
		return prop in propOptions || (prop === 'variant' && selectedAsset in assetVariants);
	}

	function getOptions(prop: string): string[] {
		if (prop === 'variant' && selectedAsset in assetVariants) {
			return assetVariants[selectedAsset];
		}
		return propOptions[prop] || [];
	}

	function isNumericProp(prop: string): boolean {
		return ['opacity'].includes(prop);
	}

	function onAssetChange() {
		propValues = {};
	}

	let CurrentComponent = $derived(getCurrentAsset()?.component);

	// Carousel demo images
	const carouselImages = [
		{ url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" fill="%2310b981"%3E%3Crect width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="white" font-size="20"%3ESlide 1%3C/text%3E%3C/svg%3E', alt: 'Placeholder slide 1', caption: 'First slide caption' },
		{ url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" fill="%23059669"%3E%3Crect width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="white" font-size="20"%3ESlide 2%3C/text%3E%3C/svg%3E', alt: 'Placeholder slide 2', caption: 'Second slide caption' },
		{ url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" fill="%23047857"%3E%3Crect width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="white" font-size="20"%3ESlide 3%3C/text%3E%3C/svg%3E', alt: 'Placeholder slide 3', caption: 'Third slide caption' },
	];

	// Glass variants for interactive demo
	const glassVariants = ['surface', 'overlay', 'card', 'tint', 'accent', 'muted'] as const;
	const glassIntensities = ['none', 'light', 'medium', 'strong'] as const;
</script>

<SEO
	title="Vineyard — Lattice Asset Showcase"
	description="Explore the components and assets that Lattice provides. Glass UI components, nature SVGs, typography, and everything you need to build beautiful Grove experiences."
	url="https://grove.place/vineyard"
/>

<main class="max-w-6xl mx-auto px-6 py-12">
	<!-- Hero Section -->
	<section class="text-center mb-12">
		<h1 class="text-4xl font-bold text-[var(--color-foreground)] mb-3"><GroveTerm term="lattice">Lattice</GroveTerm> <GroveTerm term="vineyard">Vineyard</GroveTerm></h1>
		<GroveIntro term="vineyard" />
		<p class="text-lg text-[var(--color-foreground-muted)] max-w-2xl mx-auto">
			Every vine starts somewhere. This is where <GroveTerm term="your-grove">Grove's</GroveTerm> UI components grow,
			ready to be picked and planted throughout the ecosystem.
		</p>
	</section>

	<!-- Quick Nav (visible on mobile too) -->
	<nav class="flex flex-wrap justify-center gap-3 mb-12 sm:hidden">
		<a href="#glass" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[var(--color-foreground-muted)] hover:text-[var(--color-primary)] text-sm transition-colors">
			<Sparkles class="w-3.5 h-3.5" />
			Glass
		</a>
		<a href="#nature" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[var(--color-foreground-muted)] hover:text-[var(--color-primary)] text-sm transition-colors">
			<TreeIcon class="w-3.5 h-3.5" />
			Nature
		</a>
		<a href="#typography" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[var(--color-foreground-muted)] hover:text-[var(--color-primary)] text-sm transition-colors">
			<Type class="w-3.5 h-3.5" />
			Type
		</a>
		<a href="#palettes" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[var(--color-foreground-muted)] hover:text-[var(--color-primary)] text-sm transition-colors">
			<Palette class="w-3.5 h-3.5" />
			Palettes
		</a>
	</nav>

	<!-- Feature Overview -->
	<div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12">
		<div class="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-center">
			<Sparkles class="w-5 h-5 mx-auto mb-2 text-grove-600" />
			<p class="text-sm font-medium text-[var(--color-foreground)]">Glass Components</p>
			<p class="text-xs text-[var(--color-foreground-subtle)]">9 glassmorphism elements</p>
		</div>
		<div class="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-center">
			<TreeIcon class="w-5 h-5 mx-auto mb-2 text-grove-600" />
			<p class="text-sm font-medium text-[var(--color-foreground)]">Nature Assets</p>
			<p class="text-xs text-[var(--color-foreground-subtle)]">{Object.keys(assets).length} SVG components</p>
		</div>
		<div class="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-center">
			<Type class="w-5 h-5 mx-auto mb-2 text-grove-600" />
			<p class="text-sm font-medium text-[var(--color-foreground)]">Typography</p>
			<p class="text-xs text-[var(--color-foreground-subtle)]">10 curated fonts</p>
		</div>
		<div class="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-center">
			<Palette class="w-5 h-5 mx-auto mb-2 text-grove-600" />
			<p class="text-sm font-medium text-[var(--color-foreground)]">Color Palettes</p>
			<p class="text-xs text-[var(--color-foreground-subtle)]">12+ nature palettes</p>
		</div>
	</div>

	<!-- ═══════════════════════════════════════════════════════ -->
	<!-- GLASS COMPONENTS -->
	<!-- ═══════════════════════════════════════════════════════ -->
	<details id="glass" class="vineyard-section mb-8 scroll-mt-20" open>
		<summary class="section-header">
			<div class="flex items-center gap-3">
				<div class="p-2 rounded-lg bg-[var(--color-accent-bg)]">
					<Sparkles class="w-5 h-5 text-grove-600" />
				</div>
				<div>
					<h2 class="text-xl font-bold text-[var(--color-foreground)]">Glass Components</h2>
					<p class="text-sm text-[var(--color-foreground-muted)]">Frosted glassmorphism with that cozy Grove warmth</p>
				</div>
			</div>
			<ChevronDown class="w-5 h-5 text-[var(--color-foreground-subtle)] section-chevron" />
		</summary>

		<div class="section-content grid gap-6">
			<!-- Glass Base -->
			<div class="p-5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)]">
				<h3 class="text-lg font-semibold mb-4 flex items-center gap-2 text-[var(--color-foreground)]">
					<code class="text-sm px-2 py-1 rounded bg-[var(--color-accent-bg)] text-[var(--color-accent-text)]">&lt;Glass&gt;</code>
					<span class="text-sm font-normal text-[var(--color-foreground-muted)]">Base glass container</span>
				</h3>

				<div class="grid md:grid-cols-2 gap-6">
					<div class="bg-gradient-to-br from-grove-100 to-grove-200 dark:from-grove-900 dark:to-grove-800 rounded-xl p-8 flex items-center justify-center min-h-[200px]">
						<Glass
							variant={glassVariant}
							intensity={glassIntensity}
							gossamer={glassGossamerEnabled ? glassGossamerPreset : false}
							class="p-6 rounded-xl"
						>
							<p class="text-[var(--color-foreground)] font-medium">Glass content here</p>
							<p class="text-sm text-[var(--color-foreground-muted)] mt-1">With {glassVariant} variant</p>
						</Glass>
					</div>

					<div class="space-y-4">
						<div>
							<label for="glass-variant" class="block text-sm font-medium mb-2 text-[var(--color-foreground)]">Variant</label>
							<select id="glass-variant" bind:value={glassVariant} class="vine-select">
								{#each glassVariants as v}
									<option value={v}>{v}</option>
								{/each}
							</select>
						</div>
						<div>
							<label for="glass-intensity" class="block text-sm font-medium mb-2 text-[var(--color-foreground)]">Intensity</label>
							<select id="glass-intensity" bind:value={glassIntensity} class="vine-select">
								{#each glassIntensities as i}
									<option value={i}>{i}</option>
								{/each}
							</select>
						</div>
						<div>
							<label class="flex items-center gap-3 cursor-pointer">
								<input type="checkbox" bind:checked={glassGossamerEnabled} class="w-4 h-4 rounded" />
								<span class="text-sm text-[var(--color-foreground)]">Gossamer Effect</span>
							</label>
							{#if glassGossamerEnabled}
								<select bind:value={glassGossamerPreset} class="vine-select mt-2">
									{#each gossamerPresets as preset}
										<option value={preset}>{preset}</option>
									{/each}
								</select>
							{/if}
						</div>
					</div>
				</div>
			</div>

			<!-- GlassButton -->
			<div class="p-5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)]">
				<h3 class="text-lg font-semibold mb-4 text-[var(--color-foreground)]">
					<code class="text-sm px-2 py-1 rounded bg-[var(--color-accent-bg)] text-[var(--color-accent-text)]">&lt;GlassButton&gt;</code>
				</h3>
				<div class="flex flex-wrap gap-3">
					<GlassButton variant="default">Default</GlassButton>
					<GlassButton variant="accent">Accent</GlassButton>
					<GlassButton variant="dark">Dark</GlassButton>
					<GlassButton variant="ghost">Ghost</GlassButton>
					<GlassButton variant="outline">Outline</GlassButton>
				</div>
				<div class="flex flex-wrap gap-3 mt-4">
					<GlassButton size="sm">Small</GlassButton>
					<GlassButton size="md">Medium</GlassButton>
					<GlassButton size="lg">Large</GlassButton>
					<GlassButton disabled>Disabled</GlassButton>
				</div>
			</div>

			<!-- GlassCard + GlassOverlay -->
			<div class="p-5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)]">
				<h3 class="text-lg font-semibold mb-4 text-[var(--color-foreground)]">
					<code class="text-sm px-2 py-1 rounded bg-[var(--color-accent-bg)] text-[var(--color-accent-text)]">&lt;GlassCard&gt;</code>
					&amp;
					<code class="text-sm px-2 py-1 rounded bg-[var(--color-accent-bg)] text-[var(--color-accent-text)]">&lt;GlassOverlay&gt;</code>
				</h3>
				<div class="grid md:grid-cols-3 gap-4 mb-4">
					<GlassCard title="Default" hoverable>
						<p class="text-sm text-[var(--color-foreground-muted)]">A warm, inviting card.</p>
					</GlassCard>
					<GlassCard title="Accent" variant="accent" hoverable>
						<p class="text-sm text-[var(--color-foreground-muted)]">With grove accent tones.</p>
					</GlassCard>
					<GlassCard title="Frosted" variant="frosted" hoverable>
						<p class="text-sm text-[var(--color-foreground-muted)]">Maximum frost effect.</p>
					</GlassCard>
				</div>
				<GlassButton onclick={() => showOverlayDemo = true}>
					<Eye class="w-4 h-4" />
					Show Overlay Demo
				</GlassButton>
			</div>

			<!-- GlassCarousel -->
			<div class="p-5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)]">
				<h3 class="text-lg font-semibold mb-4 text-[var(--color-foreground)]">
					<code class="text-sm px-2 py-1 rounded bg-[var(--color-accent-bg)] text-[var(--color-accent-text)]">&lt;GlassCarousel&gt;</code>
				</h3>
				<div class="max-w-md mx-auto">
					<GlassCarousel images={carouselImages} variant="frosted" />
				</div>
			</div>

			<!-- Logo -->
			<div class="p-5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)]">
				<h3 class="text-lg font-semibold mb-4 text-[var(--color-foreground)]">
					<code class="text-sm px-2 py-1 rounded bg-[var(--color-accent-bg)] text-[var(--color-accent-text)]">&lt;Logo&gt;</code>
					&amp;
					<code class="text-sm px-2 py-1 rounded bg-[var(--color-accent-bg)] text-[var(--color-accent-text)]">&lt;GlassLogo&gt;</code>
				</h3>
				<div class="flex flex-wrap gap-2 mb-4">
					<span class="text-sm text-[var(--color-foreground-muted)]">Season:</span>
					{#each ['spring', 'summer', 'autumn', 'winter'] as s}
						<button
							class="px-3 py-1 text-sm rounded-full transition-colors {logoSeason === s ? 'bg-grove-600 text-white' : 'bg-[var(--color-accent-bg)] text-[var(--color-foreground-muted)] hover:bg-[var(--color-surface-hover)]'}"
							onclick={() => logoSeason = s as typeof logoSeason}
						>{s}</button>
					{/each}
				</div>
				<div class="flex justify-center gap-8 items-end">
					<div class="text-center">
						<Logo size="lg" season={logoSeason} />
						<p class="text-xs text-[var(--color-foreground-subtle)] mt-2">Logo</p>
					</div>
					<div class="text-center">
						<GlassLogo size={64} season={logoSeason} />
						<p class="text-xs text-[var(--color-foreground-subtle)] mt-2">Default</p>
					</div>
					<div class="text-center">
						<GlassLogo size={64} season={logoSeason} variant="frosted" />
						<p class="text-xs text-[var(--color-foreground-subtle)] mt-2">Frosted</p>
					</div>
					<div class="text-center">
						<GlassLogo size={64} season={logoSeason} variant="ethereal" />
						<p class="text-xs text-[var(--color-foreground-subtle)] mt-2">Ethereal</p>
					</div>
				</div>
			</div>
		</div>
	</details>

	<!-- ═══════════════════════════════════════════════════════ -->
	<!-- NATURE ASSETS -->
	<!-- ═══════════════════════════════════════════════════════ -->
	<details id="nature" class="vineyard-section mb-8 scroll-mt-20" open>
		<summary class="section-header">
			<div class="flex items-center gap-3">
				<div class="p-2 rounded-lg bg-[var(--color-accent-bg)]">
					<TreeIcon class="w-5 h-5 text-grove-600" />
				</div>
				<div>
					<h2 class="text-xl font-bold text-[var(--color-foreground)]">Nature Assets</h2>
					<p class="text-sm text-[var(--color-foreground-muted)]">{Object.keys(assets).length} SVG components across {categories.length} categories</p>
				</div>
			</div>
			<ChevronDown class="w-5 h-5 text-[var(--color-foreground-subtle)] section-chevron" />
		</summary>

		<div class="section-content">
			<div class="p-5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)]">
				<div class="grid md:grid-cols-2 gap-8">
					<!-- Preview Panel -->
					<div>
						<div class="bg-gradient-to-b from-sky-100 to-emerald-50 dark:from-sky-900/30 dark:to-emerald-900/20 rounded-xl p-8 flex items-center justify-center min-h-[300px] border border-[var(--color-border-subtle)]">
							{#if CurrentComponent}
								{#key selectedAsset + JSON.stringify(propValues)}
									<svelte:boundary onerror={(e) => { componentError = e instanceof Error ? e.message : String(e); }}>
										<CurrentComponent class="w-32 h-32" {...propValues} />
										{#snippet failed()}
											<div class="text-center text-red-500">
												<p class="text-sm font-medium">Component error</p>
												<p class="text-xs mt-1 opacity-75">{componentError ?? 'Failed to render'}</p>
											</div>
										{/snippet}
									</svelte:boundary>
								{/key}
							{/if}
						</div>
						<p class="text-center mt-4 text-[var(--color-foreground-muted)] font-mono text-sm">
							&lt;{selectedAsset} /&gt;
						</p>
					</div>

					<!-- Controls Panel -->
					<div class="space-y-6">
						<div>
							<label for="asset-selector" class="block text-sm font-medium mb-2 text-[var(--color-foreground)]">Select Asset</label>
							<select
								id="asset-selector"
								bind:value={selectedAsset}
								onchange={onAssetChange}
								class="vine-select"
							>
								{#each categories as category}
									<optgroup label={category}>
										{#each getAssetsByCategory(category) as [name, _]}
											<option value={name}>{name}</option>
										{/each}
									</optgroup>
								{/each}
							</select>
						</div>

						<!-- Props Controls -->
						{#if getCurrentAsset()}
							<div class="space-y-4 max-h-[400px] overflow-y-auto pr-2">
								<h4 class="text-sm font-medium uppercase tracking-wide text-[var(--color-foreground-subtle)]">Properties</h4>

								{#each getCurrentAsset().props as prop}
									<div class="space-y-2">
										<label for="prop-{prop}" class="block text-sm font-medium text-[var(--color-foreground)]">{prop}</label>

										{#if isColorProp(prop)}
											{@const colorError = getColorInputError(prop)}
											<div class="space-y-2">
												<div class="flex gap-2 items-center">
													<input
														id="prop-{prop}"
														type="color"
														value={propValues[prop] ?? '#16a34a'}
														oninput={(e) => propValues[prop] = e.currentTarget.value}
														class="w-10 h-10 rounded cursor-pointer border border-[var(--color-border)]"
													/>
													<input
														type="text"
														value={pendingColorValues[prop] ?? propValues[prop] ?? ''}
														oninput={(e) => debouncedColorUpdate(prop, e.currentTarget.value)}
														placeholder="#16a34a"
														class="vine-input flex-1 font-mono text-sm {colorError ? 'border-red-400' : ''}"
													/>
												</div>
												{#if colorError}
													<p class="text-xs text-red-500">{colorError}</p>
												{/if}
												<div class="flex flex-wrap gap-1">
													{#each colorPresets as preset}
														<button
															type="button"
															onclick={() => { propValues[prop] = preset.value; pendingColorValues[prop] = preset.value; }}
															class="w-6 h-6 rounded-full border-2 border-[var(--color-surface-elevated)] shadow-sm hover:scale-110 transition-transform"
															style="background-color: {preset.value}"
															title={preset.name}
														></button>
													{/each}
												</div>
											</div>
										{:else if isBooleanProp(prop)}
											<label class="flex items-center gap-3 cursor-pointer">
												<input type="checkbox" bind:checked={propValues[prop]} class="w-5 h-5 rounded" />
												<span class="text-sm text-[var(--color-foreground-muted)]">{propValues[prop] !== false ? 'Enabled' : 'Disabled'}</span>
											</label>
										{:else if hasOptions(prop)}
											<select
												id="prop-{prop}"
												bind:value={propValues[prop]}
												class="vine-select text-sm"
											>
												<option value={undefined}>Default</option>
												{#each getOptions(prop) as option}
													<option value={option}>{option}</option>
												{/each}
											</select>
										{:else if isNumericProp(prop)}
											{@const range = getNumericRange(prop)}
											<div class="space-y-1">
												<input
													id="prop-{prop}"
													type="range"
													min={range.min}
													max={range.max}
													step={range.step}
													bind:value={propValues[prop]}
													class="w-full"
												/>
												<div class="flex justify-between text-xs text-[var(--color-foreground-subtle)]">
													<span>{range.min}</span>
													<span class="font-medium">{propValues[prop]?.toFixed(range.step < 1 ? 1 : 0) ?? 'default'}</span>
													<span>{range.max}</span>
												</div>
											</div>
										{:else}
											<input
												id="prop-{prop}"
												type="text"
												bind:value={propValues[prop]}
												placeholder="Default"
												class="vine-input text-sm"
											/>
										{/if}
									</div>
								{/each}
							</div>
						{/if}

						<button
							type="button"
							onclick={() => propValues = {}}
							class="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-foreground-muted)] hover:bg-[var(--color-surface-hover)] transition-colors"
						>
							Reset to Defaults
						</button>
					</div>
				</div>
			</div>
		</div>
	</details>

	<!-- ═══════════════════════════════════════════════════════ -->
	<!-- TYPOGRAPHY -->
	<!-- ═══════════════════════════════════════════════════════ -->
	<details id="typography" class="vineyard-section mb-8 scroll-mt-20" open>
		<summary class="section-header">
			<div class="flex items-center gap-3">
				<div class="p-2 rounded-lg bg-[var(--color-accent-bg)]">
					<Type class="w-5 h-5 text-grove-600" />
				</div>
				<div>
					<h2 class="text-xl font-bold text-[var(--color-foreground)]">Typography</h2>
					<p class="text-sm text-[var(--color-foreground-muted)]">10 fonts for every mood, from cozy headers to crisp code</p>
				</div>
			</div>
			<ChevronDown class="w-5 h-5 text-[var(--color-foreground-subtle)] section-chevron" />
		</summary>

		<div class="section-content grid gap-6">
			<!-- FontProvider -->
			<div class="p-5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)]">
				<h3 class="text-lg font-semibold mb-4 text-[var(--color-foreground)]">
					<code class="text-sm px-2 py-1 rounded bg-[var(--color-accent-bg)] text-[var(--color-accent-text)]">&lt;FontProvider&gt;</code>
				</h3>
				<div class="space-y-4">
					<div class="flex flex-wrap gap-2">
						{#each fonts as f}
							<button
								class="px-2 py-1 text-xs rounded transition-colors {selectedFont === f.id ? 'bg-grove-600 text-white' : 'bg-[var(--color-accent-bg)] text-[var(--color-foreground-muted)] hover:bg-[var(--color-surface-hover)]'}"
								onclick={() => selectedFont = f.id as FontId}
							>{f.name}</button>
						{/each}
					</div>
					<div class="p-6 bg-[var(--color-surface-elevated)] rounded-lg border border-[var(--color-border-subtle)]">
						<FontProvider font={selectedFont} as="p" class="text-2xl text-[var(--color-foreground)]">
							The quick brown fox jumps over the lazy dog.
						</FontProvider>
						<p class="text-sm text-[var(--color-foreground-subtle)] mt-2">
							{fonts.find((f: { id: string; description?: string }) => f.id === selectedFont)?.description}
						</p>
					</div>
				</div>
			</div>

			<!-- Display Fonts -->
			<div class="p-5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)]">
				<h4 class="font-semibold mb-4 text-[var(--color-foreground)]">Display Fonts</h4>
				<div class="space-y-4">
					<div class="p-4 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/20 rounded-lg">
						<Alagard as="h3" class="text-2xl text-purple-900 dark:text-purple-200 mb-2">
							Welcome to the Fantasy Realm
						</Alagard>
						<p class="text-sm text-purple-700 dark:text-purple-300">Alagard - pixel art medieval display font</p>
					</div>
					<div class="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg">
						<Calistoga as="h3" class="text-2xl text-amber-900 dark:text-amber-200 mb-2">
							Friendly Headlines Welcome You
						</Calistoga>
						<p class="text-sm text-amber-700 dark:text-amber-300">Calistoga - casual brush serif</p>
					</div>
					<div class="p-4 bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 rounded-lg">
						<Caveat as="h3" class="text-2xl text-rose-900 dark:text-rose-200 mb-2">
							A personal note just for you...
						</Caveat>
						<p class="text-sm text-rose-700 dark:text-rose-300">Caveat - handwritten script, personal and informal</p>
					</div>
				</div>
			</div>

			<!-- Sans-Serif Fonts -->
			<div class="p-5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)]">
				<h4 class="font-semibold mb-4 text-[var(--color-foreground)]">Sans-Serif Fonts</h4>
				<div class="grid md:grid-cols-2 gap-4">
					<div class="p-4 bg-[var(--color-surface-elevated)] rounded-lg border border-[var(--color-border-subtle)]">
						<Lexend as="h3" class="text-xl text-[var(--color-foreground)] mb-2">Lexend (Default)</Lexend>
						<Lexend as="p" class="text-[var(--color-foreground-muted)]">Modern, highly readable sans-serif. Grove's default font.</Lexend>
					</div>
					<div class="p-4 bg-[var(--color-surface-elevated)] rounded-lg border border-[var(--color-border-subtle)]">
						<Quicksand as="h3" class="text-xl text-[var(--color-foreground)] mb-2">Quicksand</Quicksand>
						<Quicksand as="p" class="text-[var(--color-foreground-muted)]">Geometric sans with rounded terminals. Light and modern.</Quicksand>
					</div>
					<div class="p-4 bg-[var(--color-surface-elevated)] rounded-lg border border-[var(--color-border-subtle)]">
						<PlusJakartaSans as="h3" class="text-xl text-[var(--color-foreground)] mb-2">Plus Jakarta Sans</PlusJakartaSans>
						<PlusJakartaSans as="p" class="text-[var(--color-foreground-muted)]">Contemporary geometric sans. Balanced and versatile.</PlusJakartaSans>
					</div>
				</div>
			</div>

			<!-- Monospace Fonts -->
			<div class="p-5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)]">
				<h4 class="font-semibold mb-4 text-[var(--color-foreground)]">Monospace Fonts</h4>
				<div class="space-y-4">
					<div class="p-4 bg-gray-900 rounded-lg">
						<IBMPlexMono as="code" class="text-grove-400 block mb-2">
							// IBM Plex Mono - corporate warmth
						</IBMPlexMono>
						<IBMPlexMono as="pre" class="text-gray-100 text-sm">{`function greet(name: string) {
  console.log(\`Hello, \${name}!\`);
}
greet("Grove");`}</IBMPlexMono>
					</div>
					<div class="p-4 bg-purple-950 rounded-lg">
						<Cozette as="code" class="text-purple-400 block mb-2">
							# Cozette - retro terminal aesthetic
						</Cozette>
						<Cozette as="pre" class="text-purple-100 text-sm">{`$ cd ~/grove
$ npm run dev
> Server running at localhost:5173`}</Cozette>
					</div>
				</div>
			</div>

			<!-- Accessibility Fonts -->
			<div class="p-5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)]">
				<h4 class="font-semibold mb-4 text-[var(--color-foreground)]">Accessibility Fonts</h4>
				<div class="grid md:grid-cols-2 gap-4">
					<div class="p-4 bg-grove-50 dark:bg-grove-950/30 rounded-lg border border-grove-200 dark:border-grove-800">
						<Atkinson as="h3" class="text-lg text-grove-900 dark:text-grove-200 mb-2">Atkinson Hyperlegible</Atkinson>
						<Atkinson as="p" class="text-grove-700 dark:text-grove-300 text-sm">
							Designed for low vision readers. Maximum character distinction between similar letters.
						</Atkinson>
					</div>
					<div class="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
						<OpenDyslexic as="h3" class="text-lg text-blue-900 dark:text-blue-200 mb-2">OpenDyslexic</OpenDyslexic>
						<OpenDyslexic as="p" class="text-blue-700 dark:text-blue-300 text-sm">
							Weighted bottoms reduce letter confusion for dyslexic readers.
						</OpenDyslexic>
					</div>
				</div>
			</div>
		</div>
	</details>

	<!-- ═══════════════════════════════════════════════════════ -->
	<!-- COLOR PALETTES -->
	<!-- ═══════════════════════════════════════════════════════ -->
	<details id="palettes" class="vineyard-section mb-8 scroll-mt-20" open>
		<summary class="section-header">
			<div class="flex items-center gap-3">
				<div class="p-2 rounded-lg bg-[var(--color-accent-bg)]">
					<Palette class="w-5 h-5 text-grove-600" />
				</div>
				<div>
					<h2 class="text-xl font-bold text-[var(--color-foreground)]">Color Palettes</h2>
					<p class="text-sm text-[var(--color-foreground-muted)]">The rich, natural hues that bring Grove to life</p>
				</div>
			</div>
			<ChevronDown class="w-5 h-5 text-[var(--color-foreground-subtle)] section-chevron" />
		</summary>

		<div class="section-content grid gap-6">
			{@render PaletteRow({ name: "Greens", colors: greens, description: "From dark forest depths to pale spring leaves" })}
			{@render PaletteRow({ name: "Bark", colors: bark, description: "Warm wood tones for trunks and structure" })}
			{@render PaletteRow({ name: "Earth", colors: earth, description: "Soil, stone, and grounding elements" })}
			{@render PaletteRow({ name: "Natural", colors: natural, description: "Cream, birch, and soft organic tones" })}
			{@render PaletteRow({ name: "Spring", colors: spring, description: "Fresh growth and new beginnings" })}
			{@render PaletteRow({ name: "Spring Blossoms", colors: springBlossoms, description: "Cherry blossoms in full bloom" })}
			{@render PaletteRow({ name: "Autumn", colors: autumn, description: "Warm golds, ambers, and falling leaves" })}
			{@render PaletteRow({ name: "Autumn Reds", colors: autumnReds, description: "Maple and cherry fall foliage" })}
			{@render PaletteRow({ name: "Winter", colors: winter, description: "Snow, frost, and peaceful quiet" })}
			{@render PaletteRow({ name: "Pinks", colors: pinks, description: "Blush, rose, and soft florals" })}
			{@render PaletteRow({ name: "Midnight Bloom", colors: midnightBloom, description: "A late-night tea cafe palette" })}
		</div>
	</details>
</main>

<!-- Overlay Demo -->
{#if showOverlayDemo}
	<GlassOverlay onclick={() => showOverlayDemo = false}>
		<div class="flex items-center justify-center h-full">
			<GlassCard variant="frosted" class="max-w-sm mx-4" title="Overlay Demo">
				<p class="text-[var(--color-foreground-muted)]">Click anywhere on the backdrop to close this overlay.</p>
				<div class="mt-4">
					<GlassButton variant="accent" onclick={() => showOverlayDemo = false}>Close</GlassButton>
				</div>
			</GlassCard>
		</div>
	</GlassOverlay>
{/if}

<!-- Helper Snippets -->
{#snippet PaletteRow({ name, colors, description }: { name: string; colors: Record<string, string>; description: string })}
	<div class="p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border-subtle)]">
		<div class="flex items-center justify-between mb-3">
			<div>
				<h4 class="font-medium text-[var(--color-foreground)]">{name}</h4>
				<p class="text-sm text-[var(--color-foreground-subtle)]">{description}</p>
			</div>
		</div>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="flex flex-wrap gap-1.5"
			onclick={(e) => {
				const btn = (e.target as HTMLElement).closest('[data-color]');
				if (btn) navigator.clipboard.writeText(btn.getAttribute('data-color') ?? '');
			}}
		>
			{#each Object.entries(colors) as [key, color]}
				<div class="group relative">
					<button
						class="w-10 h-10 rounded-md shadow-sm border border-black/10 dark:border-white/10 cursor-pointer transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-grove-500"
						style="background-color: {color}"
						title="{key}: {color}"
						data-color={color}
					></button>
					<div class="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
						{key}: {color}
					</div>
				</div>
			{/each}
		</div>
	</div>
{/snippet}

<style>
	/* Collapsible section styles */
	.vineyard-section {
		border-radius: 1rem;
		border: 1px solid var(--color-border-subtle);
		overflow: hidden;
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		cursor: pointer;
		background: var(--color-surface);
		user-select: none;
		list-style: none;
		transition: background-color 0.15s ease;
	}

	.section-header:hover {
		background: var(--color-surface-hover);
	}

	/* Remove default marker */
	.section-header::-webkit-details-marker,
	.section-header::marker {
		display: none;
		content: '';
	}

	/* Chevron rotation */
	:global(.vineyard-section[open] .section-chevron) {
		transform: rotate(180deg);
	}

	:global(.section-chevron) {
		transition: transform 0.2s ease;
		flex-shrink: 0;
	}

	.section-content {
		padding: 1.25rem;
		border-top: 1px solid var(--color-border-subtle);
	}

	/* Shared form element styles */
	:global(.vine-select) {
		width: 100%;
		padding: 0.5rem 0.75rem;
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
		background: var(--color-surface-elevated);
		color: var(--color-foreground);
		font-size: 0.875rem;
	}

	:global(.vine-input) {
		width: 100%;
		padding: 0.5rem 0.75rem;
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
		background: var(--color-surface-elevated);
		color: var(--color-foreground);
	}

	/* Respect reduced motion */
	@media (prefers-reduced-motion: reduce) {
		:global(.section-chevron) {
			transition: none;
		}
		.section-header {
			transition: none;
		}
	}
</style>
