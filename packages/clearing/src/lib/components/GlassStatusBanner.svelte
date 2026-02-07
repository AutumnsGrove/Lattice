<script lang="ts">
	/**
	 * GlassStatusBanner - Large overall status indicator
	 *
	 * The main hero banner showing the current overall platform status.
	 * Uses glassmorphism with status-appropriate coloring.
	 */
	import { cn } from '@autumnsgrove/groveengine/ui/utils';
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
			bgGradient: 'from-green-500/20 via-green-500/10 to-transparent',
			borderColor: 'border-green-500/30',
			iconColor: 'text-green-500',
			textColor: 'text-green-700 dark:text-green-300'
		},
		degraded: {
			icon: AlertTriangle,
			label: 'Degraded Performance',
			description: 'Some services are experiencing slowdowns.',
			bgGradient: 'from-yellow-500/20 via-yellow-500/10 to-transparent',
			borderColor: 'border-yellow-500/30',
			iconColor: 'text-yellow-500',
			textColor: 'text-yellow-700 dark:text-yellow-300'
		},
		partial_outage: {
			icon: AlertCircle,
			label: 'Partial Outage',
			description: 'Some services are currently unavailable.',
			bgGradient: 'from-orange-500/20 via-orange-500/10 to-transparent',
			borderColor: 'border-orange-500/30',
			iconColor: 'text-orange-500',
			textColor: 'text-orange-700 dark:text-orange-300'
		},
		major_outage: {
			icon: XCircle,
			label: 'Major Outage',
			description: 'We are experiencing significant issues.',
			bgGradient: 'from-red-500/20 via-red-500/10 to-transparent',
			borderColor: 'border-red-500/30',
			iconColor: 'text-red-500',
			textColor: 'text-red-700 dark:text-red-300'
		},
		maintenance: {
			icon: Wrench,
			label: 'Under Maintenance',
			description: 'Scheduled maintenance is in progress.',
			bgGradient: 'from-blue-500/20 via-blue-500/10 to-transparent',
			borderColor: 'border-blue-500/30',
			iconColor: 'text-blue-500',
			textColor: 'text-blue-700 dark:text-blue-300'
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
			status === 'operational' && 'bg-green-500',
			status === 'degraded' && 'bg-yellow-500',
			status === 'partial_outage' && 'bg-orange-500',
			status === 'major_outage' && 'bg-red-500',
			status === 'maintenance' && 'bg-blue-500'
		)}
		aria-hidden="true"
	></div>

	<div class="relative p-8 md:p-10 text-center">
		<div class="flex justify-center mb-4">
			<div class={cn(
				'p-3 rounded-full',
				'bg-white/70 dark:bg-bark-800/50',
				'ring-2 ring-inset',
				status === 'operational' && 'ring-green-500/30',
				status === 'degraded' && 'ring-yellow-500/30',
				status === 'partial_outage' && 'ring-orange-500/30',
				status === 'major_outage' && 'ring-red-500/30',
				status === 'maintenance' && 'ring-blue-500/30'
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
