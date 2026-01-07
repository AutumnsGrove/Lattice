/**
 * Pricing utilities for Grove Plant.
 * Handles billing calculations and price formatting.
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/** Annual billing discount percentage (15% off) */
export const YEARLY_DISCOUNT = 0.15;

/** Billing cycle options */
export type BillingCycle = 'monthly' | 'yearly';

// ============================================================================
// CALCULATIONS
// ============================================================================

/**
 * Calculate the total yearly price with discount applied.
 * @param monthlyPrice - The base monthly price
 * @returns Total yearly price after discount
 */
export function calculateYearlyTotal(monthlyPrice: number): number {
	return monthlyPrice * 12 * (1 - YEARLY_DISCOUNT);
}

/**
 * Calculate the effective monthly price for yearly billing.
 * @param monthlyPrice - The base monthly price
 * @returns Monthly equivalent when billed yearly
 */
export function calculateYearlyMonthlyRate(monthlyPrice: number): number {
	return calculateYearlyTotal(monthlyPrice) / 12;
}

/**
 * Calculate yearly savings compared to monthly billing.
 * @param monthlyPrice - The base monthly price
 * @returns Amount saved per year
 */
export function calculateYearlySavings(monthlyPrice: number): number {
	const fullYearPrice = monthlyPrice * 12;
	return fullYearPrice - calculateYearlyTotal(monthlyPrice);
}

// ============================================================================
// FORMATTING
// ============================================================================

/**
 * Format price for display based on billing cycle.
 * Always returns a string for consistent rendering.
 * @param monthlyPrice - The base monthly price
 * @param cycle - The billing cycle ('monthly' | 'yearly')
 * @returns Formatted price string (e.g., "8" or "6.80")
 */
export function formatPrice(monthlyPrice: number, cycle: BillingCycle): string {
	if (cycle === 'yearly') {
		const yearlyMonthly = calculateYearlyMonthlyRate(monthlyPrice);
		// Show decimals only if needed
		return yearlyMonthly % 1 === 0
			? yearlyMonthly.toFixed(0)
			: yearlyMonthly.toFixed(2);
	}
	return monthlyPrice.toString();
}

/**
 * Format yearly savings for display.
 * @param monthlyPrice - The base monthly price
 * @returns Formatted savings string (e.g., "14")
 */
export function formatYearlySavings(monthlyPrice: number): string {
	return calculateYearlySavings(monthlyPrice).toFixed(0);
}

/**
 * Get full price breakdown for a plan.
 * @param monthlyPrice - The base monthly price
 * @param cycle - The billing cycle
 * @returns Object with all price info
 */
export function getPriceBreakdown(monthlyPrice: number, cycle: BillingCycle) {
	return {
		displayPrice: formatPrice(monthlyPrice, cycle),
		monthlyRate: cycle === 'monthly' ? monthlyPrice : calculateYearlyMonthlyRate(monthlyPrice),
		yearlyTotal: calculateYearlyTotal(monthlyPrice),
		yearlySavings: formatYearlySavings(monthlyPrice),
		isYearly: cycle === 'yearly'
	};
}
