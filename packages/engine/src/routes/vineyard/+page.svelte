<script lang="ts">
	import {
		// Glass suite
		Glass,
		GlassButton,
		GlassCard,
		GlassCarousel,
		GlassConfirmDialog,
		GlassNavbar,
		GlassOverlay,
		GlassLogo,
		// Basic UI
		Button,
		Card,
		Badge,
		Dialog,
		Input,
		Textarea,
		Select,
		Tabs,
		Accordion,
		Skeleton,
		Spinner,
		CollapsibleSection,
	} from '$lib/ui/components/ui';
	import { StatusBadge, ScoreBar, CreditBalance } from '$lib/ui/components/indicators';
	import { SearchInput } from '$lib/ui/components/forms';
	import {
		// Typography components
		FontProvider,
		Lexend, Atkinson, OpenDyslexic, Luciole,
		Nunito, Quicksand, Manrope, InstrumentSans, PlusJakartaSans,
		Cormorant, BodoniModa, Lora, EBGaramond, Merriweather, Fraunces,
		IBMPlexMono, Cozette,
		Alagard, Calistoga, Caveat,
		fonts, fontCategoryLabels,
		type FontId,
	} from '$lib/ui/components/typography';
	import {
		greens, bark, earth, natural,
		spring, springBlossoms, autumn, pinks, autumnReds, winter,
		accents, midnightBloom
	} from '$lib/ui/components/nature/palette';
	import { grove, cream, bark as barkTokens, status } from '$lib/ui/tokens/colors';
	import { Sparkles, Palette, Box, ChevronRight, Type } from 'lucide-svelte';

	// Interactive state for demos
	let showConfirmDialog = $state(false);
	let showOverlay = $state(false);
	let confirmResult = $state<string | null>(null);
	let selectedTab = $state('first');
	let inputValue = $state('');
	let textareaValue = $state('');
	let selectValue = $state('');
	let searchValue = $state('');
	let accordionOpen = $state<string | null>(null);
	let dialogOpen = $state(false);
	let scoreValue = $state(75);
	let creditValue = $state(42);
	let logoSeason = $state<'spring' | 'summer' | 'autumn' | 'winter'>('summer');
	let glassVariant = $state<'surface' | 'overlay' | 'card' | 'tint' | 'accent' | 'muted'>('surface');
	let glassIntensity = $state<'none' | 'light' | 'medium' | 'strong'>('medium');
	let carouselVariant = $state<'default' | 'frosted' | 'minimal'>('default');
	let carouselAutoplay = $state(false);
	let selectedFont = $state<FontId>('alagard');

	// Demo slides for the carousel
	const carouselSlides = [
		{ title: 'Spring', color: 'from-emerald-400 to-lime-300', icon: '🌸' },
		{ title: 'Summer', color: 'from-amber-400 to-orange-300', icon: '☀️' },
		{ title: 'Autumn', color: 'from-orange-500 to-red-400', icon: '🍂' },
		{ title: 'Winter', color: 'from-slate-400 to-blue-300', icon: '❄️' },
	];

	function handleConfirm() {
		confirmResult = 'Confirmed! Yippee!';
		showConfirmDialog = false;
		setTimeout(() => confirmResult = null, 3000);
	}

	function handleCancel() {
		confirmResult = 'Cancelled (and that\'s okay!)';
		showConfirmDialog = false;
		setTimeout(() => confirmResult = null, 3000);
	}

	const seasons = ['spring', 'summer', 'autumn', 'winter'] as const;
	const glassVariants = ['surface', 'overlay', 'card', 'tint', 'accent', 'muted'] as const;
	const glassIntensities = ['none', 'light', 'medium', 'strong'] as const;
	const carouselVariants = ['default', 'frosted', 'minimal'] as const;
</script>

