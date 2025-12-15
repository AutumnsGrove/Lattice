<script lang="ts">
	import { Check, Circle, X, Sparkles } from 'lucide-svelte';

	interface ChecklistItem {
		id: string;
		label: string;
		completed: boolean;
		href?: string;
	}

	interface Props {
		items: ChecklistItem[];
		onDismiss?: () => void;
		class?: string;
	}

	let { items, onDismiss, class: className = '' }: Props = $props();

	const completedCount = $derived(items.filter((i) => i.completed).length);
	const allCompleted = $derived(completedCount === items.length);
	const progress = $derived((completedCount / items.length) * 100);
</script>

<div class="bg-surface-elevated border border-default rounded-lg p-4 {className}">
	<!-- Header -->
	<div class="flex items-center justify-between mb-4">
		<div class="flex items-center gap-2">
			<Sparkles size={18} class="text-primary" />
			<h3 class="font-medium text-foreground text-sm">Getting Started</h3>
		</div>
		{#if onDismiss}
			<button
				onclick={onDismiss}
				class="text-foreground-subtle hover:text-foreground transition-colors"
				title="Dismiss checklist"
			>
				<X size={16} />
			</button>
		{/if}
	</div>

	<!-- Progress bar -->
	<div class="mb-4">
		<div class="h-1.5 bg-surface rounded-full overflow-hidden">
			<div
				class="h-full bg-primary transition-all duration-500"
				style="width: {progress}%"
			></div>
		</div>
		<p class="text-xs text-foreground-subtle mt-1">
			{completedCount} of {items.length} complete
		</p>
	</div>

	<!-- Checklist items -->
	<ul class="space-y-2">
		{#each items as item}
			<li>
				{#if item.href && !item.completed}
					<a
						href={item.href}
						class="flex items-center gap-3 p-2 rounded-md hover:bg-surface transition-colors group"
					>
						<div
							class="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors"
							class:border-primary={item.completed}
							class:bg-primary={item.completed}
							class:border-default={!item.completed}
							class:group-hover:border-primary={!item.completed}
						>
							{#if item.completed}
								<Check size={12} class="text-white" />
							{/if}
						</div>
						<span
							class="text-sm transition-colors"
							class:text-foreground-subtle={item.completed}
							class:line-through={item.completed}
							class:text-foreground={!item.completed}
						>
							{item.label}
						</span>
					</a>
				{:else}
					<div class="flex items-center gap-3 p-2">
						<div
							class="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
							class:border-primary={item.completed}
							class:bg-primary={item.completed}
							class:border-default={!item.completed}
						>
							{#if item.completed}
								<Check size={12} class="text-white" />
							{/if}
						</div>
						<span
							class="text-sm"
							class:text-foreground-subtle={item.completed}
							class:line-through={item.completed}
							class:text-foreground={!item.completed}
						>
							{item.label}
						</span>
					</div>
				{/if}
			</li>
		{/each}
	</ul>

	<!-- Completion celebration -->
	{#if allCompleted}
		<div class="mt-4 p-3 bg-accent rounded-md text-center">
			<p class="text-sm text-foreground">
				🎉 All done! You're a Grove pro now.
			</p>
		</div>
	{/if}
</div>
