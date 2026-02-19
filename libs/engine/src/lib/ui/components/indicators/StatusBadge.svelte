<script lang="ts">
	import Icons from '../icons/Icons.svelte';

	interface Props {
		status: 'pending' | 'running' | 'completed' | 'failed' | 'needs_confirmation';
		size?: 'sm' | 'md';
	}

	let { status, size = 'md' }: Props = $props();

	const statusConfig = {
		pending: {
			label: 'Pending',
			class: 'scout-badge-pending',
			icon: 'clock' as const
		},
		running: {
			label: 'Searching',
			class: 'scout-badge-running',
			icon: 'loader' as const
		},
		completed: {
			label: 'Complete',
			class: 'scout-badge-completed',
			icon: 'check' as const
		},
		failed: {
			label: 'Failed',
			class: 'scout-badge-failed',
			icon: 'x' as const
		},
		needs_confirmation: {
			label: 'Needs Review',
			class: 'scout-badge-pending',
			icon: 'zap' as const
		}
	};

	const config = $derived(statusConfig[status]);
	const sizeClass = $derived(size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1');
</script>

<span class="{config.class} {sizeClass} inline-flex items-center gap-1.5 font-medium rounded-full">
	<Icons name={config.icon} size="sm" class={status === 'running' ? 'animate-spin' : ''} />
	{config.label}
</span>
