<script lang="ts">
	import { onMount } from 'svelte';
	import { ArrowRight, X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-svelte';

	let { data } = $props();

	// Tour state
	let currentStep = $state(0);
	let showSkipConfirm = $state(false);

	// Tour stops configuration
	const tourStops = [
		{
			id: 'welcome',
			title: 'Welcome to the Tour!',
			description: "Let's explore what Grove can do for you. We'll show you around using example blogs so you can see the possibilities.",
			location: 'intro',
			url: null,
			image: null
		},
		{
			id: 'homepage',
			title: 'Your Blog Homepage',
			description: "This is what visitors see when they arrive at your blog. Clean, focused, and beautiful by default. This is The Midnight Bloom - a demo blog.",
			location: 'example.grove.place',
			url: 'https://example.grove.place?tour=1',
			image: '/tour/homepage.png'
		},
		{
			id: 'post',
			title: 'Blog Posts',
			description: "Your posts are the heart of your blog. Write in markdown, add images, and use 'vines' to link related content in the margins.",
			location: 'example.grove.place/post/...',
			url: 'https://example.grove.place?tour=2',
			image: '/tour/post.png'
		},
		{
			id: 'vines',
			title: 'Vines - Margin Notes',
			description: "Vines are Grove's unique feature - add annotations, links, and thoughts in the margins. They're like friendly marginalia.",
			location: 'Sidebar annotations',
			url: 'https://example.grove.place?tour=3',
			image: '/tour/vines.png'
		},
		{
			id: 'admin',
			title: 'Your Dashboard',
			description: "The admin panel is where you manage everything - write posts, upload media, and customize your blog.",
			location: 'your-blog.grove.place/admin',
			url: null,
			image: '/tour/admin.png'
		},
		{
			id: 'editor',
			title: 'The Post Editor',
			description: "Write in markdown with live preview. Add images by dragging them in. It's simple but powerful.",
			location: 'Admin → New Post',
			url: null,
			image: '/tour/editor.png'
		},
		{
			id: 'real-example',
			title: 'See It In Action',
			description: "Here's a real Grove blog - AutumnsGrove.com. Built by Grove's creator as a personal writing space.",
			location: 'autumnsgrove.com',
			url: 'https://autumnsgrove.com?tour=1',
			image: '/tour/autumnsgrove.png'
		},
		{
			id: 'complete',
			title: "You're Ready!",
			description: `Your blog is waiting at ${data.user?.username || 'your'}.grove.place. Time to write something beautiful.`,
			location: 'Your blog',
			url: null,
			image: null
		}
	];

	const currentTourStop = $derived(tourStops[currentStep]);
	const isFirstStep = $derived(currentStep === 0);
	const isLastStep = $derived(currentStep === tourStops.length - 1);
	const progress = $derived(((currentStep + 1) / tourStops.length) * 100);

	function nextStep() {
		if (currentStep < tourStops.length - 1) {
			currentStep++;
		}
	}

	function prevStep() {
		if (currentStep > 0) {
			currentStep--;
		}
	}

	function skipTour() {
		showSkipConfirm = true;
	}

	function confirmSkip() {
		// Mark tour as skipped and redirect
		window.location.href = `https://${data.user?.username || 'example'}.grove.place/admin?welcome=true&tour=skipped`;
	}

	function completeTour() {
		// Mark tour as complete and redirect
		window.location.href = `https://${data.user?.username || 'example'}.grove.place/admin?welcome=true&tour=complete`;
	}

	// Open external links in new tab
	function visitDemo() {
		if (currentTourStop.url) {
			window.open(currentTourStop.url, '_blank');
		}
	}
</script>

<div class="animate-fade-in">
	<!-- Progress bar -->
	<div class="mb-8">
		<div class="h-1 bg-surface rounded-full overflow-hidden">
			<div
				class="h-full bg-primary transition-all duration-300"
				style="width: {progress}%"
			></div>
		</div>
		<div class="flex justify-between mt-2 text-xs text-foreground-subtle">
			<span>Step {currentStep + 1} of {tourStops.length}</span>
			<button onclick={skipTour} class="hover:text-foreground transition-colors">
				Skip tour
			</button>
		</div>
	</div>

	<!-- Tour content -->
	<div class="card max-w-2xl mx-auto">
		<!-- Header -->
		<div class="flex items-start justify-between mb-4">
			<div class="flex items-center gap-2">
				<Sparkles size={20} class="text-primary" />
				<span class="text-sm text-foreground-muted">{currentTourStop.location}</span>
			</div>
		</div>

		<!-- Title and description -->
		<h1 class="text-2xl font-medium text-foreground mb-3">
			{currentTourStop.title}
		</h1>
		<p class="text-foreground-muted mb-6">
			{currentTourStop.description}
		</p>

		<!-- Image placeholder (would show actual screenshots) -->
		{#if currentTourStop.image}
			<div class="aspect-video bg-surface rounded-lg mb-6 flex items-center justify-center border border-default">
				<div class="text-center text-foreground-subtle">
					<p class="text-sm">Preview of {currentTourStop.location}</p>
					{#if currentTourStop.url}
						<button onclick={visitDemo} class="text-primary hover:underline text-sm mt-2">
							Open in new tab →
						</button>
					{/if}
				</div>
			</div>
		{:else if currentStep === 0}
			<!-- Welcome illustration -->
			<div class="aspect-video bg-accent rounded-lg mb-6 flex items-center justify-center">
				<div class="text-center">
					<div class="text-6xl mb-4">🌱</div>
					<p class="text-foreground-muted">Let's explore Grove together</p>
				</div>
			</div>
		{:else if isLastStep}
			<!-- Completion illustration -->
			<div class="aspect-video bg-accent rounded-lg mb-6 flex items-center justify-center">
				<div class="text-center">
					<div class="text-6xl mb-4">🎉</div>
					<p class="text-lg font-medium text-foreground mb-2">
						{data.user?.username || 'your-blog'}.grove.place
					</p>
					<p class="text-foreground-muted">Your blog is live and waiting</p>
				</div>
			</div>
		{/if}

		<!-- Navigation -->
		<div class="flex items-center justify-between pt-4 border-t border-default">
			<button
				onclick={prevStep}
				disabled={isFirstStep}
				class="btn-secondary"
				class:opacity-50={isFirstStep}
				class:cursor-not-allowed={isFirstStep}
			>
				<ChevronLeft size={18} />
				Back
			</button>

			<div class="flex gap-1">
				{#each tourStops as _, i}
					<button
						onclick={() => (currentStep = i)}
						class="w-2 h-2 rounded-full transition-all"
						class:bg-primary={i === currentStep}
						class:w-4={i === currentStep}
						class:bg-surface={i !== currentStep}
					></button>
				{/each}
			</div>

			{#if isLastStep}
				<button onclick={completeTour} class="btn-primary">
					Go to My Blog
					<ArrowRight size={18} />
				</button>
			{:else}
				<button onclick={nextStep} class="btn-primary">
					Next
					<ChevronRight size={18} />
				</button>
			{/if}
		</div>
	</div>

	<!-- Skip confirmation modal -->
	{#if showSkipConfirm}
		<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
			<div class="card max-w-sm w-full animate-slide-up">
				<div class="flex justify-between items-start mb-4">
					<h2 class="text-lg font-medium text-foreground">Skip the tour?</h2>
					<button onclick={() => (showSkipConfirm = false)} class="text-foreground-subtle hover:text-foreground">
						<X size={20} />
					</button>
				</div>
				<p class="text-foreground-muted mb-6">
					No problem! You can always revisit the tour from your Help menu.
				</p>
				<div class="flex gap-3">
					<button onclick={() => (showSkipConfirm = false)} class="btn-secondary flex-1">
						Continue Tour
					</button>
					<button onclick={confirmSkip} class="btn-primary flex-1">
						Skip to Blog
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
