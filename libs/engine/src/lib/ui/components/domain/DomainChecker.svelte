<script>
	/**
	 * DomainChecker — Self-service domain availability checker
	 *
	 * Mirrors the UX of the Plant signup username checker:
	 * debounced input, real-time RDAP checks, clear status indicators.
	 *
	 * Visible to all tiers with tier-aware messaging:
	 * - Oak+: "This domain is available! Contact us to set it up."
	 * - Lower tiers: gentle upgrade prompt to Oak plan.
	 *
	 * @prop {string} username - Current user's subdomain (e.g. "autumn")
	 * @prop {string} userTier - Current tier key (e.g. "seedling", "oak")
	 * @prop {"inline" | "modal"} variant - Layout variant
	 */

	import { Check, X, Loader2, Globe, ExternalLink } from "lucide-svelte";
	import { TIERS } from "$lib/config/tiers";

	/** @type {{ username: string; userTier: string; variant?: "inline" | "modal" }} */
	let { username, userTier, variant = "inline" } = $props();

	// Domain input state
	let domainInput = $state("");
	/** @type {"idle" | "checking" | "available" | "registered" | "unknown" | "error"} */
	let domainStatus = $state("idle");
	/** @type {string | null} */
	let domainError = $state(null);
	/** @type {string | null} */
	let registrar = $state(null);
	/** @type {string} */
	let checkedDomain = $state("");
	/** @type {ReturnType<typeof setTimeout>} */
	let debounceTimer;

	// Tier checks
	const hasCustomDomain = $derived(
		TIERS[/** @type {import("$lib/config/tiers").TierKey} */ (userTier)]?.features?.customDomain ?? false,
	);
	const oakTier = TIERS.oak;

	/**
	 * Check domain availability via the engine API
	 * @param {string} value
	 */
	async function checkDomain(value) {
		const trimmed = value.trim();

		if (!trimmed) {
			domainStatus = "idle";
			domainError = null;
			registrar = null;
			checkedDomain = "";
			return;
		}

		// Add .com if no TLD provided
		const query = trimmed.includes(".") ? trimmed : `${trimmed}.com`;

		domainStatus = "checking";
		domainError = null;
		registrar = null;
		checkedDomain = query;

		try {
			const res = await fetch(`/api/check-domain?domain=${encodeURIComponent(query)}`); // csrf-ok: GET-only read
			const result = /** @type {{ domain: string; status: string; registrar?: string; error?: string }} */ (
				await res.json()
			);

			// Only update if this is still the current check
			if (checkedDomain !== query) return;

			if (res.status === 429) {
				domainStatus = "error";
				domainError = result.error || "Too many requests — try again shortly";
				return;
			}

			if (result.status === "available") {
				domainStatus = "available";
				domainError = null;
				checkedDomain = result.domain;
			} else if (result.status === "registered") {
				domainStatus = "registered";
				domainError = null;
				registrar = result.registrar || null;
				checkedDomain = result.domain;
			} else {
				domainStatus = "unknown";
				domainError = result.error || "Could not determine availability";
			}
		} catch {
			if (checkedDomain === query) {
				domainStatus = "error";
				domainError = "Unable to check availability right now";
			}
		}
	}

	/** Debounced domain check */
	function onDomainInput() {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => checkDomain(domainInput), 400);
	}
</script>

