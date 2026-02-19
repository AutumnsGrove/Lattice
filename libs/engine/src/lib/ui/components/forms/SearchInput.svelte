<script lang="ts">
	import Icons from '../icons/Icons.svelte';

	interface Props {
		value?: string;
		placeholder?: string;
		disabled?: boolean;
		loading?: boolean;
		autofocus?: boolean;
		onsubmit?: (value: string) => void;
	}

	let {
		value = $bindable(''),
		placeholder = 'Describe what you\'re looking for...',
		disabled = false,
		loading = false,
		autofocus = false,
		onsubmit
	}: Props = $props();

	function handleSubmit(e: Event) {
		e.preventDefault();
		if (value.trim() && onsubmit) {
			onsubmit(value.trim());
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			handleSubmit(e);
		}
	}

	const examples = [
		'Cozy sweater, earth tones, under $60',
		'Wireless earbuds for running, waterproof',
		'Birthday gift for a coffee lover, $30-50',
		'Ergonomic office chair, good lumbar support'
	];

	let showExamples = $state(false);
</script>

<form onsubmit={handleSubmit} class="w-full">
	<div class="scout-search">
		<Icons name="search" class="scout-search-icon" />
		<textarea
		aria-label="Search query"
			bind:value
			{placeholder}
			disabled={disabled || loading}
			rows="1"
			onkeydown={handleKeydown}
			onfocus={() => showExamples = true}
			onblur={() => setTimeout(() => showExamples = false, 200)}
			class="scout-search-input resize-none min-h-[60px] max-h-[200px]"
		></textarea>
		<button
			type="submit"
			disabled={disabled || loading || !value.trim()}
			class="absolute right-3 top-1/2 -translate-y-1/2 scout-btn-primary px-4 py-2"
		>
			{#if loading}
				<Icons name="loader" size="sm" class="animate-spin" />
				Searching...
			{:else}
				<Icons name="sparkles" size="sm" />
				Search
			{/if}
		</button>
	</div>

	<!-- Example queries -->
	{#if showExamples && !value}
		<div class="mt-3 flex flex-wrap gap-2">
			<span class="text-sm text-bark-400 dark:text-cream-500">Try:</span>
			{#each examples as example}
				<button
					type="button"
					onclick={() => value = example}
					class="text-sm text-grove-600 dark:text-grove-400 hover:underline cursor-pointer"
				>
					"{example.slice(0, 30)}..."
				</button>
			{/each}
		</div>
	{/if}
</form>
