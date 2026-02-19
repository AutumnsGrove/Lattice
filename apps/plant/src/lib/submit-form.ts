/**
 * Client-side JSON form submission
 *
 * Replaces SvelteKit's `use:enhance` + form actions pattern.
 * Needed because grove-router's POST proxy responses cause iOS Safari
 * to offer a file download instead of rendering the HTML redirect.
 *
 * Usage:
 *   const result = await submitForm('/api/select-plan', { plan, billingCycle });
 *   if (result.redirect) goto(result.redirect);
 *   else submitError = result.error;
 */

import { goto } from "$app/navigation";

export interface FormResult {
  success: boolean;
  error?: string;
  redirect?: string;
  /** Any extra data the endpoint returns */
  [key: string]: unknown;
}

/**
 * Submit form data as JSON to an API endpoint and handle the response.
 *
 * @returns The parsed response — caller handles UI updates
 * @throws Never — all errors are captured in the result
 */
export async function submitForm(
  url: string,
  data: Record<string, unknown>,
): Promise<FormResult> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = (await res.json()) as FormResult;
    return result;
  } catch {
    return {
      success: false,
      error:
        "Unable to reach the server. Please check your connection and try again.",
    };
  }
}

/**
 * Submit and auto-navigate on success.
 * Returns the error string if something went wrong, or null on success.
 */
export async function submitFormAndGo(
  url: string,
  data: Record<string, unknown>,
  fallbackRedirect?: string,
): Promise<string | null> {
  const result = await submitForm(url, data);

  if (result.success) {
    const target = result.redirect || fallbackRedirect;
    if (target) goto(target);
    return null;
  }

  return result.error || "Something went wrong. Please try again.";
}
