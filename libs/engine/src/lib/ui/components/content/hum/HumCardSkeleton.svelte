<script lang="ts">
	interface Props {
		class?: string;
	}

	let { class: className = "" }: Props = $props();
</script>

<div
	class="hum-card-skeleton flex items-center gap-4 rounded-xl
		bg-white/60 dark:bg-cream-100/40 backdrop-blur-md
		border border-grove-200/40 dark:border-grove-700/30
		p-3 animate-pulse {className}"
	role="status"
	aria-label="Loading music preview"
>
	<!-- Artwork skeleton -->
	<div class="w-20 h-20 rounded-lg bg-grove-200/50 dark:bg-grove-700/30 shrink-0"></div>

	<!-- Text skeleton -->
	<div class="flex-1 space-y-2 min-w-0">
		<div class="h-4 bg-grove-200/50 dark:bg-grove-700/30 rounded w-3/4"></div>
		<div class="h-3 bg-grove-200/50 dark:bg-grove-700/30 rounded w-1/2"></div>
		<div class="h-3 bg-grove-200/50 dark:bg-grove-700/30 rounded w-1/3"></div>
	</div>

	<!-- Badge skeleton -->
	<div class="w-6 h-6 rounded-md bg-grove-200/50 dark:bg-grove-700/30 shrink-0"></div>
</div>
