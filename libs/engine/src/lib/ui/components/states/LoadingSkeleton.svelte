<script lang="ts">
	interface Props {
		variant?: 'text' | 'heading' | 'card' | 'product' | 'avatar' | 'button';
		lines?: number;
		class?: string;
	}

	let { variant = 'text', lines = 1, class: className = '' }: Props = $props();
</script>

{#if variant === 'text'}
	<div class="space-y-2 {className}">
		{#each Array(lines) as _, i}
			<div class="scout-skeleton h-4 {i === lines - 1 ? 'w-3/4' : 'w-full'}"></div>
		{/each}
	</div>
{:else if variant === 'heading'}
	<div class="scout-skeleton h-8 w-2/3 {className}"></div>
{:else if variant === 'avatar'}
	<div class="scout-skeleton w-10 h-10 rounded-full {className}"></div>
{:else if variant === 'button'}
	<div class="scout-skeleton h-10 w-32 rounded-grove {className}"></div>
{:else if variant === 'card'}
	<div class="scout-card p-4 {className}">
		<div class="scout-skeleton h-5 w-3/4 mb-3"></div>
		<div class="space-y-2">
			<div class="scout-skeleton h-4 w-full"></div>
			<div class="scout-skeleton h-4 w-5/6"></div>
		</div>
		<div class="scout-skeleton h-9 w-24 mt-4 rounded-grove"></div>
	</div>
{:else if variant === 'product'}
	<div class="scout-card p-0 overflow-hidden {className}">
		<div class="scout-skeleton aspect-square"></div>
		<div class="p-4 space-y-3">
			<div class="scout-skeleton h-5 w-full"></div>
			<div class="scout-skeleton h-5 w-2/3"></div>
			<div class="flex gap-2">
				<div class="scout-skeleton h-6 w-20"></div>
				<div class="scout-skeleton h-6 w-16"></div>
			</div>
			<div class="scout-skeleton h-2 w-full rounded-full"></div>
			<div class="scout-skeleton h-10 w-full rounded-grove mt-2"></div>
		</div>
	</div>
{/if}
