<script lang="ts">
	import { CultivateFlagTable } from "@autumnsgrove/lattice/grafts/greenhouse";
	import { GlassCard } from "@autumnsgrove/lattice/ui";
	import { enhance } from "$app/forms";
	import { invalidateAll } from "$app/navigation";
	import {
		Sprout,
		Users,
		CheckCircle,
		XCircle,
		Leaf,
		ArrowRight,
		AlertTriangle,
	} from "@lucide/svelte";
	import type { FlagMaturity } from "@autumnsgrove/lattice/feature-flags";
	import type { PageData, ActionData } from "./$types";

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Form references for cultivate/prune/maturity
	let cultivateFormRef = $state<HTMLFormElement | null>(null);
	let pruneFormRef = $state<HTMLFormElement | null>(null);
	let maturityFormRef = $state<HTMLFormElement | null>(null);

	// Hidden input values
	let cultivateFlagId = $state("");
	let pruneFlagId = $state("");
	let maturityFlagId = $state("");
	let maturityValue = $state("");

	// Loading states
	let loadingFlagId = $state<string | undefined>(undefined);

	// Demotion confirmation dialog state
	let confirmDialogOpen = $state(false);
	let pendingDemotion = $state<{
		flagId: string;
		flagName: string;
		from: FlagMaturity;
		to: FlagMaturity;
	} | null>(null);

	const maturityLabels: Record<FlagMaturity, string> = {
		experimental: "Experimental",
		beta: "Beta",
		stable: "Stable",
		graduated: "Graduated",
	};

	const maturityOrder: FlagMaturity[] = ["experimental", "beta", "stable", "graduated"];

	function isDemotion(from: FlagMaturity, to: FlagMaturity): boolean {
		return maturityOrder.indexOf(to) < maturityOrder.indexOf(from);
	}

	function handleFlagToggle(flagId: string, enabled: boolean) {
		loadingFlagId = flagId;
		if (enabled) {
			cultivateFlagId = flagId;
			requestAnimationFrame(() => cultivateFormRef?.requestSubmit());
		} else {
			pruneFlagId = flagId;
			requestAnimationFrame(() => pruneFormRef?.requestSubmit());
		}
	}

	function handleMaturityChange(flagId: string, newMaturity: FlagMaturity) {
		const flag = data.featureFlags.find((f) => f.id === flagId);
		if (!flag) return;

		if (isDemotion(flag.maturity, newMaturity)) {
			// Show confirmation dialog for demotions
			pendingDemotion = {
				flagId,
				flagName:
					flag.name ||
					flagId
						.split("_")
						.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
						.join(" "),
				from: flag.maturity,
				to: newMaturity,
			};
			confirmDialogOpen = true;
		} else {
			// Promotions go through immediately
			submitMaturityChange(flagId, newMaturity);
		}
	}

	function confirmDemotion() {
		if (pendingDemotion) {
			submitMaturityChange(pendingDemotion.flagId, pendingDemotion.to);
		}
		closeDemotionDialog();
	}

	function closeDemotionDialog() {
		confirmDialogOpen = false;
		pendingDemotion = null;
	}

	function submitMaturityChange(flagId: string, maturity: FlagMaturity) {
		loadingFlagId = flagId;
		maturityFlagId = flagId;
		maturityValue = maturity;
		requestAnimationFrame(() => maturityFormRef?.requestSubmit());
	}

	function enhanceCallback() {
		return async ({ update }: { update: () => Promise<void> }) => {
			await update();
			loadingFlagId = undefined;
			await invalidateAll();
		};
	}
</script>

<!-- Hidden forms -->
<form
	bind:this={cultivateFormRef}
	method="POST"
	action="?/cultivate"
	use:enhance={enhanceCallback}
	class="hidden"
	aria-hidden="true"
>
	<input type="hidden" name="flagId" value={cultivateFlagId} />
</form>

<form
	bind:this={pruneFormRef}
	method="POST"
	action="?/prune"
	use:enhance={enhanceCallback}
	class="hidden"
	aria-hidden="true"
>
	<input type="hidden" name="flagId" value={pruneFlagId} />
</form>

<form
	bind:this={maturityFormRef}
	method="POST"
	action="?/setMaturity"
	use:enhance={enhanceCallback}
	class="hidden"
	aria-hidden="true"
>
	<input type="hidden" name="flagId" value={maturityFlagId} />
	<input type="hidden" name="maturity" value={maturityValue} />
</form>

