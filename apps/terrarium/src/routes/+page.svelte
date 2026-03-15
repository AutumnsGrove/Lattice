<script lang="ts">
	import { browser } from '$app/environment';
	import { Terrarium } from '@autumnsgrove/lattice/ui/terrarium';
	import { chromeIcons } from '@autumnsgrove/prism/icons';

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
				<div class="p-4 rounded-2xl bg-error/10 dark:bg-error/10">
					<chromeIcons.smartphone class="w-8 h-8 text-error dark:text-error" />
				</div>
				<div class="text-foreground-subtle text-2xl">&rarr;</div>
				<div class="p-4 rounded-2xl bg-accent-foreground/10 dark:bg-accent-foreground/10">
					<chromeIcons.monitor class="w-8 h-8 text-accent-foreground dark:text-accent-foreground" />
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
					bg-accent-foreground hover:bg-accent-foreground/80 text-white
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
