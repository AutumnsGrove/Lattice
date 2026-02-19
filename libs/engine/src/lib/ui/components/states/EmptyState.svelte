<script lang="ts">
	import Icons from '../icons/Icons.svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		icon?: 'search' | 'shopping-bag' | 'star' | 'heart' | 'sparkles';
		title: string;
		description?: string;
		action?: Snippet;
	}

	let { icon = 'search', title, description, action }: Props = $props();
</script>

<div class="scout-empty">
	<div class="scout-empty-icon">
		<Icons name={icon} size="xl" />
	</div>
	<h3 class="scout-empty-title">{title}</h3>
	{#if description}
		<p class="scout-empty-description">{description}</p>
	{/if}
	{#if action}
		<div class="mt-6">
			{@render action()}
		</div>
	{/if}
</div>
