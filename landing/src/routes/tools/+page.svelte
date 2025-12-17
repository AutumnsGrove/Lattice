<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';

	// Import all nature assets
	// Trees
	import Logo from '$lib/components/Logo.svelte';
	import TreePine from '$lib/components/trees/TreePine.svelte';
	import TreeCherry from '$lib/components/trees/TreeCherry.svelte';
	import TreeAspen from '$lib/components/nature/trees/TreeAspen.svelte';
	import TreeBirch from '$lib/components/nature/trees/TreeBirch.svelte';

	// Ground
	import Mushroom from '$lib/components/nature/ground/Mushroom.svelte';
	import MushroomCluster from '$lib/components/nature/ground/MushroomCluster.svelte';
	import Fern from '$lib/components/nature/ground/Fern.svelte';
	import Bush from '$lib/components/nature/ground/Bush.svelte';
	import GrassTuft from '$lib/components/nature/ground/GrassTuft.svelte';
	import Rock from '$lib/components/nature/ground/Rock.svelte';
	import Stump from '$lib/components/nature/ground/Stump.svelte';
	import Log from '$lib/components/nature/ground/Log.svelte';
	import FlowerWild from '$lib/components/nature/ground/FlowerWild.svelte';

	// Creatures
	import Firefly from '$lib/components/nature/creatures/Firefly.svelte';
	import Butterfly from '$lib/components/nature/creatures/Butterfly.svelte';
	import Bird from '$lib/components/nature/creatures/Bird.svelte';
	import BirdFlying from '$lib/components/nature/creatures/BirdFlying.svelte';
	import Bee from '$lib/components/nature/creatures/Bee.svelte';
	import Rabbit from '$lib/components/nature/creatures/Rabbit.svelte';
	import Deer from '$lib/components/nature/creatures/Deer.svelte';
	import Owl from '$lib/components/nature/creatures/Owl.svelte';
	import Squirrel from '$lib/components/nature/creatures/Squirrel.svelte';

	// Sky
	import Cloud from '$lib/components/nature/sky/Cloud.svelte';
	import CloudWispy from '$lib/components/nature/sky/CloudWispy.svelte';
	import Sun from '$lib/components/nature/sky/Sun.svelte';
	import Moon from '$lib/components/nature/sky/Moon.svelte';
	import Star from '$lib/components/nature/sky/Star.svelte';
	import StarCluster from '$lib/components/nature/sky/StarCluster.svelte';
	import StarShooting from '$lib/components/nature/sky/StarShooting.svelte';
	import Rainbow from '$lib/components/nature/sky/Rainbow.svelte';

	// Water
	import Pond from '$lib/components/nature/water/Pond.svelte';
	import LilyPad from '$lib/components/nature/water/LilyPad.svelte';
	import Reeds from '$lib/components/nature/water/Reeds.svelte';
	import Stream from '$lib/components/nature/water/Stream.svelte';

	// Botanical
	import Leaf from '$lib/components/nature/botanical/Leaf.svelte';
	import LeafFalling from '$lib/components/nature/botanical/LeafFalling.svelte';
	import Acorn from '$lib/components/nature/botanical/Acorn.svelte';
	import PineCone from '$lib/components/nature/botanical/PineCone.svelte';
	import Berry from '$lib/components/nature/botanical/Berry.svelte';
	import DandelionPuff from '$lib/components/nature/botanical/DandelionPuff.svelte';
	import Vine from '$lib/components/nature/botanical/Vine.svelte';

	// Structural
	import Lattice from '$lib/components/nature/structural/Lattice.svelte';
	import LatticeWithVine from '$lib/components/nature/structural/LatticeWithVine.svelte';
	import Birdhouse from '$lib/components/nature/structural/Birdhouse.svelte';
	import GardenGate from '$lib/components/nature/structural/GardenGate.svelte';
	import FencePost from '$lib/components/nature/structural/FencePost.svelte';
	import StonePath from '$lib/components/nature/structural/StonePath.svelte';
	import Bridge from '$lib/components/nature/structural/Bridge.svelte';
	import Lantern from '$lib/components/nature/structural/Lantern.svelte';

	// Import palette for presets
	import { greens, bark, earth, natural, autumn, pinks, autumnReds, accents } from '$lib/components/nature/palette';

	// Asset definitions with their props
	const assets = {
		// Trees
		'Logo': { component: Logo, category: 'Trees', props: ['color', 'trunkColor', 'season', 'animate'] },
		'TreePine': { component: TreePine, category: 'Trees', props: ['color', 'trunkColor', 'season', 'animate'] },
		'TreeCherry': { component: TreeCherry, category: 'Trees', props: ['color', 'trunkColor', 'season', 'animate'] },
		'TreeAspen': { component: TreeAspen, category: 'Trees', props: ['color', 'trunkColor', 'season', 'animate'] },
		'TreeBirch': { component: TreeBirch, category: 'Trees', props: ['color', 'trunkColor', 'season', 'animate'] },

		// Ground
		'Mushroom': { component: Mushroom, category: 'Ground', props: ['capColor', 'stemColor', 'spotted'] },
		'MushroomCluster': { component: MushroomCluster, category: 'Ground', props: ['capColor', 'stemColor'] },
		'Fern': { component: Fern, category: 'Ground', props: ['color', 'season', 'animate'] },
		'Bush': { component: Bush, category: 'Ground', props: ['color', 'season', 'animate'] },
		'GrassTuft': { component: GrassTuft, category: 'Ground', props: ['color', 'season', 'animate'] },
		'Rock': { component: Rock, category: 'Ground', props: ['color', 'variant'] },
		'Stump': { component: Stump, category: 'Ground', props: ['barkColor', 'ringColor'] },
		'Log': { component: Log, category: 'Ground', props: ['barkColor'] },
		'FlowerWild': { component: FlowerWild, category: 'Ground', props: ['petalColor', 'centerColor', 'stemColor', 'animate'] },

		// Creatures
		'Firefly': { component: Firefly, category: 'Creatures', props: ['glowColor', 'bodyColor', 'animate', 'intensity'] },
		'Butterfly': { component: Butterfly, category: 'Creatures', props: ['wingColor', 'accentColor', 'animate'] },
		'Bird': { component: Bird, category: 'Creatures', props: ['bodyColor', 'breastColor', 'beakColor', 'animate', 'facing'] },
		'BirdFlying': { component: BirdFlying, category: 'Creatures', props: ['color', 'animate', 'facing'] },
		'Bee': { component: Bee, category: 'Creatures', props: ['bodyColor', 'stripeColor', 'animate'] },
		'Rabbit': { component: Rabbit, category: 'Creatures', props: ['furColor', 'animate', 'facing'] },
		'Deer': { component: Deer, category: 'Creatures', props: ['furColor', 'animate', 'facing'] },
		'Owl': { component: Owl, category: 'Creatures', props: ['featherColor', 'animate', 'facing'] },
		'Squirrel': { component: Squirrel, category: 'Creatures', props: ['furColor', 'animate', 'facing'] },

		// Sky
		'Cloud': { component: Cloud, category: 'Sky', props: ['color', 'animate', 'speed'] },
		'CloudWispy': { component: CloudWispy, category: 'Sky', props: ['color', 'animate', 'speed'] },
		'Sun': { component: Sun, category: 'Sky', props: ['color', 'rays', 'animate'] },
		'Moon': { component: Moon, category: 'Sky', props: ['color', 'phase', 'animate'] },
		'Star': { component: Star, category: 'Sky', props: ['color', 'animate', 'variant', 'speed'] },
		'StarCluster': { component: StarCluster, category: 'Sky', props: ['color', 'animate', 'density'] },
		'StarShooting': { component: StarShooting, category: 'Sky', props: ['color', 'animate', 'direction'] },
		'Rainbow': { component: Rainbow, category: 'Sky', props: ['opacity', 'animate'] },

		// Water
		'Pond': { component: Pond, category: 'Water', props: ['color', 'animate'] },
		'LilyPad': { component: LilyPad, category: 'Water', props: ['padColor', 'flowerColor', 'hasFlower', 'animate'] },
		'Reeds': { component: Reeds, category: 'Water', props: ['color', 'season', 'animate', 'variant'] },
		'Stream': { component: Stream, category: 'Water', props: ['color', 'animate'] },

		// Botanical
		'Leaf': { component: Leaf, category: 'Botanical', props: ['color', 'season', 'variant'] },
		'LeafFalling': { component: LeafFalling, category: 'Botanical', props: ['color', 'season', 'animate', 'variant'] },
		'Acorn': { component: Acorn, category: 'Botanical', props: ['capColor', 'nutColor'] },
		'PineCone': { component: PineCone, category: 'Botanical', props: ['color'] },
		'Berry': { component: Berry, category: 'Botanical', props: ['berryColor', 'variant'] },
		'DandelionPuff': { component: DandelionPuff, category: 'Botanical', props: ['seedColor', 'animate'] },
		'Vine': { component: Vine, category: 'Botanical', props: ['color', 'season', 'animate', 'variant'] },

		// Structural
		'Lattice': { component: Lattice, category: 'Structural', props: ['color', 'variant'] },
		'LatticeWithVine': { component: LatticeWithVine, category: 'Structural', props: ['woodColor', 'vineColor', 'season', 'hasFlowers'] },
		'Birdhouse': { component: Birdhouse, category: 'Structural', props: ['bodyColor', 'roofColor'] },
		'GardenGate': { component: GardenGate, category: 'Structural', props: ['color', 'open'] },
		'FencePost': { component: FencePost, category: 'Structural', props: ['color', 'variant'] },
		'StonePath': { component: StonePath, category: 'Structural', props: ['stoneColor'] },
		'Bridge': { component: Bridge, category: 'Structural', props: ['woodColor'] },
		'Lantern': { component: Lantern, category: 'Structural', props: ['frameColor', 'lit', 'animate', 'variant'] },
	};

	// Color presets from our palettes
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

	// Variant/enum options for various props
	const propOptions: Record<string, string[]> = {
		season: ['spring', 'summer', 'autumn', 'winter'],
		variant: ['default'], // Will be overridden per asset
		facing: ['left', 'right'],
		phase: ['full', 'waning', 'crescent', 'new'],
		speed: ['slow', 'normal', 'fast'],
		intensity: ['subtle', 'normal', 'bright'],
		density: ['sparse', 'normal', 'dense'],
		direction: ['left', 'right'],
	};

	// Asset-specific variant options
	const assetVariants: Record<string, string[]> = {
		'Rock': ['round', 'flat', 'jagged'],
		'Leaf': ['oak', 'maple', 'simple', 'aspen'],
		'LeafFalling': ['simple', 'maple'],
		'Berry': ['cluster', 'single', 'branch'],
		'Vine': ['tendril', 'ivy', 'flowering'],
		'Reeds': ['cattail', 'grass'],
		'Star': ['twinkle', 'point', 'burst', 'classic', 'tiny'],
		'Lattice': ['trellis', 'fence', 'archway'],
		'FencePost': ['pointed', 'flat', 'round'],
		'Lantern': ['hanging', 'standing', 'post'],
	};

	// State
	let selectedAsset = $state('Logo');
	let propValues = $state<Record<string, any>>({});

	// Get categories for grouped dropdown
	const categories = [...new Set(Object.values(assets).map(a => a.category))];

	function getAssetsByCategory(category: string) {
		return Object.entries(assets).filter(([_, a]) => a.category === category);
	}

	// Reset props when asset changes
	function onAssetChange() {
		propValues = {};
	}

	// Get current asset info
	function getCurrentAsset() {
		return assets[selectedAsset as keyof typeof assets];
	}

	// Check if prop is a color prop
	function isColorProp(prop: string): boolean {
		return prop.toLowerCase().includes('color');
	}

	// Check if prop is a boolean
	function isBooleanProp(prop: string): boolean {
		return ['animate', 'spotted', 'rays', 'hasFlower', 'hasFlowers', 'lit', 'open'].includes(prop);
	}

	// Check if prop has enum options
	function hasOptions(prop: string): boolean {
		return prop in propOptions || (prop === 'variant' && selectedAsset in assetVariants);
	}

	// Get options for a prop
	function getOptions(prop: string): string[] {
		if (prop === 'variant' && selectedAsset in assetVariants) {
			return assetVariants[selectedAsset];
		}
		return propOptions[prop] || [];
	}

	// Check if prop is numeric
	function isNumericProp(prop: string): boolean {
		return ['opacity'].includes(prop);
	}
