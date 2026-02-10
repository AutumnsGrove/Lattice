<script lang="ts">
	/**
	 * PricingCTA
	 *
	 * Checkout button for a pricing tier.
	 * Handles URL generation and checkout initiation.
	 */

	import type { PricingCTAProps } from "./types.js";

	let {
		tier,
		billingPeriod,
		variant = "primary",
		size = "md",
		onCheckout,
		class: className = "",
	}: PricingCTAProps = $props();

	// Get the checkout URL for current period
	let checkoutUrl = $derived(
		billingPeriod === "monthly"
			? tier.checkoutUrls.monthly
			: tier.checkoutUrls.annual,
	);

	// Determine if this is a free tier
	let isFree = $derived(tier.monthlyPrice === 0);

	// Determine button text
	let buttonText = $derived(
		isFree
			? "Free"
			: tier.status === "coming_soon"
				? "Coming Soon"
				: tier.status === "future"
					? "Future"
					: checkoutUrl
						? "Get Started"
						: "Coming Soon",
	);

	// Is button disabled?
	let isDisabled = $derived(
		tier.status === "coming_soon" ||
			tier.status === "future" ||
			(tier.status === "available" && !isFree && !checkoutUrl),
	);

	// Size classes
	const sizeClasses = {
		sm: "px-3 py-1.5 text-sm",
		md: "px-4 py-2 text-base",
		lg: "px-6 py-3 text-lg",
	};

	// Variant classes
	const variantClasses = {
		primary:
			"bg-accent hover:bg-accent-hover text-white shadow-sm hover:shadow",
		secondary:
			"bg-white/80 dark:bg-grove-800/40 hover:bg-white/90 dark:hover:bg-grove-800/60 text-foreground border border-white/40 dark:border-grove-700/40",
		outline:
			"bg-transparent hover:bg-white/60 dark:hover:bg-grove-800/30 text-foreground border border-divider hover:border-accent",
	};

	function handleClick() {
		if (isDisabled) return;

		// Fire the checkout event
		onCheckout?.(tier.key, billingPeriod);

		// If we have a URL, navigate to it
		if (checkoutUrl) {
			window.location.href = checkoutUrl;
		} else if (!isFree && tier.status === "available") {
			// Warn developers about missing checkout URL for available paid tiers
			console.warn(
				`[PricingCTA] No checkout URL configured for tier "${tier.key}" (${billingPeriod}). ` +
					`Configure checkout URLs via checkoutUrls prop or LemonSqueezy environment variables.`,
			);
		}
	}
</script>

<button
	type="button"
	onclick={handleClick}
	disabled={isDisabled}
	class="
    inline-flex items-center justify-center font-medium rounded-lg
    transition-all duration-200
    disabled:opacity-50 disabled:cursor-not-allowed
    {sizeClasses[size]}
    {variantClasses[variant]}
    {className}
  "
>
	{buttonText}
</button>
