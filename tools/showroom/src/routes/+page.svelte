<script lang="ts">
	let status = $state("ready");
</script>

<main class="flex items-center justify-center min-h-screen">
	<div class="text-center space-y-4">
		<h1 class="text-2xl font-medium text-foreground">Showroom</h1>
		<p class="text-foreground-subtle text-sm">
			Component isolation and visual verification for Grove.
		</p>
		<p class="text-xs text-foreground-subtle">
			Status: <span class="text-grove-500 font-medium">{status}</span>
		</p>
	</div>
</main>
