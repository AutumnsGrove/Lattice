<script lang="ts">
	/**
	 * Callback page — only shown briefly while redirecting.
	 * The server load function redirects before this renders in normal flow.
	 */
</script>

<svelte:head>
	<title>Redirecting... - Grove Billing</title>
</svelte:head>

<div class="w-full max-w-md mx-auto animate-fade-in">
	<div class="glass-grove rounded-2xl border border-default p-8 text-center shadow-lg">
		<div class="spinner mx-auto mb-4" role="status" aria-label="Loading"></div>
		<h1 class="text-lg font-serif text-foreground mb-2 tracking-tight">Redirecting you back...</h1>
		<p class="text-sm text-foreground-muted">Taking you back to your Grove in a moment.</p>
	</div>
</div>
