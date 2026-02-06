<script lang="ts">
	/**
	 * OnboardingChecklist
	 *
	 * A warm, glassy progress indicator showing where the wanderer is
	 * in their journey to taking root in the Grove.
	 */

	import { Check, User, Mail, CreditCard, Sparkles } from 'lucide-svelte';
	import { GlassCard, GroveSwap } from '@autumnsgrove/groveengine/ui';
	import { page } from '$app/state';

	// Define onboarding steps with Grove-friendly language
	const steps = [
		{ id: 'profile', label: 'Tell us about yourself', icon: User, path: '/profile' },
		{ id: 'verify-email', label: 'Verify your email', icon: Mail, path: '/verify-email' },
		{ id: 'plans', label: 'Choose your path', icon: CreditCard, path: '/plans' },
		{ id: 'success', label: 'Welcome home', icon: Sparkles, path: '/success' }
	];

	interface Props {
		onboarding: {
			step: string;
			profileCompleted: boolean;
			emailVerified: boolean;
			planSelected: string | null;
			paymentCompleted: boolean;
			tenantCreated: boolean;
		} | null;
	}

	let { onboarding }: Props = $props();

	// Determine step status
	function getStepStatus(stepId: string): 'completed' | 'current' | 'upcoming' {
		if (!onboarding) return 'upcoming';

		const currentStep = onboarding.step;
		const stepOrder = ['profile', 'verify-email', 'plans', 'checkout', 'success', 'tour'];
		const currentIndex = stepOrder.indexOf(currentStep);
		const stepIndex = stepOrder.indexOf(stepId);

		// Handle checkout as part of plans step in UI
		const effectiveCurrentIndex =
			currentStep === 'checkout' ? stepOrder.indexOf('plans') : currentIndex;

		if (stepIndex < effectiveCurrentIndex) {
			return 'completed';
		} else if (stepId === currentStep || (stepId === 'plans' && currentStep === 'checkout')) {
			return 'current';
		} else {
			return 'upcoming';
		}
	}

	let currentPath = $derived(page.url.pathname);

	// Count completed steps for progress indicator
	let completedCount = $derived(
		steps.filter((step) => getStepStatus(step.id) === 'completed').length
	);
</script>

<!-- Mobile: Compact horizontal stepper -->
<div class="md:hidden">
	<GlassCard variant="frosted" class="!p-3">
		<div class="flex items-center justify-between">
			{#each steps as step, index}
				{@const status = getStepStatus(step.id)}
				{@const Icon = step.icon}

				<div class="flex items-center">
					<!-- Step circle -->
					<div
						class="relative flex items-center justify-center w-9 h-9 rounded-full transition-all duration-300
							{status === 'completed'
							? 'bg-emerald-500/90 text-white shadow-md shadow-emerald-500/30'
							: status === 'current'
								? 'bg-primary/90 text-white shadow-lg shadow-primary/40 ring-2 ring-primary/30 ring-offset-2 ring-offset-white/50 dark:ring-offset-slate-800/50'
								: 'bg-white/50 dark:bg-slate-700/50 text-foreground-muted backdrop-blur-sm border border-white/40 dark:border-slate-600/40'}"
					>
						{#if status === 'completed'}
							<Check size={16} strokeWidth={2.5} />
						{:else}
							<Icon size={16} />
						{/if}
					</div>

					<!-- Connector line -->
					{#if index < steps.length - 1}
						<div
							class="w-6 h-0.5 mx-1 rounded-full transition-colors duration-300
								{status === 'completed' ? 'bg-emerald-500/70' : 'bg-white/30 dark:bg-slate-600/30'}"
						></div>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Progress text -->
		<p class="text-xs text-center text-foreground-muted mt-2">
			Step {completedCount + 1} of {steps.length}
		</p>
	</GlassCard>
</div>

<!-- Desktop: Vertical detailed list with glass styling -->
<div class="hidden md:block">
	<GlassCard variant="frosted" title="Your journey" gossamer="grove-mist" gossamerOpacity={0.03}>
		<div class="space-y-1">
			{#each steps as step, index}
				{@const status = getStepStatus(step.id)}
				{@const Icon = step.icon}
				{@const isActive = currentPath === step.path}

				<div class="flex items-center gap-4 py-2 group">
					<!-- Step indicator with vertical connector -->
					<div class="relative flex flex-col items-center">
						<!-- Circle -->
						<div
							class="flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300
								{status === 'completed'
								? 'bg-emerald-500/90 text-white shadow-md shadow-emerald-500/25'
								: status === 'current'
									? 'bg-primary/90 text-white shadow-lg shadow-primary/30 ring-2 ring-primary/20 ring-offset-2 ring-offset-white/30 dark:ring-offset-slate-800/30'
									: 'bg-white/60 dark:bg-slate-700/60 text-foreground-muted backdrop-blur-sm border border-white/50 dark:border-slate-600/40'}"
						>
							{#if status === 'completed'}
								<Check size={18} strokeWidth={2.5} />
							{:else}
								<Icon size={18} />
							{/if}
						</div>

						<!-- Vertical connector (except for last item) -->
						{#if index < steps.length - 1}
							<div
								class="absolute top-10 left-1/2 -translate-x-1/2 w-0.5 h-8 rounded-full transition-colors duration-300
									{status === 'completed' ? 'bg-emerald-500/50' : 'bg-white/30 dark:bg-slate-600/30'}"
							></div>
						{/if}
					</div>

					<!-- Label -->
					<div class="flex-1 min-w-0">
						<p
							class="text-sm font-medium transition-colors duration-200
								{status === 'completed'
								? 'text-emerald-600 dark:text-emerald-400'
								: status === 'current'
									? 'text-foreground'
									: 'text-foreground-muted'}"
						>
							{step.label}
						</p>

						{#if status === 'current' && isActive}
							<p class="text-xs text-primary/80 mt-0.5 flex items-center gap-1">
								<span class="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
								You are here
							</p>
						{/if}
					</div>
				</div>
			{/each}
		</div>

		<!-- Encouraging footer message -->
		{#snippet footer()}
			<p class="text-xs text-foreground-subtle text-center">
				{#if completedCount === 0}
					Let's get started<GroveSwap term="wanderer" standard="">, Wanderer</GroveSwap> ✨
				{:else if completedCount < steps.length - 1}
					You're making great progress!
				{:else}
					Almost there—welcome home awaits 🌲
				{/if}
			</p>
		{/snippet}
	</GlassCard>
</div>
