<script lang="ts">
	/**
	 * Spinner loading indicator
	 * A simple spinning loader for indicating loading states
	 *
	 * @prop {string} [size="md"] - Size variant (sm|md|lg)
	 * @prop {string} [class] - Additional CSS classes
	 */
	type SpinnerSize = 'sm' | 'md' | 'lg';

	interface Props {
		size?: SpinnerSize;
		class?: string;
	}

	let { size = 'md', class: className = '' }: Props = $props();

	const sizeClasses: Record<SpinnerSize, string> = {
		sm: 'h-4 w-4',
		md: 'h-8 w-8',
		lg: 'h-12 w-12'
	};
</script>

<div
	class="animate-spin rounded-full border-2 border-current border-t-transparent {sizeClasses[size]} {className}"
	role="status"
	aria-label="Loading"
>
	<span class="sr-only">Loading...</span>
</div>

<style>
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}
</style>