</script>

<svelte:head>
	<title>Asset Viewer — Grove Tools</title>
	<meta name="description" content="Preview and customize Grove nature assets" />
</svelte:head>

<main class="min-h-screen flex flex-col bg-background">
	<Header />

	<article class="flex-1 px-6 py-8">
		<div class="max-w-4xl mx-auto">
			<!-- Page Header -->
			<header class="mb-8 text-center">
				<h1 class="text-3xl md:text-4xl font-serif text-foreground mb-2">Asset Viewer</h1>
				<p class="text-foreground-muted font-sans">Preview and customize nature components</p>
			</header>

			<div class="grid md:grid-cols-2 gap-8">
				<!-- Preview Panel -->
				<div class="order-1">
					<div class="bg-gradient-to-b from-sky-100 to-emerald-50 dark:from-slate-800 dark:to-emerald-950 rounded-xl p-8 flex items-center justify-center min-h-[300px] border border-divider">
						{#if getCurrentAsset()}
							<svelte:component
								this={getCurrentAsset().component}
								class="w-32 h-32"
								{...propValues}
							/>
						{/if}
					</div>

					<!-- Asset name display -->
					<p class="text-center mt-4 text-foreground-muted font-mono text-sm">
						&lt;{selectedAsset} /&gt;
					</p>
				</div>

				<!-- Controls Panel -->
				<div class="order-2 space-y-6">
					<!-- Asset Selector -->
					<div>
						<label for="asset-selector" class="block text-sm font-sans text-foreground-muted mb-2">Select Asset</label>
						<select
							id="asset-selector"
							bind:value={selectedAsset}
							onchange={onAssetChange}
							class="w-full px-4 py-2 rounded-lg border border-divider bg-background text-foreground font-sans focus:outline-none focus:ring-2 focus:ring-accent-subtle"
							aria-label="Select asset to preview"
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
						<div class="space-y-4">
							<h3 class="text-sm font-sans text-foreground-muted uppercase tracking-wide">Properties</h3>

							{#each getCurrentAsset().props as prop}
								<div class="space-y-2">
									<label class="block text-sm font-sans text-foreground">{prop}</label>

									{#if isColorProp(prop)}
										<!-- Color picker with presets -->
										<div class="space-y-2">
											<div class="flex gap-2 items-center">
												<input
													type="color"
													bind:value={propValues[prop]}
													class="w-10 h-10 rounded cursor-pointer border border-divider"
													aria-label="{prop} color picker"
												/>
												<input
													type="text"
													bind:value={propValues[prop]}
													placeholder="#16a34a"
													pattern="^#[0-9A-Fa-f]{6}$"
													class="flex-1 px-3 py-2 rounded-lg border border-divider bg-background text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent-subtle invalid:border-red-500"
													aria-label="{prop} hex color value"
												/>
											</div>
											<!-- Color presets -->
											<div class="flex flex-wrap gap-1" role="group" aria-label="Color presets">
												{#each colorPresets as preset}
													<button
														type="button"
														onclick={() => propValues[prop] = preset.value}
														class="w-6 h-6 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
														style="background-color: {preset.value}"
														title={preset.name}
														aria-label="Apply {preset.name} color"
													></button>
												{/each}
											</div>
										</div>
									{:else if isBooleanProp(prop)}
										<!-- Toggle switch -->
										<label class="flex items-center gap-3 cursor-pointer">
											<input
												type="checkbox"
												bind:checked={propValues[prop]}
												class="w-5 h-5 rounded border-divider text-accent-muted focus:ring-accent-subtle"
												aria-label="Toggle {prop}"
											/>
											<span class="text-sm text-foreground-muted">
												{propValues[prop] !== false ? 'Enabled' : 'Disabled'}
											</span>
										</label>
									{:else if hasOptions(prop)}
										<!-- Dropdown for enums -->
										<select
											bind:value={propValues[prop]}
											class="w-full px-3 py-2 rounded-lg border border-divider bg-background text-foreground font-sans text-sm focus:outline-none focus:ring-2 focus:ring-accent-subtle"
											aria-label="Select {prop} option"
										>
											<option value={undefined}>Default</option>
											{#each getOptions(prop) as option}
												<option value={option}>{option}</option>
											{/each}
										</select>
									{:else if isNumericProp(prop)}
										<!-- Number/range input -->
										<input
											type="range"
											min="0"
											max="1"
											step="0.1"
											bind:value={propValues[prop]}
											class="w-full"
											aria-label="{prop} value"
										/>
										<span class="text-xs text-foreground-faint">{propValues[prop] !== undefined ? propValues[prop].toFixed(1) : '0.5 (default)'}</span>
									{:else}
										<!-- Text input fallback -->
										<input
											type="text"
											bind:value={propValues[prop]}
											placeholder="Default"
											class="w-full px-3 py-2 rounded-lg border border-divider bg-background text-foreground font-sans text-sm focus:outline-none focus:ring-2 focus:ring-accent-subtle"
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
						class="w-full px-4 py-2 rounded-lg border border-divider text-foreground-muted hover:bg-surface transition-colors font-sans text-sm"
					>
						Reset to Defaults
					</button>
				</div>
			</div>

			<!-- Asset count -->
			<p class="text-center mt-12 text-foreground-faint font-sans text-sm">
				{Object.keys(assets).length} assets available across {categories.length} categories
			</p>
		</div>
	</article>

	<Footer />
</main>
