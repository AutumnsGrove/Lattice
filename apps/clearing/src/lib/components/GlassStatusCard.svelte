<script lang="ts">
	/**
	 * GlassStatusCard - A glass card showing component status
	 *
	 * Displays a platform component with its current status indicator,
	 * using glassmorphism styling consistent with Grove's design language.
	 */
	import { cn } from '@autumnsgrove/lattice/ui/utils';
	import type { ComponentStatus } from '$lib/types/status';
	import { getStatusLabel } from '$lib/types/status';
	import {
		CheckCircle,
		AlertTriangle,
		AlertCircle,
		XCircle,
		Wrench
	} from '@lucide/svelte';

	interface Props {
		name: string;
		description?: string | null;
		status: ComponentStatus;
		class?: string;
	}

	let { name, description, status, class: className }: Props = $props();

	// Status-specific styling
	const statusConfig = {
		operational: {
			icon: CheckCircle,
			color: 'text-success',
			bg: 'bg-success-bg',
			border: 'border-success'
		},
		degraded: {
			icon: AlertTriangle,
			color: 'text-warning',
			bg: 'bg-warning-bg',
			border: 'border-warning'
		},
		partial_outage: {
			icon: AlertCircle,
			color: 'text-warning',
			bg: 'bg-warning-bg',
			border: 'border-warning'
		},
		major_outage: {
			icon: XCircle,
			color: 'text-error',
			bg: 'bg-error-bg',
			border: 'border-error'
		},
		maintenance: {
			icon: Wrench,
			color: 'text-info',
			bg: 'bg-info-bg',
			border: 'border-info'
		}
	};

	const config = $derived(statusConfig[status]);
	const StatusIcon = $derived(config.icon);
</script>

<div
	class={cn(
		'glass-card p-4 transition-all duration-200 hover:shadow-md',
		className
	)}
	role="listitem"
	aria-label={`${name}: ${getStatusLabel(status)}`}
>
	<div class="flex items-start justify-between gap-3">
		<div class="flex-1 min-w-0">
			<h3 class="font-medium text-foreground truncate">{name}</h3>
			{#if description}
				<p class="text-sm text-foreground-muted mt-0.5 line-clamp-2">{description}</p>
			{/if}
		</div>

		<div
			class={cn(
				'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium whitespace-nowrap',
				config.bg,
				config.border,
				'border'
			)}
		>
			<StatusIcon class={cn('w-4 h-4', config.color)} aria-hidden="true" />
			<span class={config.color}>{getStatusLabel(status)}</span>
		</div>
	</div>
</div>