<div class="max-w-6xl mx-auto px-6 py-12">
	<!-- Hero Section -->
	<section class="text-center mb-16">
		<div class="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-grove-100 text-grove-700 text-sm font-medium">
			<span>Lattice UI</span>
			<Badge variant="secondary">v0.2.0</Badge>
		</div>
		<h1 class="text-4xl font-bold text-bark-900 mb-4">Grove Component Vineyard</h1>
		<p class="text-lg text-bark-600 max-w-2xl mx-auto">
			Every vine starts somewhere. This is where Grove's UI components grow,
			ready to be picked and planted throughout the ecosystem.
		</p>
	</section>

	<!-- Quick Nav -->
	<nav class="flex flex-wrap justify-center gap-4 mb-16">
		<a href="#glass" class="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/60 backdrop-blur-sm border border-white/60 text-bark-700 hover:bg-white/80 transition-colors">
			<Sparkles class="w-4 h-4 text-grove-600" />
			Glass Suite
		</a>
		<a href="#components" class="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/60 backdrop-blur-sm border border-white/60 text-bark-700 hover:bg-white/80 transition-colors">
			<Box class="w-4 h-4 text-grove-600" />
			UI Components
		</a>
		<a href="#typography" class="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/60 backdrop-blur-sm border border-white/60 text-bark-700 hover:bg-white/80 transition-colors">
			<Type class="w-4 h-4 text-grove-600" />
			Typography
		</a>
		<a href="#palettes" class="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/60 backdrop-blur-sm border border-white/60 text-bark-700 hover:bg-white/80 transition-colors">
			<Palette class="w-4 h-4 text-grove-600" />
			Color Palettes
		</a>
	</nav>

	<!-- ========================================== -->
	<!-- GLASS COMPONENTS - Special Section -->
	<!-- ========================================== -->
	<section id="glass" class="mb-20 scroll-mt-20">
		<div class="flex items-center gap-3 mb-8">
			<div class="p-2 rounded-lg bg-white/60 backdrop-blur-sm">
				<Sparkles class="w-6 h-6 text-grove-600" />
			</div>
			<div>
				<h2 class="text-2xl font-bold text-bark-900">Glass Suite</h2>
				<p class="text-bark-600">Frosted glassmorphism components with that cozy Grove warmth</p>
			</div>
		</div>

		<div class="grid gap-8">
			<!-- Glass Base Component -->
			<GlassCard title="Glass" variant="frosted">
				<p class="text-sm text-bark-600 mb-4">The foundation of all glassmorphism effects</p>
				<div class="space-y-4">
					<div class="flex flex-wrap gap-2 mb-4">
						<span class="text-sm text-bark-600">Variant:</span>
						{#each glassVariants as v}
							<button
								class="px-2 py-1 text-xs rounded transition-colors {glassVariant === v ? 'bg-grove-600 text-white' : 'bg-bark-100 text-bark-700 hover:bg-bark-200'}"
								onclick={() => glassVariant = v}
							>{v}</button>
						{/each}
					</div>
					<div class="flex flex-wrap gap-2 mb-4">
						<span class="text-sm text-bark-600">Blur:</span>
						{#each glassIntensities as i}
							<button
								class="px-2 py-1 text-xs rounded transition-colors {glassIntensity === i ? 'bg-grove-600 text-white' : 'bg-bark-100 text-bark-700 hover:bg-bark-200'}"
								onclick={() => glassIntensity = i}
							>{i}</button>
						{/each}
					</div>
					<div class="relative h-32 rounded-lg overflow-hidden bg-gradient-to-br from-grove-400 via-grove-500 to-grove-600">
						<div class="absolute inset-4">
							<Glass variant={glassVariant} intensity={glassIntensity} class="w-full h-full flex items-center justify-center rounded-lg">
								<span class="text-bark-800 font-medium">Glass: {glassVariant} / {glassIntensity}</span>
							</Glass>
						</div>
					</div>
				</div>
			</GlassCard>

			<!-- GlassButton -->
			<GlassCard title="GlassButton" variant="frosted">
				<p class="text-sm text-bark-600 mb-4">Buttons with frosted glass effects and warm grove tones</p>
				<div class="flex flex-wrap gap-4 items-center">
					<GlassButton variant="default" onclick={() => alert('Default clicked!')}>
						Default
					</GlassButton>
					<GlassButton variant="accent" onclick={() => alert('Accent clicked!')}>
						Accent
					</GlassButton>
					<GlassButton variant="dark" onclick={() => alert('Dark clicked!')}>
						Dark
					</GlassButton>
					<GlassButton variant="ghost" onclick={() => alert('Ghost clicked!')}>
						Ghost
					</GlassButton>
					<GlassButton variant="outline" onclick={() => alert('Outline clicked!')}>
						Outline
					</GlassButton>
				</div>
				<div class="flex flex-wrap gap-4 items-center mt-4">
					<GlassButton size="sm">Small</GlassButton>
					<GlassButton size="md">Medium</GlassButton>
					<GlassButton size="lg">Large</GlassButton>
					<GlassButton disabled>Disabled</GlassButton>
				</div>
			</GlassCard>

			<!-- GlassCard -->
			<GlassCard title="GlassCard" variant="frosted">
				<p class="text-sm text-bark-600 mb-4">Translucent cards with header/footer slots and hover effects</p>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<GlassCard title="Default" hoverable>
						<p class="text-bark-600 text-sm">A warm, inviting card.</p>
					</GlassCard>
					<GlassCard title="Accent" variant="accent" hoverable>
						<p class="text-bark-600 text-sm">With grove accent tones.</p>
					</GlassCard>
					<GlassCard title="Frosted" variant="frosted" hoverable>
						<p class="text-bark-600 text-sm">Maximum frost effect.</p>
					</GlassCard>
				</div>
			</GlassCard>

			<!-- GlassConfirmDialog -->
			<GlassCard title="GlassConfirmDialog" variant="frosted">
				<p class="text-sm text-bark-600 mb-4">Confirmation dialogs with glassmorphism and clear intent</p>
				<div class="flex flex-wrap gap-4 items-center">
					<GlassButton onclick={() => showConfirmDialog = true}>
						Open Confirm Dialog
					</GlassButton>
					{#if confirmResult}
						<span class="px-3 py-1 bg-grove-100 text-grove-700 rounded-full text-sm animate-pulse">
							{confirmResult}
						</span>
					{/if}
				</div>
				<GlassConfirmDialog
					open={showConfirmDialog}
					title="Confirm Action"
					message="Are you sure you want to do this wonderful thing?"
					confirmLabel="Yes, do it!"
					cancelLabel="Maybe later"
					onconfirm={handleConfirm}
					oncancel={handleCancel}
				/>
			</GlassCard>

			<!-- GlassOverlay -->
			<GlassCard title="GlassOverlay" variant="frosted">
				<p class="text-sm text-bark-600 mb-4">Fullscreen backdrop overlay for modals and focus states</p>
				<GlassButton onclick={() => showOverlay = true}>
					Show Overlay (click to dismiss)
				</GlassButton>
				{#if showOverlay}
					<GlassOverlay variant="dark" intensity="medium" interactive onclick={() => showOverlay = false}>
						<div class="text-white text-center">
							<p class="text-2xl font-bold mb-2">Overlay Active!</p>
							<p class="text-white/80">Click anywhere to dismiss</p>
						</div>
					</GlassOverlay>
				{/if}
			</GlassCard>

			<!-- GlassLogo -->
			<GlassCard title="GlassLogo" variant="frosted">
				<p class="text-sm text-bark-600 mb-4">Animated Grove logo with seasonal color palettes</p>
				<div class="space-y-4">
					<div class="flex flex-wrap gap-2 mb-4">
						<span class="text-sm text-bark-600">Season:</span>
						{#each seasons as s}
							<button
								class="px-3 py-1 text-sm rounded-full transition-colors {logoSeason === s ? 'bg-grove-600 text-white' : 'bg-bark-100 text-bark-700 hover:bg-bark-200'}"
								onclick={() => logoSeason = s}
							>{s}</button>
						{/each}
					</div>
					<div class="flex justify-center gap-8 items-end">
						<div class="text-center">
							<GlassLogo size={80} season={logoSeason} />
							<p class="text-xs text-bark-500 mt-2">Default</p>
						</div>
						<div class="text-center">
							<GlassLogo size={80} season={logoSeason} variant="frosted" />
							<p class="text-xs text-bark-500 mt-2">Frosted</p>
						</div>
						<div class="text-center">
							<GlassLogo size={80} season={logoSeason} variant="ethereal" breathing />
							<p class="text-xs text-bark-500 mt-2">Ethereal + Breathing</p>
						</div>
					</div>
				</div>
			</GlassCard>

			<!-- GlassNavbar -->
			<GlassCard title="GlassNavbar" variant="frosted">
				<p class="text-sm text-bark-600 mb-4">Sticky navigation header with glass effect (see top of page!)</p>
				<div class="relative h-20 rounded-lg overflow-hidden bg-gradient-to-r from-grove-400 to-grove-600">
					<GlassNavbar maxWidth="default">
						{#snippet logo()}
							<span class="font-semibold text-bark-800">Mini Navbar Demo</span>
						{/snippet}
						{#snippet actions()}
							<span class="text-sm text-bark-600">Actions go here</span>
						{/snippet}
					</GlassNavbar>
				</div>
				<p class="text-sm text-bark-500 mt-2">
					The real GlassNavbar is at the top of this page!
				</p>
			</GlassCard>

			<!-- GlassCarousel -->
			<GlassCard title="GlassCarousel" variant="frosted">
				<p class="text-sm text-bark-600 mb-4">Stack-style carousel with swipe, drag, and keyboard navigation</p>
				<div class="space-y-4">
					<div class="flex flex-wrap gap-4 items-center">
						<div class="flex flex-wrap gap-2">
							<span class="text-sm text-bark-600">Variant:</span>
							{#each carouselVariants as v}
								<button
									class="px-2 py-1 text-xs rounded transition-colors {carouselVariant === v ? 'bg-grove-600 text-white' : 'bg-bark-100 text-bark-700 hover:bg-bark-200'}"
									onclick={() => carouselVariant = v}
								>{v}</button>
							{/each}
						</div>
						<label class="flex items-center gap-2 text-sm text-bark-600 cursor-pointer">
							<input type="checkbox" bind:checked={carouselAutoplay} class="rounded" />
							Autoplay
						</label>
					</div>
					<GlassCarousel
						itemCount={carouselSlides.length}
						variant={carouselVariant}
						autoplay={carouselAutoplay}
						autoplayInterval={3000}
					>
						{#snippet item(index)}
							<div class="w-full h-full bg-gradient-to-br {carouselSlides[index].color} flex flex-col items-center justify-center text-white">
								<span class="text-5xl mb-2">{carouselSlides[index].icon}</span>
								<span class="text-2xl font-bold">{carouselSlides[index].title}</span>
								<span class="text-sm opacity-80 mt-1">Slide {index + 1} of {carouselSlides.length}</span>
							</div>
						{/snippet}
					</GlassCarousel>
					<p class="text-xs text-bark-500">Try swiping, dragging, arrow keys, or click the navigation!</p>
				</div>
			</GlassCard>
		</div>
	</section>

	<!-- ========================================== -->
	<!-- GENERAL UI COMPONENTS -->
	<!-- ========================================== -->
	<section id="components" class="mb-20 scroll-mt-20">
		<div class="flex items-center gap-3 mb-8">
			<div class="p-2 rounded-lg bg-white/60 backdrop-blur-sm">
				<Box class="w-6 h-6 text-grove-600" />
			</div>
			<div>
				<h2 class="text-2xl font-bold text-bark-900">UI Components</h2>
				<p class="text-bark-600">The building blocks of every Grove interface</p>
			</div>
		</div>

		<div class="grid gap-8">
			<!-- Buttons -->
			<GlassCard title="Button" variant="default">
				<p class="text-sm text-bark-600 mb-4">Standard buttons with multiple variants and states</p>
				<div class="flex flex-wrap gap-3">
					<Button variant="default" onclick={() => alert('Clicked!')}>Default</Button>
					<Button variant="secondary">Secondary</Button>
					<Button variant="outline">Outline</Button>
					<Button variant="ghost">Ghost</Button>
					<Button variant="destructive">Destructive</Button>
					<Button disabled>Disabled</Button>
				</div>
			</GlassCard>

			<!-- Badge -->
			<GlassCard title="Badge" variant="default">
				<p class="text-sm text-bark-600 mb-4">Small labels for status, categories, and metadata</p>
				<div class="flex flex-wrap gap-2">
					<Badge variant="default">Default</Badge>
					<Badge variant="secondary">Secondary</Badge>
					<Badge variant="outline">Outline</Badge>
					<Badge variant="destructive">Destructive</Badge>
				</div>
			</GlassCard>

			<!-- Input -->
			<GlassCard title="Input" variant="default">
				<p class="text-sm text-bark-600 mb-4">Text input fields with validation states</p>
				<div class="space-y-3 max-w-sm">
					<Input
						placeholder="Type something lovely..."
						bind:value={inputValue}
					/>
					{#if inputValue}
						<p class="text-sm text-grove-600">You typed: "{inputValue}" - nice!</p>
					{/if}
				</div>
			</GlassCard>

			<!-- Textarea -->
			<GlassCard title="Textarea" variant="default">
				<p class="text-sm text-bark-600 mb-4">Multi-line text input for longer content</p>
				<div class="space-y-3 max-w-md">
					<Textarea
						placeholder="Tell us your story..."
						bind:value={textareaValue}
						rows={3}
					/>
					{#if textareaValue}
						<p class="text-sm text-grove-600">{textareaValue.length} characters and counting!</p>
					{/if}
				</div>
			</GlassCard>

			<!-- Select -->
			<GlassCard title="Select" variant="default">
				<p class="text-sm text-bark-600 mb-4">Dropdown selection with customizable options</p>
				<div class="space-y-3 max-w-xs">
					<Select bind:value={selectValue}>
						<option value="">Pick your favorite season...</option>
						<option value="spring">Spring - Fresh beginnings</option>
						<option value="summer">Summer - Warm and bright</option>
						<option value="autumn">Autumn - Cozy vibes</option>
						<option value="winter">Winter - Peaceful quiet</option>
					</Select>
					{#if selectValue}
						<p class="text-sm text-grove-600">Excellent choice: {selectValue}!</p>
					{/if}
				</div>
			</GlassCard>

			<!-- SearchInput -->
			<GlassCard title="SearchInput" variant="default">
				<p class="text-sm text-bark-600 mb-4">Specialized input for search functionality</p>
				<div class="space-y-3 max-w-sm">
					<SearchInput
						placeholder="Search the grove..."
						bind:value={searchValue}
					/>
					{#if searchValue}
						<p class="text-sm text-grove-600">Searching for "{searchValue}"...</p>
					{/if}
				</div>
			</GlassCard>

			<!-- Tabs -->
			<GlassCard title="Tabs" variant="default">
				<p class="text-sm text-bark-600 mb-4">Tabbed interface for organizing content</p>
				<Tabs bind:value={selectedTab}>
					{#snippet tabs()}
						<button data-value="first" class="tab-trigger">First Tab</button>
						<button data-value="second" class="tab-trigger">Second Tab</button>
						<button data-value="third" class="tab-trigger">Third Tab</button>
					{/snippet}
					{#snippet content()}
						{#if selectedTab === 'first'}
							<p class="text-bark-600 p-4">This is the first tab content. Welcome!</p>
						{:else if selectedTab === 'second'}
							<p class="text-bark-600 p-4">Second tab here. You found it!</p>
						{:else}
							<p class="text-bark-600 p-4">Third tab - the journey continues!</p>
						{/if}
					{/snippet}
				</Tabs>
			</GlassCard>

			<!-- Accordion -->
			<GlassCard title="Accordion" variant="default">
				<p class="text-sm text-bark-600 mb-4">Collapsible content sections</p>
				<Accordion>
					<CollapsibleSection title="What is Grove?" open={accordionOpen === 'grove'} ontoggle={() => accordionOpen = accordionOpen === 'grove' ? null : 'grove'}>
						Grove is a cozy corner of the internet where your words feel at home.
					</CollapsibleSection>
					<CollapsibleSection title="Why Vineyard?" open={accordionOpen === 'vineyard'} ontoggle={() => accordionOpen = accordionOpen === 'vineyard' ? null : 'vineyard'}>
						Every vine starts somewhere - this is where we cultivate our components.
					</CollapsibleSection>
					<CollapsibleSection title="Can I contribute?" open={accordionOpen === 'contribute'} ontoggle={() => accordionOpen = accordionOpen === 'contribute' ? null : 'contribute'}>
						Yes! Grove is built with love and welcomes contributions.
					</CollapsibleSection>
				</Accordion>
			</GlassCard>

			<!-- Dialog -->
			<GlassCard title="Dialog" variant="default">
				<p class="text-sm text-bark-600 mb-4">Modal dialogs for important interactions</p>
				<Button onclick={() => dialogOpen = true}>Open Dialog</Button>
				<Dialog bind:open={dialogOpen} title="Hello from Grove!">
					<p class="text-bark-600 mb-4">
						This is a dialog. It's great for focused interactions that need your attention.
					</p>
					<div class="flex justify-end gap-2">
						<Button variant="outline" onclick={() => dialogOpen = false}>Close</Button>
						<Button onclick={() => { alert('Action taken!'); dialogOpen = false; }}>
							Take Action
						</Button>
					</div>
				</Dialog>
			</GlassCard>

			<!-- Card -->
			<GlassCard title="Card" variant="default">
				<p class="text-sm text-bark-600 mb-4">Container for grouped content</p>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg">
					<Card class="p-4">
						<h4 class="font-semibold text-bark-800 mb-2">Simple Card</h4>
						<p class="text-sm text-bark-600">Just a cozy container.</p>
					</Card>
					<Card class="p-4 border-grove-200 bg-grove-50">
						<h4 class="font-semibold text-grove-800 mb-2">Styled Card</h4>
						<p class="text-sm text-grove-600">With custom colors!</p>
					</Card>
				</div>
			</GlassCard>

			<!-- Indicators -->
			<GlassCard title="StatusBadge & Indicators" variant="default">
				<p class="text-sm text-bark-600 mb-4">Visual indicators for status, progress, and metrics</p>
				<div class="space-y-6">
					<div class="flex flex-wrap gap-2">
						<StatusBadge status="success" label="Active" />
						<StatusBadge status="warning" label="Pending" />
						<StatusBadge status="error" label="Failed" />
						<StatusBadge status="info" label="Info" />
					</div>
					<div class="max-w-sm space-y-4">
						<div>
							<label class="text-sm text-bark-600 mb-1 block">ScoreBar ({scoreValue}%)</label>
							<ScoreBar value={scoreValue} max={100} />
							<input type="range" bind:value={scoreValue} min="0" max="100" class="w-full mt-2" />
						</div>
						<div>
							<label class="text-sm text-bark-600 mb-1 block">CreditBalance</label>
							<CreditBalance credits={creditValue} />
							<input type="range" bind:value={creditValue} min="0" max="100" class="w-full mt-2" />
						</div>
					</div>
				</div>
			</GlassCard>

			<!-- Skeleton & Spinner -->
			<GlassCard title="Loading States" variant="default">
				<p class="text-sm text-bark-600 mb-4">Skeleton placeholders and spinners for loading content</p>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div class="space-y-3">
						<p class="text-sm font-medium text-bark-700">Skeleton</p>
						<Skeleton class="h-4 w-3/4" />
						<Skeleton class="h-4 w-full" />
						<Skeleton class="h-4 w-1/2" />
					</div>
					<div class="flex flex-col items-center gap-3">
						<p class="text-sm font-medium text-bark-700">Spinner</p>
						<Spinner size="md" />
					</div>
				</div>
			</GlassCard>
		</div>
	</section>

	<!-- ========================================== -->
	<!-- TYPOGRAPHY -->
	<!-- ========================================== -->
	<section id="typography" class="mb-20 scroll-mt-20">
		<div class="flex items-center gap-3 mb-8">
			<div class="p-2 rounded-lg bg-white/60 backdrop-blur-sm">
				<Type class="w-6 h-6 text-grove-600" />
			</div>
			<div>
				<h2 class="text-2xl font-bold text-bark-900">Typography</h2>
				<p class="text-bark-600">20 fonts for every mood - from cozy headers to crisp code</p>
			</div>
		</div>

		<div class="grid gap-8">
			<!-- Font Provider (Dynamic) -->
			<GlassCard title="FontProvider" variant="frosted">
				<p class="text-sm text-bark-600 mb-4">The base component - select any font dynamically</p>
				<div class="space-y-4">
					<div class="flex flex-wrap gap-2">
						{#each fonts as f}
							<button
								class="px-2 py-1 text-xs rounded transition-colors {selectedFont === f.id ? 'bg-grove-600 text-white' : 'bg-bark-100 text-bark-700 hover:bg-bark-200'}"
								onclick={() => selectedFont = f.id as FontId}
							>{f.name}</button>
						{/each}
					</div>
					<div class="p-6 bg-white/60 rounded-lg border border-white/60">
						<FontProvider font={selectedFont} as="p" class="text-2xl text-bark-800">
							The quick brown fox jumps over the lazy dog.
						</FontProvider>
						<p class="text-sm text-bark-500 mt-2">
							{fonts.find(f => f.id === selectedFont)?.description}
						</p>
					</div>
				</div>
			</GlassCard>

			<!-- Display & Special Fonts -->
			<GlassCard title="Display Fonts" variant="default">
				<p class="text-sm text-bark-600 mb-4">Eye-catching fonts for headers and special moments</p>
				<div class="space-y-6">
					<div class="p-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg">
						<Alagard as="h2" class="text-3xl text-purple-900 mb-2">
							Welcome to the Fantasy Realm
						</Alagard>
						<p class="text-sm text-purple-700">Alagard - pixel art medieval display font for gaming and fantasy</p>
					</div>
					<div class="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg">
						<Calistoga as="h2" class="text-3xl text-amber-900 mb-2">
							Friendly Headlines Welcome You
						</Calistoga>
						<p class="text-sm text-amber-700">Calistoga - casual brush serif, warm and inviting</p>
					</div>
					<div class="p-4 bg-gradient-to-r from-rose-50 to-pink-50 rounded-lg">
						<Caveat as="h2" class="text-3xl text-rose-900 mb-2">
							A personal note just for you...
						</Caveat>
						<p class="text-sm text-rose-700">Caveat - handwritten script, personal and informal</p>
					</div>
				</div>
			</GlassCard>

			<!-- Serif Fonts -->
			<GlassCard title="Serif Fonts" variant="default">
				<p class="text-sm text-bark-600 mb-4">Classic elegance for body text and refined headers</p>
				<div class="grid md:grid-cols-2 gap-4">
					<div class="p-4 bg-white/60 rounded-lg border border-bark-200">
						<Cormorant as="h3" class="text-xl text-bark-800 mb-2">Cormorant</Cormorant>
						<Cormorant as="p" class="text-bark-600">Elegant display serif inspired by Garamond. Refined and classic.</Cormorant>
					</div>
					<div class="p-4 bg-white/60 rounded-lg border border-bark-200">
						<BodoniModa as="h3" class="text-xl text-bark-800 mb-2">Bodoni Moda</BodoniModa>
						<BodoniModa as="p" class="text-bark-600">High contrast modern serif. Bold and sophisticated.</BodoniModa>
					</div>
					<div class="p-4 bg-white/60 rounded-lg border border-bark-200">
						<Lora as="h3" class="text-xl text-bark-800 mb-2">Lora</Lora>
						<Lora as="p" class="text-bark-600">Well-balanced contemporary serif. Excellent for body text.</Lora>
					</div>
					<div class="p-4 bg-white/60 rounded-lg border border-bark-200">
						<EBGaramond as="h3" class="text-xl text-bark-800 mb-2">EB Garamond</EBGaramond>
						<EBGaramond as="p" class="text-bark-600">Revival of classic Garamond. Timeless book typography.</EBGaramond>
					</div>
					<div class="p-4 bg-white/60 rounded-lg border border-bark-200">
						<Merriweather as="h3" class="text-xl text-bark-800 mb-2">Merriweather</Merriweather>
						<Merriweather as="p" class="text-bark-600">Designed for screen reading. Excellent legibility.</Merriweather>
					</div>
					<div class="p-4 bg-white/60 rounded-lg border border-bark-200">
						<Fraunces as="h3" class="text-xl text-bark-800 mb-2">Fraunces</Fraunces>
						<Fraunces as="p" class="text-bark-600">Soft serif with "wonky" optical axes. Warm personality.</Fraunces>
					</div>
				</div>
			</GlassCard>

			<!-- Sans-Serif Fonts -->
			<GlassCard title="Sans-Serif Fonts" variant="default">
				<p class="text-sm text-bark-600 mb-4">Clean, modern fonts for interfaces and body text</p>
				<div class="grid md:grid-cols-2 gap-4">
					<div class="p-4 bg-white/60 rounded-lg border border-bark-200">
						<Lexend as="h3" class="text-xl text-bark-800 mb-2">Lexend (Default)</Lexend>
						<Lexend as="p" class="text-bark-600">Modern, highly readable sans-serif. Grove's default font.</Lexend>
					</div>
					<div class="p-4 bg-white/60 rounded-lg border border-bark-200">
						<Nunito as="h3" class="text-xl text-bark-800 mb-2">Nunito</Nunito>
						<Nunito as="p" class="text-bark-600">Friendly rounded sans-serif. Warm and approachable.</Nunito>
					</div>
					<div class="p-4 bg-white/60 rounded-lg border border-bark-200">
						<Quicksand as="h3" class="text-xl text-bark-800 mb-2">Quicksand</Quicksand>
						<Quicksand as="p" class="text-bark-600">Geometric sans with rounded terminals. Light and modern.</Quicksand>
					</div>
					<div class="p-4 bg-white/60 rounded-lg border border-bark-200">
						<Manrope as="h3" class="text-xl text-bark-800 mb-2">Manrope</Manrope>
						<Manrope as="p" class="text-bark-600">Professional geometric sans. Clean and contemporary.</Manrope>
					</div>
					<div class="p-4 bg-white/60 rounded-lg border border-bark-200">
						<InstrumentSans as="h3" class="text-xl text-bark-800 mb-2">Instrument Sans</InstrumentSans>
						<InstrumentSans as="p" class="text-bark-600">Low contrast sans with humanist touches. Elegant simplicity.</InstrumentSans>
					</div>
					<div class="p-4 bg-white/60 rounded-lg border border-bark-200">
						<PlusJakartaSans as="h3" class="text-xl text-bark-800 mb-2">Plus Jakarta Sans</PlusJakartaSans>
						<PlusJakartaSans as="p" class="text-bark-600">Contemporary geometric sans. Balanced and versatile.</PlusJakartaSans>
					</div>
				</div>
			</GlassCard>

			<!-- Monospace Fonts -->
			<GlassCard title="Monospace Fonts" variant="default">
				<p class="text-sm text-bark-600 mb-4">For code, terminals, and technical content</p>
				<div class="space-y-4">
					<div class="p-4 bg-bark-900 rounded-lg">
						<IBMPlexMono as="code" class="text-grove-400 block mb-2">
							// IBM Plex Mono - corporate warmth
						</IBMPlexMono>
						<IBMPlexMono as="pre" class="text-cream-100 text-sm">{`function greet(name: string) {
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
			</GlassCard>

			<!-- Accessibility Fonts -->
			<GlassCard title="Accessibility Fonts" variant="default">
				<p class="text-sm text-bark-600 mb-4">Designed for maximum readability and inclusion</p>
				<div class="grid md:grid-cols-3 gap-4">
					<div class="p-4 bg-grove-50 rounded-lg border border-grove-200">
						<Atkinson as="h3" class="text-lg text-grove-900 mb-2">Atkinson Hyperlegible</Atkinson>
						<Atkinson as="p" class="text-grove-700 text-sm">
							Designed for low vision readers. Maximum character distinction between similar letters.
						</Atkinson>
					</div>
					<div class="p-4 bg-blue-50 rounded-lg border border-blue-200">
						<OpenDyslexic as="h3" class="text-lg text-blue-900 mb-2">OpenDyslexic</OpenDyslexic>
						<OpenDyslexic as="p" class="text-blue-700 text-sm">
							Weighted bottoms reduce letter confusion for dyslexic readers.
						</OpenDyslexic>
					</div>
					<div class="p-4 bg-amber-50 rounded-lg border border-amber-200">
						<Luciole as="h3" class="text-lg text-amber-900 mb-2">Luciole</Luciole>
						<Luciole as="p" class="text-amber-700 text-sm">
							French accessibility font designed for visually impaired readers.
						</Luciole>
					</div>
				</div>
			</GlassCard>

			<!-- Usage Examples -->
			<GlassCard title="Usage Examples" variant="frosted">
				<p class="text-sm text-bark-600 mb-4">How to use font components in your code</p>
				<div class="space-y-4">
					<IBMPlexMono as="pre" class="p-4 bg-bark-900 rounded-lg text-cream-100 text-sm overflow-x-auto">{`import { Alagard, IBMPlexMono, Caveat } from '@autumnsgrove/groveengine/ui/typography';

// Fantasy game header
<Alagard as="h1" class="text-4xl">Welcome to the Grove</Alagard>

// Code block with proper font
<IBMPlexMono as="code">console.log('hello world');</IBMPlexMono>

// Handwritten note feel
<Caveat as="p" class="text-2xl">A personal touch...</Caveat>

// Dynamic font selection
<FontProvider font="cormorant" as="article">
  <p>Elegant article content here...</p>
</FontProvider>`}</IBMPlexMono>
				</div>
			</GlassCard>
		</div>
	</section>

	<!-- ========================================== -->
	<!-- COLOR PALETTES -->
	<!-- ========================================== -->
	<section id="palettes" class="mb-20 scroll-mt-20">
		<div class="flex items-center gap-3 mb-8">
			<div class="p-2 rounded-lg bg-white/60 backdrop-blur-sm">
				<Palette class="w-6 h-6 text-grove-600" />
			</div>
			<div>
				<h2 class="text-2xl font-bold text-bark-900">Color Palettes</h2>
				<p class="text-bark-600">The rich, natural hues that bring Grove to life</p>
			</div>
		</div>

		<!-- Design Tokens -->
		<div class="mb-12">
			<h3 class="text-lg font-semibold text-bark-800 mb-4">Design Tokens</h3>
			<div class="grid gap-6">
				<PaletteRow name="Grove" colors={grove} description="Our signature green - growth, life, community" />
				<PaletteRow name="Cream" colors={cream} description="Warm backgrounds that feel like home" />
				<PaletteRow name="Bark" colors={barkTokens} description="Grounding browns for text and structure" />
			</div>
		</div>

		<!-- Status Colors -->
		<div class="mb-12">
			<h3 class="text-lg font-semibold text-bark-800 mb-4">Status Colors</h3>
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
				<StatusSwatch name="Success" color={status.success.DEFAULT} light={status.success.light} />
				<StatusSwatch name="Warning" color={status.warning.DEFAULT} light={status.warning.light} />
				<StatusSwatch name="Error" color={status.error.DEFAULT} light={status.error.light} />
				<StatusSwatch name="Info" color={status.info.DEFAULT} light={status.info.light} />
			</div>
		</div>

		<!-- Nature Palettes -->
		<div class="mb-12">
			<h3 class="text-lg font-semibold text-bark-800 mb-4">Nature Palettes</h3>
			<p class="text-bark-600 mb-6">Colors drawn from Pacific Northwest forests - atmospheric depth and natural beauty.</p>
			<div class="grid gap-6">
				<PaletteRow name="Greens" colors={greens} description="From dark forest depths to pale spring leaves" />
				<PaletteRow name="Bark" colors={bark} description="Warm wood tones for trunks and structure" />
				<PaletteRow name="Earth" colors={earth} description="Soil, stone, and grounding elements" />
				<PaletteRow name="Natural" colors={natural} description="Cream, birch, and soft organic tones" />
			</div>
		</div>

		<!-- Seasonal Palettes -->
		<div class="mb-12">
			<h3 class="text-lg font-semibold text-bark-800 mb-4">Seasonal Palettes</h3>
			<p class="text-bark-600 mb-6">Each season brings its own color story to the grove.</p>
			<div class="grid gap-6">
				<PaletteRow name="Spring" colors={spring} description="Fresh growth, wildflowers, and renewal" />
				<PaletteRow name="Spring Blossoms" colors={springBlossoms} description="Cherry blossom pinks at peak bloom" />
				<PaletteRow name="Autumn" colors={autumn} description="Warm golds, ambers, and falling leaves" />
				<PaletteRow name="Pinks" colors={pinks} description="Cherry blossoms and soft florals" />
				<PaletteRow name="Autumn Reds" colors={autumnReds} description="Maple and cherry fall foliage" />
				<PaletteRow name="Winter" colors={winter} description="Snow, frost, and peaceful quiet" />
			</div>
		</div>

		<!-- Accent Palettes -->
		<div class="mb-12">
			<h3 class="text-lg font-semibold text-bark-800 mb-4">Accent Palettes</h3>
			<p class="text-bark-600 mb-6">Special pops of color for woodland details.</p>
			<div class="grid gap-6">
				<PaletteRow name="Mushroom" colors={accents.mushroom} description="Fairy tale forest pops of color" />
				<PaletteRow name="Flower" colors={accents.flower} description="Wildflower purples and yellows" />
				<PaletteRow name="Firefly" colors={accents.firefly} description="Bioluminescent warm glow" />
				<PaletteRow name="Berry" colors={accents.berry} description="Rich and saturated berry tones" />
				<PaletteRow name="Water" colors={accents.water} description="Cool pond and stream reflections" />
				<PaletteRow name="Sky" colors={accents.sky} description="From dawn to dusk to starlight" />
				<PaletteRow name="Bird" colors={accents.bird} description="Cardinals, chickadees, robins, and bluebirds" />
			</div>
		</div>

		<!-- Midnight Bloom -->
		<div class="mb-12">
			<h3 class="text-lg font-semibold text-bark-800 mb-4">Midnight Bloom</h3>
			<p class="text-bark-600 mb-6">A late-night tea cafe palette - deep plums, warm amber, and soft golds.</p>
			<PaletteRow name="Midnight Bloom" colors={midnightBloom} description="The far vision - cozy evening vibes" />
		</div>
	</section>

	<!-- Roadmap -->
	<section class="mb-16">
		<GlassCard title="What's Growing" variant="frosted">
			<div class="grid md:grid-cols-3 gap-6">
				<div>
					<h4 class="font-semibold text-grove-700 mb-3 flex items-center gap-2">
						<span class="w-2 h-2 rounded-full bg-grove-500"></span>
						Built
					</h4>
					<ul class="space-y-2 text-sm text-bark-600">
						<li class="flex items-center gap-2"><ChevronRight class="w-3 h-3 text-grove-500" /> Glass component suite (8 components)</li>
						<li class="flex items-center gap-2"><ChevronRight class="w-3 h-3 text-grove-500" /> Core UI components (15+ components)</li>
						<li class="flex items-center gap-2"><ChevronRight class="w-3 h-3 text-grove-500" /> Typography components (20 fonts)</li>
						<li class="flex items-center gap-2"><ChevronRight class="w-3 h-3 text-grove-500" /> Nature color palettes (12 palettes)</li>
						<li class="flex items-center gap-2"><ChevronRight class="w-3 h-3 text-grove-500" /> Seasonal theming system</li>
						<li class="flex items-center gap-2"><ChevronRight class="w-3 h-3 text-grove-500" /> Interactive demos</li>
					</ul>
				</div>
				<div>
					<h4 class="font-semibold text-amber-700 mb-3 flex items-center gap-2">
						<span class="w-2 h-2 rounded-full bg-amber-500"></span>
						In Progress
					</h4>
					<ul class="space-y-2 text-sm text-bark-600">
						<li class="text-bark-400 italic">Nothing currently - check back soon!</li>
					</ul>
				</div>
				<div>
					<h4 class="font-semibold text-bark-500 mb-3 flex items-center gap-2">
						<span class="w-2 h-2 rounded-full bg-bark-300"></span>
						Planned
					</h4>
					<ul class="space-y-2 text-sm text-bark-500">
						<li class="flex items-center gap-2"><ChevronRight class="w-3 h-3" /> More gallery components</li>
						<li class="flex items-center gap-2"><ChevronRight class="w-3 h-3" /> Animation utilities</li>
						<li class="flex items-center gap-2"><ChevronRight class="w-3 h-3" /> Theme customization tools</li>
					</ul>
				</div>
			</div>
		</GlassCard>
	</section>
</div>

<!-- Helper Components -->
{#snippet PaletteRow({ name, colors, description }: { name: string; colors: Record<string, string>; description: string })}
	<div class="p-4 bg-white/40 backdrop-blur-sm rounded-lg border border-white/60">
		<div class="flex items-center justify-between mb-3">
			<div>
				<h4 class="font-medium text-bark-800">{name}</h4>
				<p class="text-sm text-bark-500">{description}</p>
			</div>
		</div>
		<div class="flex flex-wrap gap-1">
			{#each Object.entries(colors) as [key, color]}
				<div class="group relative">
					<button
						class="w-12 h-12 rounded-md shadow-sm border border-black/10 cursor-pointer transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-grove-500"
						style="background-color: {color}"
						title="{key}: {color}"
						onclick={() => navigator.clipboard.writeText(String(color)).then(() => alert(`Copied ${color}!`))}
					></button>
					<div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-bark-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
						{key}: {color}
					</div>
				</div>
			{/each}
		</div>
	</div>
{/snippet}

{#snippet StatusSwatch({ name, color, light }: { name: string; color: string; light: string })}
	<div class="p-4 rounded-lg border border-white/60" style="background-color: {light}">
		<div class="flex items-center gap-3 mb-2">
			<div
				class="w-8 h-8 rounded-full shadow-sm"
				style="background-color: {color}"
			></div>
			<span class="font-medium text-bark-800">{name}</span>
		</div>
		<p class="text-xs text-bark-500">{color}</p>
	</div>
{/snippet}

<style>
	:global(.tab-trigger) {
		@apply px-4 py-2 text-sm font-medium text-bark-600 border-b-2 border-transparent transition-colors;
	}
	:global(.tab-trigger[data-state="active"]) {
		@apply text-grove-600 border-grove-600;
	}
	:global(.tab-trigger:hover) {
		@apply text-bark-800;
	}
</style>
