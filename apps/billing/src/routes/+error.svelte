<script lang="ts">
	import { page } from "$app/stores";
</script>

<svelte:head>
	<title>Something went wrong - Grove Billing</title>
</svelte:head>

<div class="w-full max-w-md mx-auto animate-fade-in">
	<div class="glass-grove rounded-2xl border border-default p-8 text-center shadow-lg">
		<h1 class="text-xl font-serif text-foreground mb-2 tracking-tight">Something went sideways</h1>

		<p class="text-foreground-muted mb-6">
			{$page.error?.message || "We hit a snag with billing. Give it another moment and try again."}
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

			<a href="/" class="btn-secondary w-full text-center"> Back to billing </a>
		</div>
	</div>
</div>