<div class="domain-checker" class:domain-checker--modal={variant === "modal"}>
	<!-- Header -->
	<div class="domain-checker__header">
		<Globe size={20} class="domain-checker__icon" />
		<h3 class="domain-checker__title">Check Domain Availability</h3>
	</div>

	<p class="domain-checker__subtitle">
		Your grove lives at <strong>{username}.grove.place</strong> — want your own address?
	</p>

	<!-- Input -->
	<div class="domain-checker__input-wrap">
		<input
			type="text"
			bind:value={domainInput}
			oninput={onDomainInput}
			placeholder="yourdomain.com"
			class="domain-checker__input"
			class:domain-checker__input--available={domainStatus === "available"}
			class:domain-checker__input--taken={domainStatus === "registered"}
			class:domain-checker__input--error={domainStatus === "unknown" || domainStatus === "error"}
		/>
		<div class="domain-checker__status-icon">
			{#if domainStatus === "checking"}
				<Loader2 size={18} class="domain-checker__spinner" />
			{:else if domainStatus === "available"}
				<Check size={18} class="domain-checker__check" />
			{:else if domainStatus === "registered"}
				<X size={18} class="domain-checker__x" />
			{:else if domainStatus === "unknown" || domainStatus === "error"}
				<X size={18} class="domain-checker__x" />
			{/if}
		</div>
	</div>

	<!-- Hint when no TLD entered -->
	{#if domainInput && !domainInput.includes(".")}
		<p class="domain-checker__hint">
			We'll check <strong>{domainInput}.com</strong> — or type a full domain like {domainInput}.net
		</p>
	{/if}

	<!-- Result messages -->
	{#if domainStatus === "available"}
		<div class="domain-checker__result domain-checker__result--available">
			<Check size={16} />
			<span><strong>{checkedDomain}</strong> is available!</span>
		</div>

		{#if hasCustomDomain}
			<p class="domain-checker__action">
				Reach out to us and we'll get this set up for your grove.
			</p>
		{:else}
			<div class="domain-checker__upsell">
				<p>
					Custom domains are available starting with the
					<strong>{oakTier.display.name}</strong> plan
					(${oakTier.pricing.monthlyPrice}/mo).
				</p>
				<a href="/arbor/account" class="domain-checker__upsell-link">
					See plans <ExternalLink size={14} />
				</a>
			</div>
		{/if}
	{:else if domainStatus === "registered"}
		<div class="domain-checker__result domain-checker__result--taken">
			<X size={16} />
			<span>
				<strong>{checkedDomain}</strong> is already registered{registrar ? ` (via ${registrar})` : ""}
			</span>
		</div>
	{:else if domainError}
		<p class="domain-checker__error">{domainError}</p>
	{/if}

	<!-- Footer help text -->
	{#if domainInput && domainStatus !== "idle" && domainStatus !== "checking"}
		<p class="domain-checker__footer">
			Need help finding the perfect domain? Reach out and we can run a deeper search for you.
		</p>
	{/if}
</div>

<style>
	.domain-checker {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.domain-checker--modal {
		padding: 0;
	}
	.domain-checker__header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	:global(.domain-checker__icon) {
		color: var(--color-primary);
		flex-shrink: 0;
	}
	.domain-checker__title {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--color-text);
	}
	.domain-checker__subtitle {
		margin: 0;
		font-size: 0.9rem;
		color: var(--color-text-muted);
	}
	.domain-checker__input-wrap {
		position: relative;
	}
	.domain-checker__input {
		width: 100%;
		padding: 0.75rem 1rem;
		padding-right: 2.75rem;
		border: 2px solid var(--color-border);
		border-radius: var(--border-radius-standard);
		background: rgba(255, 255, 255, 0.7);
		color: var(--color-text);
		font-size: 1rem;
		transition:
			border-color 0.2s,
			background-color 0.2s;
	}
	:global(.dark) .domain-checker__input {
		background: rgba(30, 30, 30, 0.5);
	}
	.domain-checker__input::placeholder {
		color: var(--color-text-subtle);
	}
	.domain-checker__input:focus {
		outline: none;
		border-color: var(--color-primary);
		background: rgba(255, 255, 255, 0.85);
	}
	:global(.dark) .domain-checker__input:focus {
		background: rgba(30, 30, 30, 0.7);
	}
	.domain-checker__input--available {
		border-color: var(--accent-success-dark, #16a34a);
	}
	.domain-checker__input--available:focus {
		border-color: var(--accent-success-dark, #16a34a);
	}
	.domain-checker__input--taken,
	.domain-checker__input--error {
		border-color: var(--accent-danger, #dc2626);
	}
	.domain-checker__input--taken:focus,
	.domain-checker__input--error:focus {
		border-color: var(--accent-danger, #dc2626);
	}
	.domain-checker__status-icon {
		position: absolute;
		right: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		align-items: center;
	}
	:global(.domain-checker__spinner) {
		animation: spin 1s linear infinite;
		color: var(--color-text-subtle);
	}
	:global(.domain-checker__check) {
		color: var(--accent-success-dark, #16a34a);
	}
	:global(.domain-checker__x) {
		color: var(--accent-danger, #dc2626);
	}
	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
	.domain-checker__hint {
		margin: 0;
		font-size: 0.8rem;
		color: var(--color-text-subtle);
	}
	.domain-checker__result {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 0.875rem;
		border-radius: var(--border-radius-standard);
		font-size: 0.9rem;
	}
	.domain-checker__result--available {
		background: rgba(22, 163, 74, 0.08);
		color: var(--accent-success-dark, #16a34a);
	}
	:global(.dark) .domain-checker__result--available {
		background: rgba(22, 163, 74, 0.15);
		color: #4ade80;
	}
	.domain-checker__result--taken {
		background: rgba(220, 38, 38, 0.08);
		color: var(--accent-danger, #dc2626);
	}
	:global(.dark) .domain-checker__result--taken {
		background: rgba(220, 38, 38, 0.15);
		color: #f87171;
	}
	.domain-checker__action {
		margin: 0;
		font-size: 0.875rem;
		color: var(--color-text-muted);
	}
	.domain-checker__upsell {
		padding: 0.75rem 1rem;
		border-radius: var(--border-radius-standard);
		background: rgba(44, 95, 45, 0.06);
		border: 1px solid rgba(44, 95, 45, 0.15);
		font-size: 0.875rem;
		color: var(--color-text-muted);
	}
	:global(.dark) .domain-checker__upsell {
		background: rgba(92, 184, 95, 0.08);
		border-color: rgba(92, 184, 95, 0.2);
	}
	.domain-checker__upsell p {
		margin: 0 0 0.5rem 0;
	}
	.domain-checker__upsell-link {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		color: var(--color-primary);
		text-decoration: none;
		font-weight: 500;
		font-size: 0.85rem;
	}
	.domain-checker__upsell-link:hover {
		text-decoration: underline;
	}
	.domain-checker__error {
		margin: 0;
		font-size: 0.85rem;
		color: var(--accent-danger, #dc2626);
	}
	.domain-checker__footer {
		margin: 0;
		font-size: 0.8rem;
		color: var(--color-text-subtle);
		font-style: italic;
	}
</style>
