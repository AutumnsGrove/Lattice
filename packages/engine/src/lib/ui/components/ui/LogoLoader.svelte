<script lang="ts">
	/**
	 * Logo Loader Component
	 *
	 * A branded loading indicator using the Grove logo with breathing animation.
	 * Use instead of Spinner for a more on-brand loading experience.
	 *
	 * @prop {string} [size="md"] - Size variant (sm|md|lg|xl)
	 * @prop {string} [class] - Additional CSS classes
	 * @prop {string} [label] - Optional loading message
	 */
	import Logo from './Logo.svelte';

	type LoaderSize = 'sm' | 'md' | 'lg' | 'xl';

	interface Props {
		size?: LoaderSize;
		class?: string;
		label?: string;
	}

	let { size = 'md', class: className = '', label }: Props = $props();

	const sizeClasses: Record<LoaderSize, string> = {
		sm: 'w-6 h-6',
		md: 'w-10 h-10',
		lg: 'w-16 h-16',
		xl: 'w-24 h-24'
	};
</script>

<div
	class="logo-loader {className}"
	role="status"
	aria-label={label || 'Loading'}
>
	<Logo class="{sizeClasses[size]} animate-pulse" />
	{#if label}
		<span class="loader-label">{label}</span>
	{/if}
	<span class="sr-only">{label || 'Loading...'}</span>
</div>

<style>
	.logo-loader {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		color: var(--accent-color, var(--editor-accent, #8bc48b));
	}

	.loader-label {
		font-size: 0.85rem;
		color: var(--color-text-muted, #6a6a6a);
		font-family: "JetBrains Mono", "Fira Code", monospace;
	}

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
