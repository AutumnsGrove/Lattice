<script lang="ts">
	import { browser } from '$app/environment';
	import { Terrarium } from '@autumnsgrove/groveengine/ui/terrarium';
	import { Monitor, Smartphone } from 'lucide-svelte';

	// Check viewport width on mount
	let isMobile = $state(false);
	let hasChecked = $state(false);

	$effect(() => {
		if (browser) {
			// Check initial viewport
			isMobile = window.innerWidth < 768;
			hasChecked = true;

			// Listen for resize
			const checkViewport = () => {
				isMobile = window.innerWidth < 768;
			};

			window.addEventListener('resize', checkViewport);
			return () => window.removeEventListener('resize', checkViewport);
		}
	});
</script>

{#if !hasChecked}
	<!-- Loading state while checking viewport -->
	<div class="flex items-center justify-center h-full bg-page">
		<div class="animate-pulse text-foreground-subtle">Preparing canvas...</div>
	</div>
{:else if isMobile}
	<!-- Mobile viewport warning -->
	<div class="flex items-center justify-center h-full bg-page p-6">
		<div class="max-w-md text-center space-y-6">
			<!-- Icon comparison -->
			<div class="flex items-center justify-center gap-4">
				<div class="p-4 rounded-2xl bg-red-100 dark:bg-red-900/30">
					<Smartphone class="w-8 h-8 text-red-500 dark:text-red-400" />
				</div>
				<div class="text-foreground-subtle text-2xl">&rarr;</div>
				<div class="p-4 rounded-2xl bg-grove-100 dark:bg-grove-900/30">
					<Monitor class="w-8 h-8 text-grove-600 dark:text-grove-400" />
				</div>
			</div>

			<!-- Message -->
			<div class="space-y-3">
				<h1 class="text-xl font-semibold text-foreground">
					Terrarium works best on larger screens
				</h1>
				<p class="text-foreground-subtle leading-relaxed">
					The canvas, asset palette, and drag-and-drop interactions need more space than a mobile device provides.
					Please visit on a tablet or desktop for the full experience.
				</p>
			</div>

			<!-- Link back to Grove -->
			<a
				href="https://grove.place"
				class="inline-flex items-center gap-2 px-4 py-2 rounded-lg
					bg-grove-600 hover:bg-grove-700 text-white
					transition-colors font-medium"
			>
				Back to Grove
			</a>
		</div>
	</div>
{:else}
	<!-- Desktop: Full Terrarium component -->
	<Terrarium />
{/if}
