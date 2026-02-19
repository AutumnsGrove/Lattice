<script lang="ts">
	interface Props {
		size?: 'sm' | 'md' | 'lg';
		message?: string;
	}

	let { size = 'md', message }: Props = $props();

	const sizes = {
		sm: { spinner: '16px', border: '2px' },
		md: { spinner: '32px', border: '3px' },
		lg: { spinner: '48px', border: '4px' }
	};
</script>

<div class="loading" class:loading-sm={size === 'sm'} class:loading-lg={size === 'lg'}>
	<div
		class="spinner"
		style="width: {sizes[size].spinner}; height: {sizes[size].spinner}; border-width: {sizes[size].border};"
	></div>
	{#if message}
		<p class="message">{message}</p>
	{/if}
</div>

<style>
	.loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		padding: 2rem;
	}

	.spinner {
		border-style: solid;
		border-color: var(--color-border);
		border-top-color: var(--color-primary);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.message {
		color: var(--color-text-secondary);
		font-size: 0.875rem;
	}

	.loading-sm .message {
		font-size: 0.75rem;
	}

	.loading-lg .message {
		font-size: 1rem;
	}
</style>
