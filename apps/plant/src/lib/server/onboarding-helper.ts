/**
 * Onboarding Helpers
 *
 * Shared utility functions for the onboarding flow.
 */

/**
 * Check if a plan should skip the checkout page.
 *
 * Free (Wanderer) plans don't require payment processing,
 * so they skip directly to success page.
 *
 * @param plan - The selected plan key
 * @returns true if the plan should skip checkout
 */
export function shouldSkipCheckout(plan: string): boolean {
  return plan === "free";
}