<svelte:head>
	<title>Greenhouse - Admin</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<h2 class="flex items-center gap-2 text-2xl font-serif text-foreground mb-1">
			<Sprout class="w-6 h-6 text-success" />
			Greenhouse
		</h2>
		<p class="text-sm font-sans text-foreground-muted">
			Manage feature flag cultivation for the entire Grove
		</p>
	</div>

	<!-- Action result message -->
	{#if form?.success}
		<GlassCard class="p-4">
			<div class="flex items-center gap-2 text-sm font-sans">
				<CheckCircle class="w-4 h-4 text-success shrink-0" />
				<span class="text-foreground">{form.message || "Action completed"}</span>
			</div>
		</GlassCard>
	{:else if form?.error}
		<GlassCard class="p-4">
			<div class="flex items-center gap-2 text-sm font-sans">
				<XCircle class="w-4 h-4 text-error shrink-0" />
				<span class="text-error">{form.error}</span>
			</div>
		</GlassCard>
	{/if}

	<!-- Enrollment Stats -->
	<div class="grid grid-cols-2 gap-4">
		<GlassCard class="p-4 text-center">
			<div class="text-2xl font-serif text-success">
				{data.enrolledCount}
			</div>
			<div class="flex items-center justify-center gap-1.5 text-sm font-sans text-foreground-muted">
				<Users class="w-4 h-4" />
				Enrolled
			</div>
		</GlassCard>
		<GlassCard class="p-4 text-center">
			<div class="text-2xl font-serif text-success">
				{data.activeCount}
			</div>
			<div class="flex items-center justify-center gap-1.5 text-sm font-sans text-foreground-muted">
				<CheckCircle class="w-4 h-4" />
				Active
			</div>
		</GlassCard>
	</div>

	<!-- Info card: enrollment moved -->
	<GlassCard class="p-4">
		<div class="flex items-start gap-3">
			<div class="shrink-0 w-10 h-10 rounded-lg bg-success-bg flex items-center justify-center">
				<Sprout class="w-5 h-5 text-success" />
			</div>
			<div>
				<h3 class="text-sm font-sans font-medium text-foreground mb-1">
					Per-tenant enrollment has moved
				</h3>
				<p class="text-sm font-sans text-foreground-muted mb-2">
					Enroll, toggle, and manage individual tenants from their detail page. This page now
					focuses on global feature flag management.
				</p>
				<a
					href="/arbor/tenants"
					class="inline-flex items-center gap-1 text-sm font-sans text-primary hover:text-primary/80"
				>
					Go to Tenants
					<ArrowRight class="w-3.5 h-3.5" />
				</a>
			</div>
		</div>
	</GlassCard>

	<!-- Cultivate Mode -->
	<div class="pt-4 border-t border-border/30">
		<div class="mb-4">
			<div class="flex items-center gap-2 mb-1">
				<Leaf class="w-5 h-5 text-success" />
				<h3 class="text-lg font-serif text-foreground">Cultivate Mode</h3>
			</div>
			<p class="text-sm font-sans text-foreground-muted">
				Toggle features globally and manage their lifecycle maturity
			</p>
		</div>

		<CultivateFlagTable
			flags={data.featureFlags}
			onToggle={handleFlagToggle}
			onMaturityChange={handleMaturityChange}
			{loadingFlagId}
		/>
	</div>
</div>

<!-- Demotion Confirmation Dialog -->
{#if confirmDialogOpen && pendingDemotion}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby="demotion-title"
	>
		<!-- Backdrop -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="absolute inset-0 bg-bark-950/40 backdrop-blur-sm"
			onkeydown={(e) => e.key === "Escape" && closeDemotionDialog()}
			onclick={closeDemotionDialog}
		></div>

		<!-- Dialog -->
		<div
			class="relative w-full max-w-md bg-surface border border-border rounded-xl shadow-xl p-6 space-y-4"
		>
			<div class="flex items-start gap-3">
				<div class="shrink-0 w-10 h-10 rounded-lg bg-warning-bg flex items-center justify-center">
					<AlertTriangle class="w-5 h-5 text-warning" />
				</div>
				<div>
					<h3 id="demotion-title" class="text-base font-serif font-medium text-foreground">
						Confirm Maturity Demotion
					</h3>
					<p class="text-sm font-sans text-foreground-muted mt-1">
						You're about to move <strong class="text-foreground">{pendingDemotion.flagName}</strong>
						from <span class="font-medium">{maturityLabels[pendingDemotion.from]}</span>
						back to <span class="font-medium">{maturityLabels[pendingDemotion.to]}</span>.
					</p>
					{#if pendingDemotion.from === "graduated" || pendingDemotion.from === "stable"}
						<p class="text-sm font-sans text-warning mt-2">
							This flag is currently in production. Demoting it may affect live behavior for tenants
							who rely on it.
						</p>
					{/if}
				</div>
			</div>

			<div class="flex items-center justify-end gap-3 pt-2">
				<button
					onclick={closeDemotionDialog}
					class="px-4 py-2 text-sm font-sans font-medium text-foreground-muted hover:text-foreground rounded-lg hover:bg-foreground/5 transition-colors"
				>
					Cancel
				</button>
				<button
					onclick={confirmDemotion}
					class="px-4 py-2 text-sm font-sans font-medium text-warning-foreground bg-warning hover:bg-warning/90 rounded-lg transition-colors"
				>
					Yes, Demote
				</button>
			</div>
		</div>
	</div>
{/if}
