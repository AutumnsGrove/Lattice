<script lang="ts">
	import { Header, Footer } from '@autumnsgrove/groveengine/ui/chrome';
	import SEO from '$lib/components/SEO.svelte';

	// Lucide Icons
	import {
		Boxes,
		Layers,
		TreePine as TreeIcon,
		Sparkles,
		ChevronDown,
		ChevronRight,
		Palette,
		MousePointer,
		Eye,
		Type,
		Leaf as LeafIcon
	} from 'lucide-svelte';

	// Import logo concepts
	import {
		// Original (v1)
		LogoClearingRing,
		LogoConnectedCanopy,
		LogoOrganicG,
		LogoGathering,
		LogoMycelium,
		LogoClearingPath,
		LogoThreeLeaves,
		LogoGroveSeal,
		// Sprout-based (v2)
		SproutCore,
		SproutRing,
		SproutDouble,
		SproutG,
		SproutRooted,
		SproutHeart,
		// Space-based (v3)
		LogoLantern,
		LogoLanternMinimal,
		LogoThreshold,
		LogoClearing,
		// Forest (v4)
		LogoForestLantern,
		LogoGrove,
		LogoThreePines,
		LogoForestFireflies,
		LogoForestNight,
		LogoForestHearth,
		LogoForestPath,
		LogoForestOwl,
		LogoForestNest,
		LogoForestSwing,
		LogoForestFairyRing,
		LogoForestBirdhouse,
		LogoForestSnow,
		// The Garden (v5)
		LogoGarden,
		LogoGardenMinimal,
		// Lucide Compositions (v6)
		LogoFireflyForest,
		LogoGatheringHearth,
		LogoStarlightPines,
		LogoShelter,
		LogoWinterGrove,
		// The Mega Forest
		LogoMegaForest,
		// The Badge Collection (v7)
		LogoGroveBadge,
		LogoGroveCircle,
		// The artifact 😂
		LogoArtifact
	} from '$lib/components/logo-concepts';
	import LogoGrid from '$lib/components/logo-concepts/LogoGrid.svelte';

	// Import Glass components
	import {
		Glass,
		GlassButton,
		GlassCard,
		GlassLogo,
		GlassOverlay,
		GlassCarousel
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

	// Section expansion state
	let expandedSection = $state<'glass' | 'nature' | 'typography' | 'logos' | null>('logos');

	// Logo concept definitions
	const logoConcepts = [
		{
			name: 'Clearing Ring',
			component: LogoClearingRing,
			description: 'Three organic curves forming a sheltered ring shape',
			rationale: 'Evokes a clearing in the forest, paths meeting, an open welcoming space',
			verdict: 'Abstract but disconnected - curves dont create unity'
		},
		{
			name: 'Connected Canopy',
			component: LogoConnectedCanopy,
			description: 'Three overlapping leaf/canopy shapes creating unity',
			rationale: 'Looking up through the trees, community shelter. Individual trees creating something larger.',
			verdict: 'Strong concept - overlapping shapes work well'
		},
		{
			name: 'Organic G',
			component: LogoOrganicG,
			description: 'A letter G that feels grown, not drawn - like a living branch',
			rationale: 'G for Grove. Simple, direct, memorable. The organic curves and leaf accent warm it up.',
			verdict: 'STRONG CONTENDER - Clear, memorable, works at all sizes'
		},
		{
			name: 'The Gathering',
			component: LogoGathering,
			description: 'Three stylized trees leaning inward, forming community',
			rationale: 'Trees coming together, shared shelter, gathering place',
			verdict: 'Too generic - could be any forest company'
		},
		{
			name: 'Mycelium',
			component: LogoMycelium,
			description: 'Interconnected nodes representing the underground network',
			rationale: 'Hidden connections, community roots, shared foundation',
			verdict: 'Conceptually beautiful but too complex for favicon sizes'
		},
		{
			name: 'Clearing Path',
			component: LogoClearingPath,
			description: 'An arch/doorway shape made of two converging branches',
			rationale: 'Entering the grove - two trees arch together, creating an opening. This is invitation.',
			verdict: 'STRONG CONTENDER - Evokes threshold and welcome'
		},
		{
			name: 'Three Leaves',
			component: LogoThreeLeaves,
			description: 'Three leaves arranged in a gentle spiral around a center',
			rationale: 'Growth, renewal, community of individuals. Each unique but part of the same grove.',
			verdict: 'STRONG CONTENDER - Works at any size, organic, distinct'
		},
		{
			name: 'Grove Seal',
			component: LogoGroveSeal,
			description: 'A circular ring with three internal paths meeting at center',
			rationale: 'A waystone marker showing three paths that meet at this grove. Badge quality with organic internals.',
			verdict: 'STRONG CONTENDER - Best balance of formal and organic'
		}
	];

	// Sprout-based logo concepts (v2)
	const sproutConcepts = [
		{ component: SproutCore, name: 'Sprout Core', props: {} },
		{ component: SproutRing, name: 'Sprout Ring', props: {} },
		{ component: SproutDouble, name: 'Sprout Double', props: {} },
		{ component: SproutG, name: 'Sprout G', props: {} },
		{ component: SproutRooted, name: 'Sprout Rooted', props: {} },
		{ component: SproutHeart, name: 'Sprout Heart', props: {} }
	];

	// Space-based logo concepts (v3) - "what happens IN the grove"
	const spaceConcepts = [
		{ component: LogoLantern, name: 'The Lantern', props: {} },
		{ component: LogoLanternMinimal, name: 'Lantern Minimal', props: {} },
		{ component: LogoThreshold, name: 'The Threshold', props: {} },
		{ component: LogoClearing, name: 'The Clearing', props: {} }
	];

	// Forest concepts (v4) - "the grove itself"
	const forestConcepts = [
		{ component: LogoForestLantern, name: 'Forest Lantern', props: {} },
		{ component: LogoGrove, name: 'The Grove', props: {} },
		{ component: LogoThreePines, name: 'Three Pines', props: {} },
		{ component: LogoForestFireflies, name: 'Fireflies', props: {} },
		{ component: LogoForestNight, name: 'Night Grove', props: {} },
		{ component: LogoForestHearth, name: 'The Hearth', props: {} },
		{ component: LogoForestPath, name: 'Forest Path', props: {} },
		{ component: LogoForestOwl, name: 'Grove Keeper', props: {} },
		{ component: LogoForestNest, name: 'The Nest', props: {} },
		{ component: LogoForestSwing, name: 'The Swing', props: {} },
		{ component: LogoForestFairyRing, name: 'Fairy Ring', props: {} },
		{ component: LogoForestBirdhouse, name: 'Birdhouse', props: {} },
		{ component: LogoForestSnow, name: 'First Snow', props: {} }
	];

	// The Garden (v5) - the full experience
	const gardenConcepts = [
		{ component: LogoGarden, name: 'The Garden', props: {} },
		{ component: LogoGardenMinimal, name: 'Garden Minimal', props: {} }
	];

	// Lucide Compositions (v6) - actual Lucide icon paths as building blocks
	const lucideCompositions = [
		{ component: LogoFireflyForest, name: 'Firefly Forest', props: {} },
		{ component: LogoGatheringHearth, name: 'The Gathering', props: {} },
		{ component: LogoStarlightPines, name: 'Starlight Pines', props: {} },
		{ component: LogoShelter, name: 'The Shelter', props: {} },
		{ component: LogoWinterGrove, name: 'Winter Grove', props: {} }
	];

	// Selected logo for larger preview
	let selectedLogoConcept = $state(logoConcepts[2]); // Default to Organic G

	// Typography state
	let selectedFont = $state<FontId>('lexend');

	// Glass component demos state
	let glassVariant = $state<'surface' | 'overlay' | 'card' | 'tint' | 'accent' | 'muted'>('card');
	let glassIntensity = $state<'none' | 'light' | 'medium' | 'strong'>('medium');
	let buttonVariant = $state<'default' | 'accent' | 'dark' | 'ghost' | 'outline'>('default');
	let buttonSize = $state<'sm' | 'md' | 'lg' | 'icon'>('md');
	let cardVariant = $state<'default' | 'accent' | 'dark' | 'muted' | 'frosted'>('default');
	let cardHoverable = $state(false);
	let logoVariant = $state<'default' | 'accent' | 'frosted' | 'dark' | 'ethereal'>('default');
	let logoSeason = $state<'spring' | 'summer' | 'autumn' | 'winter'>('summer');
	let logoBreathing = $state(false);

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
		'Logo': { component: Logo, category: 'Trees', props: ['color', 'trunkColor', 'season', 'animate', 'animateEntrance', 'breathing'] },
		'GlassLogo': { component: GlassLogo, category: 'Trees', props: ['variant', 'season', 'animate', 'breathing', 'breathingSpeed', 'monochrome', 'accentColor'] },
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

	// Carousel demo images (placeholders)
	const carouselImages = [
		{ url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" fill="%2310b981"%3E%3Crect width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="white" font-size="20"%3ESlide 1%3C/text%3E%3C/svg%3E', alt: 'Placeholder slide 1', caption: 'First slide caption' },
		{ url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" fill="%23059669"%3E%3Crect width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="white" font-size="20"%3ESlide 2%3C/text%3E%3C/svg%3E', alt: 'Placeholder slide 2', caption: 'Second slide caption' },
		{ url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" fill="%23047857"%3E%3Crect width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="white" font-size="20"%3ESlide 3%3C/text%3E%3C/svg%3E', alt: 'Placeholder slide 3', caption: 'Third slide caption' },
	];
</script>

<SEO
	title="Vineyard — Lattice Asset Showcase"
	description="Explore the components and assets that Lattice provides. Glass UI components, nature SVGs, and everything you need to build beautiful Grove experiences."
	url="https://grove.place/vineyard"
/>

<main class="min-h-screen flex flex-col bg-gradient-to-b from-emerald-50 via-green-50 to-lime-50 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950">
	<Header />

	<!-- Hero Section -->
	<section class="relative py-16 px-6 overflow-hidden">
		<!-- Background decorations -->
		<div class="absolute top-8 left-[10%] opacity-30" aria-hidden="true">
			<Cloud class="w-24 h-10" animate speed="slow" />
		</div>
		<div class="absolute top-16 right-[15%] opacity-20" aria-hidden="true">
			<Cloud variant="wispy" class="w-32 h-12" animate speed="slow" />
		</div>

		<div class="max-w-4xl mx-auto text-center relative z-10">
			<!-- Badge -->
			<div class="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-white/60 dark:border-slate-700/60 shadow-sm">
				<Boxes class="w-5 h-5 text-grove-600 dark:text-grove-400" />
				<span class="text-sm font-medium text-foreground">Lattice Asset Showcase</span>
			</div>

			<h1 class="text-4xl md:text-5xl font-serif text-foreground mb-4">
				Everything Lattice Provides
			</h1>
			<p class="text-lg text-foreground-muted max-w-2xl mx-auto mb-8">
				Glass UI components, nature assets, and the building blocks for beautiful Grove experiences.
				Explore, customize, and see what's possible.
			</p>

			<!-- Quick stats -->
			<div class="flex flex-wrap justify-center gap-6 text-sm">
				<div class="flex items-center gap-2 text-foreground-muted">
					<Layers class="w-4 h-4 text-grove-600" />
					<span>8 Glass Components</span>
				</div>
				<div class="flex items-center gap-2 text-foreground-muted">
					<TreeIcon class="w-4 h-4 text-grove-600" />
					<span>{Object.keys(assets).length} Nature Assets</span>
				</div>
				<div class="flex items-center gap-2 text-foreground-muted">
					<Type class="w-4 h-4 text-grove-600" />
					<span>10 Font Families</span>
				</div>
				<div class="flex items-center gap-2 text-foreground-muted">
					<Palette class="w-4 h-4 text-grove-600" />
					<span>4 Seasonal Themes</span>
				</div>
			</div>
		</div>
	</section>

	<!-- Logo Concepts Section -->
	<section class="py-8 px-6">
		<div class="max-w-5xl mx-auto">
			<!-- Section Header -->
			<button
				type="button"
				class="w-full flex items-center justify-between p-4 rounded-xl bg-amber-50/70 dark:bg-amber-900/20 backdrop-blur-sm border border-amber-200/60 dark:border-amber-700/40 shadow-sm hover:bg-amber-100/90 dark:hover:bg-amber-900/30 transition-all mb-4"
				onclick={() => expandedSection = expandedSection === 'logos' ? null : 'logos'}
				aria-expanded={expandedSection === 'logos'}
				aria-controls="logos-section-content"
			>
				<div class="flex items-center gap-3">
					<div class="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40">
						<LeafIcon class="w-5 h-5 text-amber-600 dark:text-amber-400" />
					</div>
					<div class="text-left">
						<h2 class="text-xl font-serif text-foreground">Logo Concepts</h2>
						<p class="text-sm text-foreground-muted">8 new logo directions for Grove (replacing the asterisk)</p>
					</div>
				</div>
				<ChevronDown class="w-5 h-5 text-foreground-muted transition-transform {expandedSection === 'logos' ? 'rotate-180' : ''}" aria-hidden="true" />
			</button>

			{#if expandedSection === 'logos'}
				<div id="logos-section-content" class="space-y-6 animate-in slide-in-from-top-2 duration-300">
					<!-- Main Preview + Grid -->
					<div class="grid lg:grid-cols-2 gap-6">
						<!-- Large Preview -->
						<div class="p-6 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/40 dark:border-slate-700/40">
							<h3 class="text-lg font-semibold text-foreground mb-4">{selectedLogoConcept.name}</h3>

							<!-- Large preview with different backgrounds -->
							<div class="grid grid-cols-3 gap-3 mb-4">
								<!-- Light background -->
								<div class="bg-gradient-to-br from-emerald-50 to-green-100 rounded-xl p-6 flex items-center justify-center aspect-square">
									<svelte:component this={selectedLogoConcept.component} class="w-20 h-20" color={greens.grove} />
								</div>
								<!-- Dark background -->
								<div class="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 flex items-center justify-center aspect-square">
									<svelte:component this={selectedLogoConcept.component} class="w-20 h-20" color="#ffffff" />
								</div>
								<!-- Autumn background -->
								<div class="bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/50 dark:to-orange-900/50 rounded-xl p-6 flex items-center justify-center aspect-square">
									<svelte:component this={selectedLogoConcept.component} class="w-20 h-20" color={autumn.pumpkin} />
								</div>
							</div>

							<!-- Size test -->
							<div class="flex items-end gap-4 p-4 bg-white/60 dark:bg-slate-700/60 rounded-lg mb-4">
								<div class="text-center">
									<svelte:component this={selectedLogoConcept.component} class="w-4 h-4" color={greens.grove} />
									<span class="text-xs text-foreground-faint block mt-1">16px</span>
								</div>
								<div class="text-center">
									<svelte:component this={selectedLogoConcept.component} class="w-6 h-6" color={greens.grove} />
									<span class="text-xs text-foreground-faint block mt-1">24px</span>
								</div>
								<div class="text-center">
									<svelte:component this={selectedLogoConcept.component} class="w-8 h-8" color={greens.grove} />
									<span class="text-xs text-foreground-faint block mt-1">32px</span>
								</div>
								<div class="text-center">
									<svelte:component this={selectedLogoConcept.component} class="w-12 h-12" color={greens.grove} />
									<span class="text-xs text-foreground-faint block mt-1">48px</span>
								</div>
								<div class="text-center">
									<svelte:component this={selectedLogoConcept.component} class="w-16 h-16" color={greens.grove} />
									<span class="text-xs text-foreground-faint block mt-1">64px</span>
								</div>
							</div>

							<!-- Description -->
							<p class="text-sm text-foreground-muted mb-2">{selectedLogoConcept.description}</p>
							<p class="text-sm text-foreground-faint italic mb-3">{selectedLogoConcept.rationale}</p>
							<p class="text-sm font-medium {selectedLogoConcept.verdict.includes('STRONG') ? 'text-grove-600 dark:text-grove-400' : 'text-foreground-muted'}">
								{selectedLogoConcept.verdict}
							</p>
						</div>

						<!-- Logo Grid -->
						<div class="p-6 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/40 dark:border-slate-700/40">
							<h3 class="text-lg font-semibold text-foreground mb-4">All Concepts</h3>
							<div class="grid grid-cols-4 gap-3">
								{#each logoConcepts as concept}
									<button
										type="button"
										class="p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 {selectedLogoConcept.name === concept.name ? 'border-grove-500 bg-grove-50 dark:bg-grove-900/30' : 'border-transparent bg-white/60 dark:bg-slate-700/40 hover:bg-white dark:hover:bg-slate-700/60'}"
										onclick={() => selectedLogoConcept = concept}
									>
										<svelte:component this={concept.component} class="w-10 h-10" color={greens.grove} />
										<span class="text-xs text-foreground-muted text-center leading-tight">{concept.name}</span>
									</button>
								{/each}
							</div>

							<!-- Seasonal colors test -->
							<h4 class="text-sm font-medium text-foreground-muted uppercase tracking-wide mt-6 mb-3">Seasonal Adaptation</h4>
							<div class="flex justify-around">
								<div class="text-center">
									<svelte:component this={selectedLogoConcept.component} class="w-10 h-10" color={pinks.pink} />
									<span class="text-xs text-foreground-faint block mt-1">Spring</span>
								</div>
								<div class="text-center">
									<svelte:component this={selectedLogoConcept.component} class="w-10 h-10" color={greens.grove} />
									<span class="text-xs text-foreground-faint block mt-1">Summer</span>
								</div>
								<div class="text-center">
									<svelte:component this={selectedLogoConcept.component} class="w-10 h-10" color={autumn.pumpkin} />
									<span class="text-xs text-foreground-faint block mt-1">Autumn</span>
								</div>
								<div class="text-center">
									<svelte:component this={selectedLogoConcept.component} class="w-10 h-10" color={winter.frostedPine} />
									<span class="text-xs text-foreground-faint block mt-1">Winter</span>
								</div>
							</div>
						</div>
					</div>

					<!-- Glass Variant Preview -->
					<div class="p-6 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/40 dark:border-slate-700/40">
						<h3 class="text-lg font-semibold text-foreground mb-4">Glass Variant Consideration</h3>
						<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
							<!-- Glass on gradient -->
							<div class="bg-gradient-to-br from-grove-100 to-emerald-100 dark:from-slate-700 dark:to-emerald-900 rounded-xl p-6 flex flex-col items-center justify-center">
								<Glass variant="card" class="p-4 rounded-xl">
									<svelte:component this={selectedLogoConcept.component} class="w-12 h-12" color={greens.grove} />
								</Glass>
								<span class="text-xs text-foreground-muted mt-2">Glass Card</span>
							</div>
							<!-- Frosted -->
							<div class="bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50 rounded-xl p-6 flex flex-col items-center justify-center">
								<Glass variant="tint" class="p-4 rounded-xl">
									<svelte:component this={selectedLogoConcept.component} class="w-12 h-12" color={midnightBloom.purple} />
								</Glass>
								<span class="text-xs text-foreground-muted mt-2">Glass Tint</span>
							</div>
							<!-- Accent -->
							<div class="bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40 rounded-xl p-6 flex flex-col items-center justify-center">
								<Glass variant="accent" class="p-4 rounded-xl">
									<svelte:component this={selectedLogoConcept.component} class="w-12 h-12" color={autumn.amber} />
								</Glass>
								<span class="text-xs text-foreground-muted mt-2">Glass Accent</span>
							</div>
							<!-- Dark overlay -->
							<div class="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 flex flex-col items-center justify-center">
								<Glass variant="overlay" class="p-4 rounded-xl">
									<svelte:component this={selectedLogoConcept.component} class="w-12 h-12" color="#ffffff" />
								</Glass>
								<span class="text-xs text-slate-400 mt-2">Glass Overlay</span>
							</div>
						</div>
					</div>

					<!-- Notes -->
					<div class="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-dashed border-amber-300 dark:border-amber-800">
						<p class="text-sm text-foreground-muted">
							<strong>Design Goals:</strong> The new logo must be distinctly original (no similarity to Linktree's asterisk-tree),
							work at small sizes (16x16 favicon), have a legible monochrome version, and feel like it could be a Lucide icon.
						</p>
						<p class="text-sm text-foreground-faint mt-2">
							Top candidates: <strong>Organic G</strong>, <strong>Clearing Path</strong>, <strong>Three Leaves</strong>, and <strong>Grove Seal</strong>
						</p>
					</div>

					<!-- Sprout Concepts (v2) -->
					<div class="mt-8 p-6 rounded-xl bg-grove-50/50 dark:bg-grove-950/20 border border-grove-200 dark:border-grove-800">
						<div class="flex items-center gap-2 mb-4">
							<LeafIcon class="w-5 h-5 text-grove-600 dark:text-grove-400" />
							<h3 class="text-lg font-semibold text-foreground">Sprout Concepts (v2)</h3>
						</div>
						<p class="text-sm text-foreground-muted mb-4">
							Enhanced variations based on Lucide's Sprout icon—already marked as "Grove brand" in our icon registry.
						</p>
						<LogoGrid
							logos={sproutConcepts}
							initialSize={48}
							color={greens.grove}
							backgrounds={[
								{ name: 'Dark', class: 'bg-slate-800' },
								{ name: 'Light', class: 'bg-slate-100' },
								{ name: 'Grove', class: 'bg-grove-900' },
								{ name: 'Autumn', class: 'bg-amber-900' },
								{ name: 'Midnight', class: 'bg-purple-950' }
							]}
						/>
					</div>

					<!-- Space Concepts (v3) -->
					<div class="mt-8 p-6 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
						<div class="flex items-center gap-2 mb-4">
							<Sparkles class="w-5 h-5 text-amber-600 dark:text-amber-400" />
							<h3 class="text-lg font-semibold text-foreground">Space Concepts (v3)</h3>
						</div>
						<p class="text-sm text-foreground-muted mb-4">
							A philosophical shift: the logo isn't about the trees—it's about what happens <em>in</em> the grove.
							The lantern someone left for you. The threshold inviting you in. The clearing with room for you.
						</p>
						<LogoGrid
							logos={spaceConcepts}
							initialSize={48}
							color={autumn.amber}
							backgrounds={[
								{ name: 'Dark', class: 'bg-slate-800' },
								{ name: 'Light', class: 'bg-slate-100' },
								{ name: 'Grove', class: 'bg-grove-900' },
								{ name: 'Autumn', class: 'bg-amber-900' },
								{ name: 'Warm', class: 'bg-orange-950' }
							]}
						/>
					</div>

					<!-- Forest Concepts (v4) -->
					<div class="mt-8 p-6 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
						<div class="flex items-center gap-2 mb-4">
							<TreeIcon class="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
							<h3 class="text-lg font-semibold text-foreground">Forest Concepts (v4)</h3>
						</div>
						<p class="text-sm text-foreground-muted mb-4">
							The grove itself—multiple trees creating community. Variety in unity.
							Mixed tree types from Lucide + Tabler Icons (both MIT licensed).
						</p>
						<LogoGrid
							logos={forestConcepts}
							initialSize={64}
							color={greens.grove}
							backgrounds={[
								{ name: 'Dark', class: 'bg-slate-800' },
								{ name: 'Light', class: 'bg-slate-100' },
								{ name: 'Grove', class: 'bg-grove-900' },
								{ name: 'Forest', class: 'bg-emerald-950' },
								{ name: 'Dusk', class: 'bg-indigo-950' }
							]}
						/>
					</div>

					<!-- The Garden (v5) - The Full Experience -->
					<div class="mt-8 p-6 rounded-xl bg-gradient-to-br from-amber-50/50 via-emerald-50/50 to-purple-50/50 dark:from-amber-950/30 dark:via-emerald-950/30 dark:to-purple-950/30 border-2 border-amber-300/50 dark:border-amber-700/50">
						<div class="flex items-center gap-2 mb-4">
							<span class="text-xl">🌳</span>
							<h3 class="text-lg font-semibold text-foreground">The Garden (v5)</h3>
							<span class="text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-200 to-emerald-200 dark:from-amber-800 dark:to-emerald-800 text-foreground-muted">full experience</span>
						</div>
						<p class="text-sm text-foreground-muted mb-4">
							Everything together. Trees, light, magic, life. The complete grove vision—a world unto itself.
						</p>
						<LogoGrid
							logos={gardenConcepts}
							initialSize={96}
							color={greens.grove}
							backgrounds={[
								{ name: 'Dark', class: 'bg-slate-800' },
								{ name: 'Light', class: 'bg-slate-100' },
								{ name: 'Grove', class: 'bg-grove-900' },
								{ name: 'Twilight', class: 'bg-gradient-to-b from-indigo-900 to-purple-950' },
								{ name: 'Golden', class: 'bg-gradient-to-b from-amber-800 to-orange-900' }
							]}
						/>
					</div>

					<!-- Lucide Compositions (v6) - Icons as Building Blocks -->
					<div class="mt-8 p-6 rounded-xl bg-gradient-to-br from-sky-50/50 via-violet-50/50 to-rose-50/50 dark:from-sky-950/30 dark:via-violet-950/30 dark:to-rose-950/30 border-2 border-sky-300/50 dark:border-sky-700/50">
						<div class="flex items-center gap-2 mb-4">
							<span class="text-xl">✨</span>
							<h3 class="text-lg font-semibold text-foreground">Lucide Compositions (v6)</h3>
							<span class="text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-sky-200 to-violet-200 dark:from-sky-800 dark:to-violet-800 text-foreground-muted">pure icons</span>
						</div>
						<p class="text-sm text-foreground-muted mb-4">
							"The grove doesn't need to be drawn. It just needs to be arranged."<br/>
							<em class="text-xs">Built entirely from actual Lucide icon paths—TreePine, TreeDeciduous, Moon, Flame—composed together with SVG transforms.</em>
						</p>
						<LogoGrid
							logos={lucideCompositions}
							initialSize={64}
							color={greens.grove}
							backgrounds={[
								{ name: 'Twilight', class: 'bg-gradient-to-b from-indigo-900 to-purple-950' },
								{ name: 'Dark', class: 'bg-slate-800' },
								{ name: 'Light', class: 'bg-slate-100' },
								{ name: 'Grove', class: 'bg-grove-900' },
								{ name: 'Dawn', class: 'bg-gradient-to-b from-rose-200 to-orange-100' }
							]}
						/>
					</div>

					<!-- THE MEGA FOREST - Panoramic Showcase -->
					<div class="mt-8 p-6 rounded-xl bg-gradient-to-br from-indigo-900 via-purple-950 to-slate-950 border-2 border-amber-500/50 relative overflow-hidden">
						<!-- Ambient glow effects -->
						<div class="absolute inset-0 opacity-30">
							<div class="absolute top-10 left-1/4 w-32 h-32 bg-amber-400/20 rounded-full blur-3xl"></div>
							<div class="absolute top-20 right-1/3 w-24 h-24 bg-yellow-300/15 rounded-full blur-2xl"></div>
							<div class="absolute bottom-10 left-1/2 w-40 h-20 bg-orange-500/20 rounded-full blur-3xl"></div>
						</div>

						<div class="relative z-10">
							<div class="flex items-center gap-2 mb-4">
								<span class="text-2xl">🌲</span>
								<h3 class="text-xl font-bold text-white">The Mega Forest</h3>
								<span class="text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium">all out</span>
							</div>
							<p class="text-sm text-purple-200/80 mb-6">
								Everything. All at once. A panoramic grove stretching into the distance—<br/>
								<em class="text-xs text-purple-300/60">Three layers of depth, moonlit sky, scattered fireflies, and a hearth at the heart of it all.</em>
							</p>

							<!-- Mega Forest Display -->
							<div class="space-y-6">
								<!-- Large showcase -->
								<div class="p-4 rounded-xl bg-gradient-to-b from-indigo-950/80 to-slate-950/80 backdrop-blur-sm border border-purple-500/20">
									<LogoMegaForest class="w-full h-auto max-h-48" color={greens.grove} glowColor="#fde047" fireColor="#f97316" moonColor="#e2e8f0" title="The Mega Forest" />
								</div>

								<!-- Color variations -->
								<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
									<div class="p-3 rounded-lg bg-slate-800/60 backdrop-blur-sm">
										<LogoMegaForest class="w-full h-auto" color={greens.grove} glowColor="#fde047" fireColor="#f97316" moonColor="#e2e8f0" />
										<span class="text-xs text-slate-400 block text-center mt-2">Grove Green</span>
									</div>
									<div class="p-3 rounded-lg bg-gradient-to-b from-rose-100 to-orange-50">
										<LogoMegaForest class="w-full h-auto" color={autumn.pumpkin} glowColor="#fbbf24" fireColor="#dc2626" moonColor="#f97316" />
										<span class="text-xs text-orange-700 block text-center mt-2">Autumn Fire</span>
									</div>
									<div class="p-3 rounded-lg bg-gradient-to-b from-slate-100 to-sky-50">
										<LogoMegaForest class="w-full h-auto" color={winter.frostedPine} glowColor="#e0f2fe" fireColor="#38bdf8" moonColor="#94a3b8" />
										<span class="text-xs text-slate-600 block text-center mt-2">Winter Frost</span>
									</div>
								</div>

								<!-- Stats -->
								<div class="flex items-center justify-center gap-8 pt-4 border-t border-purple-500/20">
									<div class="text-center">
										<span class="text-2xl font-bold text-amber-400">21</span>
										<span class="text-xs text-purple-300/60 block">Trees</span>
									</div>
									<div class="text-center">
										<span class="text-2xl font-bold text-yellow-400">10</span>
										<span class="text-xs text-purple-300/60 block">Fireflies</span>
									</div>
									<div class="text-center">
										<span class="text-2xl font-bold text-slate-300">8</span>
										<span class="text-xs text-purple-300/60 block">Stars</span>
									</div>
									<div class="text-center">
										<span class="text-2xl font-bold text-orange-400">1</span>
										<span class="text-xs text-purple-300/60 block">Hearth</span>
									</div>
								</div>
							</div>
						</div>
					</div>

					<!-- THE BADGE COLLECTION (v7) - Compact Wordmarks -->
					<div class="mt-8 p-6 rounded-xl bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-amber-950/50 dark:via-orange-950/50 dark:to-rose-950/50 border-2 border-amber-400/50 dark:border-amber-600/50">
						<div class="flex items-center gap-2 mb-4">
							<span class="text-2xl">🏷️</span>
							<h3 class="text-xl font-bold text-foreground">The Badge Collection (v7)</h3>
							<span class="text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 text-white font-medium">wordmarks</span>
						</div>
						<p class="text-sm text-foreground-muted mb-6">
							Tight, compact, ready for use. Glass-styled badges with the Grove wordmark in Calistoga.<br/>
							<em class="text-xs text-foreground-faint">Square and circle variants, each with 4 seasonal moods.</em>
						</p>

						<!-- Badge Showcase Grid -->
						<div class="space-y-8">
							<!-- Square Badges -->
							<div>
								<h4 class="text-sm font-medium text-foreground-muted mb-3 flex items-center gap-2">
									<span class="w-4 h-4 rounded bg-amber-200 dark:bg-amber-800"></span>
									Square Badge
								</h4>
								<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
									<div class="flex flex-col items-center gap-2 p-3 rounded-lg bg-white/50 dark:bg-slate-800/50">
										<LogoGroveBadge class="w-24 h-24" variant="default" />
										<span class="text-xs text-foreground-faint">Default</span>
									</div>
									<div class="flex flex-col items-center gap-2 p-3 rounded-lg bg-amber-100/50 dark:bg-amber-900/30">
										<LogoGroveBadge class="w-24 h-24" variant="autumn" />
										<span class="text-xs text-foreground-faint">Autumn</span>
									</div>
									<div class="flex flex-col items-center gap-2 p-3 rounded-lg bg-slate-100/50 dark:bg-slate-700/50">
										<LogoGroveBadge class="w-24 h-24" variant="winter" />
										<span class="text-xs text-foreground-faint">Winter</span>
									</div>
									<div class="flex flex-col items-center gap-2 p-3 rounded-lg bg-indigo-950">
										<LogoGroveBadge class="w-24 h-24" variant="night" />
										<span class="text-xs text-indigo-300">Night</span>
									</div>
								</div>
							</div>

							<!-- Circle Badges -->
							<div>
								<h4 class="text-sm font-medium text-foreground-muted mb-3 flex items-center gap-2">
									<span class="w-4 h-4 rounded-full bg-amber-200 dark:bg-amber-800"></span>
									Circle Badge
								</h4>
								<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
									<div class="flex flex-col items-center gap-2 p-3 rounded-lg bg-white/50 dark:bg-slate-800/50">
										<LogoGroveCircle class="w-24 h-24" variant="default" />
										<span class="text-xs text-foreground-faint">Default</span>
									</div>
									<div class="flex flex-col items-center gap-2 p-3 rounded-lg bg-amber-100/50 dark:bg-amber-900/30">
										<LogoGroveCircle class="w-24 h-24" variant="autumn" />
										<span class="text-xs text-foreground-faint">Autumn</span>
									</div>
									<div class="flex flex-col items-center gap-2 p-3 rounded-lg bg-slate-100/50 dark:bg-slate-700/50">
										<LogoGroveCircle class="w-24 h-24" variant="winter" />
										<span class="text-xs text-foreground-faint">Winter</span>
									</div>
									<div class="flex flex-col items-center gap-2 p-3 rounded-lg bg-indigo-950">
										<LogoGroveCircle class="w-24 h-24" variant="night" />
										<span class="text-xs text-indigo-300">Night</span>
									</div>
								</div>
							</div>

							<!-- Size Comparison -->
							<div class="pt-4 border-t border-amber-300/30 dark:border-amber-700/30">
								<h4 class="text-sm font-medium text-foreground-muted mb-3">Size Comparison</h4>
								<div class="flex items-end justify-center gap-6 p-4 bg-white/40 dark:bg-slate-800/40 rounded-lg">
									<div class="text-center">
										<LogoGroveBadge class="w-12 h-12" variant="autumn" />
										<span class="text-xs text-foreground-faint block mt-1">48px</span>
									</div>
									<div class="text-center">
										<LogoGroveBadge class="w-16 h-16" variant="autumn" />
										<span class="text-xs text-foreground-faint block mt-1">64px</span>
									</div>
									<div class="text-center">
										<LogoGroveBadge class="w-24 h-24" variant="autumn" />
										<span class="text-xs text-foreground-faint block mt-1">96px</span>
									</div>
									<div class="text-center">
										<LogoGroveBadge class="w-32 h-32" variant="autumn" />
										<span class="text-xs text-foreground-faint block mt-1">128px</span>
									</div>
								</div>
							</div>

							<!-- Icon-only variants -->
							<div class="pt-4 border-t border-amber-300/30 dark:border-amber-700/30">
								<h4 class="text-sm font-medium text-foreground-muted mb-3">Icon Only (no text)</h4>
								<div class="flex items-center justify-center gap-6 p-4 bg-gradient-to-r from-indigo-950 via-purple-950 to-indigo-950 rounded-lg">
									<LogoGroveBadge class="w-16 h-16" variant="night" showText={false} />
									<LogoGroveCircle class="w-16 h-16" variant="night" showText={false} />
									<LogoGroveBadge class="w-12 h-12" variant="night" showText={false} />
									<LogoGroveCircle class="w-12 h-12" variant="night" showText={false} />
								</div>
							</div>
						</div>
					</div>

					<!-- The Artifact (Historical Easter Egg) -->
					<div class="mt-8 p-6 rounded-xl bg-slate-100/50 dark:bg-slate-900/50 border border-dashed border-slate-300 dark:border-slate-700">
						<div class="flex items-center gap-2 mb-4">
							<span class="text-xl">🏛️</span>
							<h3 class="text-lg font-semibold text-foreground">The Artifact</h3>
							<span class="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-foreground-muted">museum piece</span>
						</div>
						<p class="text-sm text-foreground-muted mb-4">
							The logo that started the journey. Found hiding in Tabler Icons as <code class="px-1 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs">brand-linktree</code>.
							We keep it here as a reminder of where we came from. 😂
						</p>
						<div class="flex items-center gap-8 p-4 bg-white/60 dark:bg-slate-800/60 rounded-lg">
							<div class="text-center">
								<LogoArtifact size={48} color={greens.grove} />
								<span class="text-xs text-foreground-faint block mt-2">The OG</span>
							</div>
							<div class="text-center">
								<LogoArtifact size={48} color={autumn.amber} />
								<span class="text-xs text-foreground-faint block mt-2">Autumn vibes</span>
							</div>
							<div class="text-center opacity-30">
								<LogoArtifact size={48} color={greens.grove} />
								<span class="text-xs text-foreground-faint block mt-2">Fading away...</span>
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</section>

	<!-- Glass Components Section -->
	<section class="py-8 px-6">
		<div class="max-w-5xl mx-auto">
			<!-- Section Header -->
			<button
				type="button"
				class="w-full flex items-center justify-between p-4 rounded-xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border border-white/60 dark:border-slate-700/60 shadow-sm hover:bg-white/90 dark:hover:bg-slate-800/90 transition-all mb-4"
				onclick={() => expandedSection = expandedSection === 'glass' ? null : 'glass'}
				aria-expanded={expandedSection === 'glass'}
				aria-controls="glass-section-content"
			>
				<div class="flex items-center gap-3">
					<div class="p-2 rounded-lg bg-grove-100 dark:bg-grove-900/40">
						<Sparkles class="w-5 h-5 text-grove-600 dark:text-grove-400" />
					</div>
					<div class="text-left">
						<h2 class="text-xl font-serif text-foreground">Glass Components</h2>
						<p class="text-sm text-foreground-muted">Glassmorphism UI elements with blur effects</p>
					</div>
				</div>
				<ChevronDown class="w-5 h-5 text-foreground-muted transition-transform {expandedSection === 'glass' ? 'rotate-180' : ''}" aria-hidden="true" />
			</button>

			{#if expandedSection === 'glass'}
				<div id="glass-section-content" class="space-y-8 animate-in slide-in-from-top-2 duration-300">
					<!-- Glass Base Component -->
					<div class="p-6 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/40 dark:border-slate-700/40">
						<h3 class="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
							<code class="text-sm px-2 py-1 rounded bg-slate-100 dark:bg-slate-700">&lt;Glass&gt;</code>
							<span class="text-sm font-normal text-foreground-muted">Base glass container</span>
						</h3>

						<div class="grid md:grid-cols-2 gap-6">
							<!-- Preview -->
							<div class="bg-gradient-to-br from-grove-100 to-emerald-100 dark:from-slate-700 dark:to-emerald-900 rounded-xl p-8 flex items-center justify-center min-h-[200px]">
								<Glass variant={glassVariant} intensity={glassIntensity} class="p-6 rounded-xl">
									<p class="text-foreground font-medium">Glass content here</p>
									<p class="text-sm text-foreground-muted mt-1">With {glassVariant} variant</p>
								</Glass>
							</div>

							<!-- Controls -->
							<div class="space-y-4">
								<div>
									<label for="glass-variant" class="block text-sm font-medium text-foreground mb-2">Variant</label>
									<select id="glass-variant" bind:value={glassVariant} class="w-full px-3 py-2 rounded-lg border border-divider bg-surface text-foreground">
										<option value="surface">surface</option>
										<option value="overlay">overlay</option>
										<option value="card">card</option>
										<option value="tint">tint</option>
										<option value="accent">accent</option>
										<option value="muted">muted</option>
									</select>
								</div>
								<div>
									<label for="glass-intensity" class="block text-sm font-medium text-foreground mb-2">Intensity</label>
									<select id="glass-intensity" bind:value={glassIntensity} class="w-full px-3 py-2 rounded-lg border border-divider bg-surface text-foreground">
										<option value="none">none</option>
										<option value="light">light</option>
										<option value="medium">medium</option>
										<option value="strong">strong</option>
									</select>
								</div>
							</div>
						</div>
					</div>

					<!-- GlassButton -->
					<div class="p-6 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/40 dark:border-slate-700/40">
						<h3 class="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
							<code class="text-sm px-2 py-1 rounded bg-slate-100 dark:bg-slate-700">&lt;GlassButton&gt;</code>
							<span class="text-sm font-normal text-foreground-muted">Translucent buttons</span>
						</h3>

						<div class="grid md:grid-cols-2 gap-6">
							<div class="bg-gradient-to-br from-grove-100 to-emerald-100 dark:from-slate-700 dark:to-emerald-900 rounded-xl p-8 flex items-center justify-center min-h-[150px]">
								<GlassButton variant={buttonVariant} size={buttonSize}>
									<MousePointer class="w-4 h-4" />
									Click me
								</GlassButton>
							</div>

							<div class="space-y-4">
								<div>
									<label for="button-variant" class="block text-sm font-medium text-foreground mb-2">Variant</label>
									<select id="button-variant" bind:value={buttonVariant} class="w-full px-3 py-2 rounded-lg border border-divider bg-surface text-foreground">
										<option value="default">default</option>
										<option value="accent">accent</option>
										<option value="dark">dark</option>
										<option value="ghost">ghost</option>
										<option value="outline">outline</option>
									</select>
								</div>
								<div>
									<label for="button-size" class="block text-sm font-medium text-foreground mb-2">Size</label>
									<select id="button-size" bind:value={buttonSize} class="w-full px-3 py-2 rounded-lg border border-divider bg-surface text-foreground">
										<option value="sm">sm</option>
										<option value="md">md</option>
										<option value="lg">lg</option>
										<option value="icon">icon</option>
									</select>
								</div>
							</div>
						</div>
					</div>

					<!-- GlassCard -->
					<div class="p-6 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/40 dark:border-slate-700/40">
						<h3 class="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
							<code class="text-sm px-2 py-1 rounded bg-slate-100 dark:bg-slate-700">&lt;GlassCard&gt;</code>
							<span class="text-sm font-normal text-foreground-muted">Content cards with glass effect</span>
						</h3>

						<div class="grid md:grid-cols-2 gap-6">
							<div class="bg-gradient-to-br from-grove-100 to-emerald-100 dark:from-slate-700 dark:to-emerald-900 rounded-xl p-8 flex items-center justify-center min-h-[200px]">
								<GlassCard
									variant={cardVariant}
									hoverable={cardHoverable}
									title="Card Title"
									description="A beautiful glass card"
									class="w-full max-w-xs"
								>
									<p class="text-sm text-foreground-muted">Card content goes here. Try hovering!</p>
								</GlassCard>
							</div>

							<div class="space-y-4">
								<div>
									<label for="card-variant" class="block text-sm font-medium text-foreground mb-2">Variant</label>
									<select id="card-variant" bind:value={cardVariant} class="w-full px-3 py-2 rounded-lg border border-divider bg-surface text-foreground">
										<option value="default">default</option>
										<option value="accent">accent</option>
										<option value="dark">dark</option>
										<option value="muted">muted</option>
										<option value="frosted">frosted</option>
									</select>
								</div>
								<label class="flex items-center gap-3 cursor-pointer">
									<input type="checkbox" bind:checked={cardHoverable} class="w-5 h-5 rounded" />
									<span class="text-sm text-foreground">Hoverable</span>
								</label>
							</div>
						</div>
					</div>

					<!-- GlassLogo -->
					<div class="p-6 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/40 dark:border-slate-700/40">
						<h3 class="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
							<code class="text-sm px-2 py-1 rounded bg-slate-100 dark:bg-slate-700">&lt;GlassLogo&gt;</code>
							<span class="text-sm font-normal text-foreground-muted">Seasonal glassmorphism logo</span>
						</h3>

						<div class="grid md:grid-cols-2 gap-6">
							<div class="bg-gradient-to-br from-grove-100 to-emerald-100 dark:from-slate-700 dark:to-emerald-900 rounded-xl p-8 flex items-center justify-center min-h-[200px]">
								<GlassLogo
									variant={logoVariant}
									season={logoSeason}
									breathing={logoBreathing}
									class="w-24 h-32"
								/>
							</div>

							<div class="space-y-4">
								<div>
									<label for="logo-variant" class="block text-sm font-medium text-foreground mb-2">Variant</label>
									<select id="logo-variant" bind:value={logoVariant} class="w-full px-3 py-2 rounded-lg border border-divider bg-surface text-foreground">
										<option value="default">default</option>
										<option value="accent">accent</option>
										<option value="frosted">frosted</option>
										<option value="dark">dark</option>
										<option value="ethereal">ethereal</option>
									</select>
								</div>
								<div>
									<label for="logo-season" class="block text-sm font-medium text-foreground mb-2">Season</label>
									<select id="logo-season" bind:value={logoSeason} class="w-full px-3 py-2 rounded-lg border border-divider bg-surface text-foreground">
										<option value="spring">spring</option>
										<option value="summer">summer</option>
										<option value="autumn">autumn</option>
										<option value="winter">winter</option>
									</select>
								</div>
								<label class="flex items-center gap-3 cursor-pointer">
									<input type="checkbox" bind:checked={logoBreathing} class="w-5 h-5 rounded" />
									<span class="text-sm text-foreground">Breathing animation</span>
								</label>
							</div>
						</div>
					</div>

					<!-- GlassOverlay -->
					<div class="p-6 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/40 dark:border-slate-700/40">
						<h3 class="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
							<code class="text-sm px-2 py-1 rounded bg-slate-100 dark:bg-slate-700">&lt;GlassOverlay&gt;</code>
							<span class="text-sm font-normal text-foreground-muted">Fullscreen backdrop overlay</span>
						</h3>

						<div class="flex items-center gap-4">
							<GlassButton variant="accent" onclick={() => showOverlayDemo = true}>
								<Eye class="w-4 h-4" />
								Show Overlay Demo
							</GlassButton>
							<p class="text-sm text-foreground-muted">Click to see the overlay effect</p>
						</div>
					</div>

					<!-- GlassCarousel -->
					<div class="p-6 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/40 dark:border-slate-700/40">
						<h3 class="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
							<code class="text-sm px-2 py-1 rounded bg-slate-100 dark:bg-slate-700">&lt;GlassCarousel&gt;</code>
							<span class="text-sm font-normal text-foreground-muted">Stack-style image carousel</span>
						</h3>

						<div class="max-w-md mx-auto">
							<GlassCarousel images={carouselImages} variant="frosted" />
						</div>
						<p class="text-center text-sm text-foreground-muted mt-4">Swipe, drag, or use arrows to navigate</p>
					</div>

					<!-- More components note -->
					<div class="text-center p-6 rounded-xl bg-grove-50/50 dark:bg-grove-950/20 border border-dashed border-grove-300 dark:border-grove-800">
						<p class="text-foreground-muted">
							Plus: <code class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-sm">GlassNavbar</code> and
							<code class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-sm">GlassConfirmDialog</code>
						</p>
						<p class="text-sm text-foreground-faint mt-1">See them in action throughout Grove</p>
					</div>
				</div>
			{/if}
		</div>
	</section>

	<!-- Nature Assets Section -->
	<section class="py-8 px-6">
		<div class="max-w-5xl mx-auto">
			<!-- Section Header -->
			<button
				type="button"
				class="w-full flex items-center justify-between p-4 rounded-xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border border-white/60 dark:border-slate-700/60 shadow-sm hover:bg-white/90 dark:hover:bg-slate-800/90 transition-all mb-4"
				onclick={() => expandedSection = expandedSection === 'nature' ? null : 'nature'}
				aria-expanded={expandedSection === 'nature'}
				aria-controls="nature-section-content"
			>
				<div class="flex items-center gap-3">
					<div class="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
						<TreeIcon class="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
					</div>
					<div class="text-left">
						<h2 class="text-xl font-serif text-foreground">Nature Assets</h2>
						<p class="text-sm text-foreground-muted">{Object.keys(assets).length} SVG components across {categories.length} categories</p>
					</div>
				</div>
				<ChevronDown class="w-5 h-5 text-foreground-muted transition-transform {expandedSection === 'nature' ? 'rotate-180' : ''}" aria-hidden="true" />
			</button>

			{#if expandedSection === 'nature'}
				<div id="nature-section-content" class="p-6 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/40 dark:border-slate-700/40 animate-in slide-in-from-top-2 duration-300">
					<div class="grid md:grid-cols-2 gap-8">
						<!-- Preview Panel -->
						<div>
							<div class="bg-gradient-to-b from-sky-100 to-emerald-50 dark:from-slate-800 dark:to-emerald-950 rounded-xl p-8 flex items-center justify-center min-h-[300px] border border-divider">
								{#if CurrentComponent}
									{#key selectedAsset + JSON.stringify(propValues)}
										<svelte:boundary onerror={(e) => { componentError = e instanceof Error ? e.message : String(e); }}>
											<CurrentComponent class="w-32 h-32" {...propValues} />
											{#snippet failed()}
												<div class="text-center text-red-500 dark:text-red-400">
													<p class="text-sm font-medium">Component error</p>
													<p class="text-xs mt-1 opacity-75">{componentError ?? 'Failed to render'}</p>
												</div>
											{/snippet}
										</svelte:boundary>
									{/key}
								{/if}
							</div>
							<p class="text-center mt-4 text-foreground-muted font-mono text-sm">
								&lt;{selectedAsset} /&gt;
							</p>
						</div>

						<!-- Controls Panel -->
						<div class="space-y-6">
							<!-- Asset Selector -->
							<div>
								<label for="asset-selector" class="block text-sm font-medium text-foreground mb-2">Select Asset</label>
								<select
									id="asset-selector"
									bind:value={selectedAsset}
									onchange={onAssetChange}
									class="w-full px-4 py-2 rounded-lg border border-divider bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-accent-subtle"
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
									<h4 class="text-sm font-medium text-foreground-muted uppercase tracking-wide">Properties</h4>

									{#each getCurrentAsset().props as prop}
										<div class="space-y-2">
											<label for="prop-{prop}" class="block text-sm font-medium text-foreground">{prop}</label>

											{#if isColorProp(prop)}
												{@const colorError = getColorInputError(prop)}
												<div class="space-y-2">
													<div class="flex gap-2 items-center">
														<input
															id="prop-{prop}"
															type="color"
															value={propValues[prop] ?? '#16a34a'}
															oninput={(e) => propValues[prop] = e.currentTarget.value}
															class="w-10 h-10 rounded cursor-pointer border border-divider"
														/>
														<input
															type="text"
															value={pendingColorValues[prop] ?? propValues[prop] ?? ''}
															oninput={(e) => debouncedColorUpdate(prop, e.currentTarget.value)}
															placeholder="#16a34a"
															class="flex-1 px-3 py-2 rounded-lg border bg-surface text-foreground font-mono text-sm {colorError ? 'border-red-400 dark:border-red-600' : 'border-divider'}"
															aria-invalid={!!colorError}
															aria-describedby={colorError ? `${prop}-error` : undefined}
														/>
													</div>
													{#if colorError}
														<p id="{prop}-error" class="text-xs text-red-500 dark:text-red-400">{colorError}</p>
													{/if}
													<div class="flex flex-wrap gap-1">
														{#each colorPresets as preset}
															<button
																type="button"
																onclick={() => { propValues[prop] = preset.value; pendingColorValues[prop] = preset.value; }}
																class="w-6 h-6 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
																style="background-color: {preset.value}"
																title={preset.name}
															></button>
														{/each}
													</div>
												</div>
											{:else if isBooleanProp(prop)}
												<label class="flex items-center gap-3 cursor-pointer">
													<input type="checkbox" bind:checked={propValues[prop]} class="w-5 h-5 rounded" />
													<span class="text-sm text-foreground-muted">{propValues[prop] !== false ? 'Enabled' : 'Disabled'}</span>
												</label>
											{:else if hasOptions(prop)}
												<select
													id="prop-{prop}"
													bind:value={propValues[prop]}
													class="w-full px-3 py-2 rounded-lg border border-divider bg-surface text-foreground text-sm"
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
														aria-valuemin={range.min}
														aria-valuemax={range.max}
														aria-valuenow={propValues[prop] ?? range.min}
													/>
													<div class="flex justify-between text-xs text-foreground-faint">
														<span>{range.min}</span>
														<span class="font-medium text-foreground-muted">{propValues[prop]?.toFixed(range.step < 1 ? 1 : 0) ?? 'default'}</span>
														<span>{range.max}</span>
													</div>
												</div>
											{:else}
												<input
													id="prop-{prop}"
													type="text"
													bind:value={propValues[prop]}
													placeholder="Default"
													class="w-full px-3 py-2 rounded-lg border border-divider bg-surface text-foreground text-sm"
												/>
											{/if}
										</div>
									{/each}
								</div>
							{/if}

							<!-- Reset button -->
							<button
								type="button"
								onclick={() => propValues = {}}
								class="w-full px-4 py-2 rounded-lg border border-divider text-foreground-muted hover:bg-surface transition-colors text-sm"
							>
								Reset to Defaults
							</button>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</section>

	<!-- Typography Section -->
	<section class="py-8 px-6">
		<div class="max-w-5xl mx-auto">
			<!-- Section Header -->
			<button
				type="button"
				class="w-full flex items-center justify-between p-4 rounded-xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border border-white/60 dark:border-slate-700/60 shadow-sm hover:bg-white/90 dark:hover:bg-slate-800/90 transition-all mb-4"
				onclick={() => expandedSection = expandedSection === 'typography' ? null : 'typography'}
				aria-expanded={expandedSection === 'typography'}
				aria-controls="typography-section-content"
			>
				<div class="flex items-center gap-3">
					<div class="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/40">
						<Type class="w-5 h-5 text-purple-600 dark:text-purple-400" />
					</div>
					<div class="text-left">
						<h2 class="text-xl font-serif text-foreground">Typography</h2>
						<p class="text-sm text-foreground-muted">10 curated fonts for every mood - from cozy headers to crisp code</p>
					</div>
				</div>
				<ChevronDown class="w-5 h-5 text-foreground-muted transition-transform {expandedSection === 'typography' ? 'rotate-180' : ''}" aria-hidden="true" />
			</button>

			{#if expandedSection === 'typography'}
				<div id="typography-section-content" class="space-y-8 animate-in slide-in-from-top-2 duration-300">
					<!-- FontProvider (Dynamic Selection) -->
					<div class="p-4 sm:p-6 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/40 dark:border-slate-700/40">
						<h3 class="text-lg font-semibold text-foreground mb-4 flex flex-wrap items-center gap-2">
							<code class="text-sm px-2 py-1 rounded bg-slate-100 dark:bg-slate-700">&lt;FontProvider&gt;</code>
							<span class="text-sm font-normal text-foreground-muted">Dynamic font selection</span>
						</h3>

						<div class="space-y-4">
							<div class="flex flex-wrap gap-1.5 sm:gap-2">
								{#each fonts as f}
									<button
										class="px-2 py-1 text-xs rounded transition-colors {selectedFont === f.id ? 'bg-purple-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-foreground hover:bg-slate-200 dark:hover:bg-slate-600'}"
										onclick={() => selectedFont = f.id as FontId}
									>{f.name}</button>
								{/each}
							</div>
							<div class="p-4 sm:p-6 bg-white/60 dark:bg-slate-700/60 rounded-lg border border-white/60 dark:border-slate-600/60">
								<div class="flex items-center justify-between mb-3">
									<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs font-medium">
										<span class="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
										{fonts.find(f => f.id === selectedFont)?.name}
									</span>
									<span class="text-xs text-foreground-faint">{fonts.find(f => f.id === selectedFont)?.category}</span>
								</div>
								<FontProvider font={selectedFont} as="p" class="text-xl sm:text-2xl text-foreground">
									The quick brown fox jumps over the lazy dog.
								</FontProvider>
								<p class="text-sm text-foreground-muted mt-2">
									{fonts.find(f => f.id === selectedFont)?.description}
								</p>
							</div>
						</div>
					</div>

					<!-- Display Fonts -->
					<div class="p-4 sm:p-6 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/40 dark:border-slate-700/40">
						<h3 class="text-lg font-semibold text-foreground mb-4">Display & Special Fonts</h3>
						<p class="text-sm text-foreground-muted mb-4">Eye-catching fonts for headers and special moments</p>
						<div class="space-y-3 sm:space-y-4">
							<div class="p-4 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 rounded-lg">
								<Alagard as="h2" class="text-2xl text-purple-900 dark:text-purple-100 mb-2">
									Welcome to the Fantasy Realm
								</Alagard>
								<p class="text-sm text-purple-700 dark:text-purple-300">Alagard - pixel art medieval display font</p>
							</div>
							<div class="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/40 dark:to-orange-900/40 rounded-lg">
								<Calistoga as="h2" class="text-2xl text-amber-900 dark:text-amber-100 mb-2">
									Friendly Headlines Welcome You
								</Calistoga>
								<p class="text-sm text-amber-700 dark:text-amber-300">Calistoga - casual brush serif, warm and inviting</p>
							</div>
							<div class="p-4 bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/40 dark:to-pink-900/40 rounded-lg">
								<Caveat as="h2" class="text-2xl text-rose-900 dark:text-rose-100 mb-2">
									A personal note just for you...
								</Caveat>
								<p class="text-sm text-rose-700 dark:text-rose-300">Caveat - handwritten script, personal and informal</p>
							</div>
						</div>
					</div>

					<!-- Sans-Serif Fonts -->
					<div class="p-4 sm:p-6 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/40 dark:border-slate-700/40">
						<h3 class="text-lg font-semibold text-foreground mb-4">Sans-Serif Fonts</h3>
						<p class="text-sm text-foreground-muted mb-4">Clean, modern fonts for interfaces and body text</p>
						<div class="grid sm:grid-cols-2 gap-3 sm:gap-4">
							<div class="p-4 bg-white/60 dark:bg-slate-700/60 rounded-lg border border-divider">
								<Lexend as="h4" class="text-xl text-foreground mb-1">Lexend (Default)</Lexend>
								<Lexend as="p" class="text-foreground-muted text-sm">Modern, highly readable. Grove's default font.</Lexend>
							</div>
							<div class="p-4 bg-white/60 dark:bg-slate-700/60 rounded-lg border border-divider">
								<Quicksand as="h4" class="text-xl text-foreground mb-1">Quicksand</Quicksand>
								<Quicksand as="p" class="text-foreground-muted text-sm">Geometric sans with rounded terminals. Light and modern.</Quicksand>
							</div>
							<div class="p-4 bg-white/60 dark:bg-slate-700/60 rounded-lg border border-divider">
								<PlusJakartaSans as="h4" class="text-xl text-foreground mb-1">Plus Jakarta Sans</PlusJakartaSans>
								<PlusJakartaSans as="p" class="text-foreground-muted text-sm">Contemporary geometric sans. Balanced and versatile.</PlusJakartaSans>
							</div>
						</div>
					</div>

					<!-- Monospace Fonts -->
					<div class="p-4 sm:p-6 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/40 dark:border-slate-700/40">
						<h3 class="text-lg font-semibold text-foreground mb-4">Monospace Fonts</h3>
						<p class="text-sm text-foreground-muted mb-4">For code, terminals, and technical content</p>
						<div class="space-y-3 sm:space-y-4">
							<div class="p-4 bg-slate-900 rounded-lg">
								<IBMPlexMono as="code" class="text-grove-400 block mb-2">
									// IBM Plex Mono - corporate warmth
								</IBMPlexMono>
								<IBMPlexMono as="pre" class="text-slate-100 text-sm">{`function greet(name: string) {
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
					<div class="p-4 sm:p-6 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/40 dark:border-slate-700/40">
						<h3 class="text-lg font-semibold text-foreground mb-4">Accessibility Fonts</h3>
						<p class="text-sm text-foreground-muted mb-4">Designed for maximum readability and inclusion</p>
						<div class="grid sm:grid-cols-2 gap-3 sm:gap-4">
							<div class="p-4 bg-grove-50 dark:bg-grove-900/40 rounded-lg border border-grove-200 dark:border-grove-700">
								<Atkinson as="h4" class="text-lg text-grove-900 dark:text-grove-100 mb-2">Atkinson Hyperlegible</Atkinson>
								<Atkinson as="p" class="text-grove-700 dark:text-grove-300 text-sm">
									Designed for low vision readers. Maximum character distinction.
								</Atkinson>
							</div>
							<div class="p-4 bg-blue-50 dark:bg-blue-900/40 rounded-lg border border-blue-200 dark:border-blue-700">
								<OpenDyslexic as="h4" class="text-lg text-blue-900 dark:text-blue-100 mb-2">OpenDyslexic</OpenDyslexic>
								<OpenDyslexic as="p" class="text-blue-700 dark:text-blue-300 text-sm">
									Weighted bottoms reduce letter confusion for dyslexic readers.
								</OpenDyslexic>
							</div>
						</div>
					</div>

					<!-- Usage Example -->
					<div class="p-4 sm:p-6 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-dashed border-purple-300 dark:border-purple-800">
						<h3 class="text-lg font-semibold text-foreground mb-4">Usage</h3>
						<IBMPlexMono as="pre" class="p-4 bg-slate-900 rounded-lg text-slate-100 text-sm overflow-x-auto">{`import { Alagard, Caveat, IBMPlexMono } from '@autumnsgrove/groveengine/ui/typography';

// Fantasy game header
<Alagard as="h1" class="text-4xl">Welcome to the Grove</Alagard>

// Handwritten note feel
<Caveat as="p" class="text-2xl">A personal touch...</Caveat>

// Code block
<IBMPlexMono as="code">console.log('hello');</IBMPlexMono>`}</IBMPlexMono>
					</div>
				</div>
			{/if}
		</div>
	</section>

	<!-- Color Palette System - Full Grove palette collection -->
	<section class="py-12 px-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-t border-divider">
		<div class="max-w-4xl mx-auto">
			<div class="text-center mb-8">
				<Glass variant="tint" intensity="light" class="inline-block px-8 py-3 rounded-xl">
					<h2 class="text-2xl font-serif text-foreground">Color Palettes</h2>
					<p class="text-sm text-foreground-muted mt-1">The complete Grove palette system</p>
				</Glass>
			</div>

			<div class="grid md:grid-cols-2 gap-6">
				<!-- Spring Growth -->
				<Glass variant="card" intensity="light" class="p-4 rounded-xl">
					<h3 class="text-sm font-sans text-foreground-muted uppercase tracking-wide mb-3">Spring Growth</h3>
					<div class="flex flex-wrap gap-2">
						{#each Object.entries(spring) as [name, color]}
							<div class="flex flex-col items-center gap-1">
								<div
									class="w-8 h-8 rounded-lg shadow-sm border border-black/10"
									style="background-color: {color};"
									title={name}
								></div>
								<span class="text-xs text-foreground-faint">{name}</span>
							</div>
						{/each}
					</div>
				</Glass>

				<!-- Summer Greens -->
				<Glass variant="card" intensity="light" class="p-4 rounded-xl">
					<h3 class="text-sm font-sans text-foreground-muted uppercase tracking-wide mb-3">Summer Greens</h3>
					<div class="flex flex-wrap gap-2">
						{#each Object.entries(greens) as [name, color]}
							<div class="flex flex-col items-center gap-1">
								<div
									class="w-8 h-8 rounded-lg shadow-sm border border-black/10"
									style="background-color: {color};"
									title={name}
								></div>
								<span class="text-xs text-foreground-faint">{name}</span>
							</div>
						{/each}
					</div>
				</Glass>

				<!-- Autumn Colors -->
				<Glass variant="card" intensity="light" class="p-4 rounded-xl">
					<h3 class="text-sm font-sans text-foreground-muted uppercase tracking-wide mb-3">Autumn Colors</h3>
					<div class="flex flex-wrap gap-2">
						{#each Object.entries(autumn) as [name, color]}
							<div class="flex flex-col items-center gap-1">
								<div
									class="w-8 h-8 rounded-lg shadow-sm border border-black/10"
									style="background-color: {color};"
									title={name}
								></div>
								<span class="text-xs text-foreground-faint">{name}</span>
							</div>
						{/each}
					</div>
				</Glass>

				<!-- Autumn Reds -->
				<Glass variant="card" intensity="light" class="p-4 rounded-xl">
					<h3 class="text-sm font-sans text-foreground-muted uppercase tracking-wide mb-3">Autumn Reds</h3>
					<div class="flex flex-wrap gap-2">
						{#each Object.entries(autumnReds) as [name, color]}
							<div class="flex flex-col items-center gap-1">
								<div
									class="w-8 h-8 rounded-lg shadow-sm border border-black/10"
									style="background-color: {color};"
									title={name}
								></div>
								<span class="text-xs text-foreground-faint">{name}</span>
							</div>
						{/each}
					</div>
				</Glass>

				<!-- Winter Frost -->
				<Glass variant="card" intensity="light" class="p-4 rounded-xl">
					<h3 class="text-sm font-sans text-foreground-muted uppercase tracking-wide mb-3">Winter Frost</h3>
					<div class="flex flex-wrap gap-2">
						{#each Object.entries(winter) as [name, color]}
							<div class="flex flex-col items-center gap-1">
								<div
									class="w-8 h-8 rounded-lg shadow-sm border border-black/10"
									style="background-color: {color};"
									title={name}
								></div>
								<span class="text-xs text-foreground-faint">{name}</span>
							</div>
						{/each}
					</div>
				</Glass>

				<!-- Cherry Blossoms -->
				<Glass variant="card" intensity="light" class="p-4 rounded-xl">
					<h3 class="text-sm font-sans text-foreground-muted uppercase tracking-wide mb-3">Cherry Blossoms</h3>
					<div class="flex flex-wrap gap-2">
						{#each Object.entries(pinks) as [name, color]}
							<div class="flex flex-col items-center gap-1">
								<div
									class="w-8 h-8 rounded-lg shadow-sm border border-black/10"
									style="background-color: {color};"
									title={name}
								></div>
								<span class="text-xs text-foreground-faint">{name}</span>
							</div>
						{/each}
					</div>
				</Glass>

				<!-- Spring Blossoms -->
				<Glass variant="card" intensity="light" class="p-4 rounded-xl">
					<h3 class="text-sm font-sans text-foreground-muted uppercase tracking-wide mb-3">Spring Blossoms</h3>
					<div class="flex flex-wrap gap-2">
						{#each Object.entries(springBlossoms) as [name, color]}
							<div class="flex flex-col items-center gap-1">
								<div
									class="w-8 h-8 rounded-lg shadow-sm border border-black/10"
									style="background-color: {color};"
									title={name}
								></div>
								<span class="text-xs text-foreground-faint">{name}</span>
							</div>
						{/each}
					</div>
				</Glass>

				<!-- Bark & Earth -->
				<Glass variant="card" intensity="light" class="p-4 rounded-xl">
					<h3 class="text-sm font-sans text-foreground-muted uppercase tracking-wide mb-3">Bark & Earth</h3>
					<div class="flex flex-wrap gap-2">
						{#each Object.entries(bark) as [name, color]}
							<div class="flex flex-col items-center gap-1">
								<div
									class="w-8 h-8 rounded-lg shadow-sm border border-black/10"
									style="background-color: {color};"
									title={name}
								></div>
								<span class="text-xs text-foreground-faint">{name}</span>
							</div>
						{/each}
					</div>
				</Glass>

				<!-- Earth Tones -->
				<Glass variant="card" intensity="light" class="p-4 rounded-xl">
					<h3 class="text-sm font-sans text-foreground-muted uppercase tracking-wide mb-3">Earth Tones</h3>
					<div class="flex flex-wrap gap-2">
						{#each Object.entries(earth) as [name, color]}
							<div class="flex flex-col items-center gap-1">
								<div
									class="w-8 h-8 rounded-lg shadow-sm border border-black/10"
									style="background-color: {color};"
									title={name}
								></div>
								<span class="text-xs text-foreground-faint">{name}</span>
							</div>
						{/each}
					</div>
				</Glass>

				<!-- Natural -->
				<Glass variant="card" intensity="light" class="p-4 rounded-xl">
					<h3 class="text-sm font-sans text-foreground-muted uppercase tracking-wide mb-3">Natural</h3>
					<div class="flex flex-wrap gap-2">
						{#each Object.entries(natural) as [name, color]}
							<div class="flex flex-col items-center gap-1">
								<div
									class="w-8 h-8 rounded-lg shadow-sm border border-black/10"
									style="background-color: {color};"
									title={name}
								></div>
								<span class="text-xs text-foreground-faint">{name}</span>
							</div>
						{/each}
					</div>
				</Glass>

				<!-- Midnight Bloom -->
				<Glass variant="card" intensity="light" class="p-4 rounded-xl">
					<h3 class="text-sm font-sans text-foreground-muted uppercase tracking-wide mb-3">Midnight Bloom</h3>
					<div class="flex flex-wrap gap-2">
						{#each Object.entries(midnightBloom) as [name, color]}
							<div class="flex flex-col items-center gap-1">
								<div
									class="w-8 h-8 rounded-lg shadow-sm border border-black/10"
									style="background-color: {color};"
									title={name}
								></div>
								<span class="text-xs text-foreground-faint">{name}</span>
							</div>
						{/each}
					</div>
				</Glass>
			</div>
		</div>
	</section>

	<!-- Bottom spacer -->
	<div class="flex-1"></div>

	<Footer />
</main>

<!-- Overlay Demo -->
{#if showOverlayDemo}
	<GlassOverlay onclick={() => showOverlayDemo = false}>
		<div class="flex items-center justify-center h-full">
			<GlassCard variant="frosted" class="max-w-sm mx-4" title="Overlay Demo">
				<p class="text-foreground-muted">Click anywhere on the backdrop to close this overlay.</p>
				<div class="mt-4">
					<GlassButton variant="accent" onclick={() => showOverlayDemo = false}>Close</GlassButton>
				</div>
			</GlassCard>
		</div>
	</GlassOverlay>
{/if}
