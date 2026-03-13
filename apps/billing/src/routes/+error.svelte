<script lang="ts">
	import { page } from "$app/stores";
</script>

<svelte:head>
	<title>Something went wrong - Grove Billing</title>
</svelte:head>

<div class="w-full max-w-md mx-auto animate-fade-in">
	<div class="glass-grove rounded-2xl border border-default p-8 text-center shadow-md">
		<div class="text-4xl mb-4">&#127807;</div>

		<h1 class="text-xl font-serif text-foreground mb-2">Something went wrong</h1>

		<p class="text-foreground-muted mb-6">
			{$page.error?.message || "We ran into an issue with billing. Please try again in a moment."}
		</p>

		{#if $page.error?.code}
			<p class="text-xs text-foreground-subtle mb-6">
				Reference: {$page.error.code}
			</p>
		{/if}

		<div class="flex flex-col gap-3">
			<button onclick={() => window.location.reload()} class="btn-primary w-full">
				Try again
			</button>

			<a href="https://grove.place" class="btn-secondary w-full"> Back to Grove </a>
		</div>
	</div>
</div>
