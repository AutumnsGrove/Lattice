<script lang="ts">
	/**
	 * GlassStatusBanner - Large overall status indicator
	 *
	 * The main hero banner showing the current overall platform status.
	 * Uses glassmorphism with status-appropriate coloring.
	 */
	import { cn } from '@autumnsgrove/lattice/ui/utils';
	import { formatRelativeTime } from '$lib/utils/date';
	import type { OverallStatus } from '$lib/types/status';
	import {
		CheckCircle,
		AlertTriangle,
		AlertCircle,
		XCircle,
		Wrench
	} from 'lucide-svelte';

	interface Props {
		status: OverallStatus;
		lastUpdated: string;
		class?: string;
	}

	let { status, lastUpdated, class: className }: Props = $props();

	// Status configuration
	const statusConfig = {
		operational: {
			icon: CheckCircle,
			label: 'All Systems Operational',
			description: 'Everything is running smoothly.',
			bgGradient: 'from-success/20 via-success/10 to-transparent',
			borderColor: 'border-success/30',
			iconColor: 'text-success',
			textColor: 'text-success'
		},
		degraded: {
			icon: AlertTriangle,
			label: 'Degraded Performance',
			description: 'Some services are experiencing slowdowns.',
			bgGradient: 'from-warning/20 via-warning/10 to-transparent',
			borderColor: 'border-warning/30',
			iconColor: 'text-warning',
			textColor: 'text-warning'
		},
		partial_outage: {
			icon: AlertCircle,
			label: 'Partial Outage',
			description: 'Some services are currently unavailable.',
			bgGradient: 'from-warning/20 via-warning/10 to-transparent',
			borderColor: 'border-warning/30',
			iconColor: 'text-warning',
			textColor: 'text-warning'
		},
		major_outage: {
			icon: XCircle,
			label: 'Major Outage',
			description: 'We are experiencing significant issues.',
			bgGradient: 'from-error/20 via-error/10 to-transparent',
			borderColor: 'border-error/30',
			iconColor: 'text-error',
			textColor: 'text-error'
		},
		maintenance: {
			icon: Wrench,
			label: 'Under Maintenance',
			description: 'Scheduled maintenance is in progress.',
			bgGradient: 'from-info/20 via-info/10 to-transparent',
			borderColor: 'border-info/30',
			iconColor: 'text-info',
			textColor: 'text-info'
		}
	};

	const config = $derived(statusConfig[status]);
	const StatusIcon = $derived(config.icon);
</script>

<div
	class={cn(
		'relative overflow-hidden rounded-2xl border backdrop-blur-md',
		'bg-gradient-to-br',
		config.bgGradient,
		config.borderColor,
		'bg-white/80 dark:bg-bark-900/40',
		className
	)}
>
	<!-- Decorative background glow -->
	<div
		class={cn(
			'absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-30',
			status === 'operational' && 'bg-success',
			status === 'degraded' && 'bg-warning',
			status === 'partial_outage' && 'bg-warning',
			status === 'major_outage' && 'bg-error',
			status === 'maintenance' && 'bg-info'
		)}
		aria-hidden="true"
	></div>

	<div class="relative p-8 md:p-10 text-center">
		<div class="flex justify-center mb-4">
			<div class={cn(
				'p-3 rounded-full',
				'bg-white/70 dark:bg-bark-800/50',
				'ring-2 ring-inset',
				status === 'operational' && 'ring-success/30',
				status === 'degraded' && 'ring-warning/30',
				status === 'partial_outage' && 'ring-warning/30',
				status === 'major_outage' && 'ring-error/30',
				status === 'maintenance' && 'ring-info/30'
			)}>
				<StatusIcon class={cn('w-10 h-10', config.iconColor)} />
			</div>
		</div>

		<h2 class={cn('text-2xl md:text-3xl font-semibold mb-2', config.textColor)}>
			{config.label}
		</h2>

		<p class="text-foreground-muted mb-4">
			{config.description}
		</p>

		<p class="text-sm text-foreground-subtle">
			Last updated: {formatRelativeTime(lastUpdated)}
		</p>
	</div>
</div>
