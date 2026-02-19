<script lang="ts">
	import Icons from '../icons/Icons.svelte';

	interface Props {
		credits: number;
		showIcon?: boolean;
		size?: 'sm' | 'md' | 'lg';
		variant?: 'default' | 'compact' | 'card';
	}

	let { credits, showIcon = true, size = 'md', variant = 'default' }: Props = $props();

	const isLow = $derived(credits <= 5);
	const isEmpty = $derived(credits <= 0);

	const sizeClasses = {
		sm: 'text-sm px-2.5 py-1',
		md: 'text-base px-3 py-1.5',
		lg: 'text-lg px-4 py-2'
	};
</script>

{#if variant === 'card'}
	<div class="scout-card p-4 {isEmpty ? 'border-red-200 dark:border-red-800' : isLow ? 'border-amber-200 dark:border-amber-800' : ''}">
		<div class="flex items-center justify-between mb-2">
			<span class="text-sm text-bark-500 dark:text-cream-500">Available Credits</span>
			{#if isLow && !isEmpty}
				<span class="text-xs text-amber-600 dark:text-amber-400 font-medium">Low balance</span>
			{:else if isEmpty}
				<span class="text-xs text-red-600 dark:text-red-400 font-medium">No credits</span>
			{/if}
		</div>
		<div class="flex items-baseline gap-1">
			<span class="text-3xl font-bold text-bark dark:text-cream">{credits}</span>
			<span class="text-bark-400 dark:text-cream-500">searches</span>
		</div>
		{#if isLow}
			<a href="/pricing" class="mt-3 inline-flex items-center gap-1 text-sm text-grove-600 dark:text-grove-400 hover:underline">
				Add more credits
				<Icons name="arrow-right" size="sm" />
			</a>
		{/if}
	</div>
{:else if variant === 'compact'}
	<span class="scout-credits {sizeClasses[size]} {isEmpty ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' : isLow ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300' : ''}">
		{#if showIcon}
			<Icons name="credits" size="sm" />
		{/if}
		<span class="font-semibold">{credits}</span>
	</span>
{:else}
	<div class="flex items-center gap-2 {sizeClasses[size]}">
		{#if showIcon}
			<div class="p-2 rounded-full bg-grove-100 dark:bg-grove-900/30 text-grove-600 dark:text-grove-400">
				<Icons name="credits" size={size === 'lg' ? 'lg' : 'md'} />
			</div>
		{/if}
		<div>
			<div class="font-bold text-bark dark:text-cream">{credits} credits</div>
			{#if isLow && !isEmpty}
				<div class="text-xs text-amber-600 dark:text-amber-400">Running low</div>
			{:else if isEmpty}
				<div class="text-xs text-red-600 dark:text-red-400">No credits left</div>
			{/if}
		</div>
	</div>
{/if}
