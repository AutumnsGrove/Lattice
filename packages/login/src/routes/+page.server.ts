/**
 * Login Page — Server Actions
 *
 * Handles Google OAuth and magic link auth entirely server-side.
 * Passkeys remain client-side (WebAuthn requires browser APIs — navigator.credentials
 * is a browser-only API that cannot be called from a Worker).
 *
 * By running these as SvelteKit form actions:
 * - No JavaScript required for Google or email sign-in
 * - The redirect cookie is now HttpOnly (no document.cookie workaround needed)
 * - All auth logic runs in the Cloudflare Worker isolate alongside everything else
 */

import { redirect, fail } from "@sveltejs/kit";
import type { Actions } from "./$types";
import { validateRedirectUrl } from "$lib/redirect";

const DEFAULT_AUTH_URL = "https://login.grove.place";

/**
 * Parsed representation of a Set-Cookie header string.
 * Used to forward cookies that Heartwood sets (e.g. better-auth.oauth_state)
 * when the auth flow is initiated from a server-side form action rather than
 * a client-side fetch.
 */
type SetCookieOpts = {
  path: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "strict" | "lax" | "none";
  maxAge?: number;
  domain?: string;
};

function parseRawSetCookie(
  raw: string,
): { name: string; value: string; options: SetCookieOpts } | null {
  const parts = raw.split(";").map((p) => p.trim());
  const first = parts[0];
  if (!first) return null;

  const eqIdx = first.indexOf("=");
  if (eqIdx === -1) return null;

  const name = first.slice(0, eqIdx);
  const value = first.slice(eqIdx + 1);
  const options: SetCookieOpts = { path: "/" };

  for (const attr of parts.slice(1)) {
    const lower = attr.toLowerCase();
    if (lower === "httponly") options.httpOnly = true;
    else if (lower === "secure") options.secure = true;
    else if (lower.startsWith("samesite=")) {
      const sv = attr.split("=")[1]?.toLowerCase();
      if (sv === "strict" || sv === "lax" || sv === "none") {
        options.sameSite = sv;
      }
    } else if (lower.startsWith("path=")) {
      options.path = attr.split("=")[1] ?? "/";
    } else if (lower.startsWith("max-age=")) {
      options.maxAge = parseInt(attr.split("=")[1] ?? "0", 10);
    } else if (lower.startsWith("domain=")) {
      options.domain = attr.split("=")[1];
    }
  }

  return { name, value, options };
}

export const actions: Actions = {
  /**
   * Google OAuth — triggers the OAuth redirect entirely server-side.
   *
   * Calls Heartwood via service binding to get the Google authorization URL,
   * sets the redirect cookie (now HttpOnly), forwards the oauth_state cookie
   * Better Auth generates, then redirects the browser to Google.
   */
  google: async ({ request, cookies, platform, url }) => {
    const formData = await request.formData();
    const redirectTo = validateRedirectUrl(
      formData.get("redirect")?.toString(),
    );
    const callbackURL = `/callback?redirect=${encodeURIComponent(redirectTo)}`;

    if (!platform?.env?.AUTH) {
      return fail(503, {
        provider: "google" as const,
        error: "Auth service unavailable. Please try again shortly.",
      });
    }

    // Set redirect cookie server-side — now HttpOnly.
    // Previously this required document.cookie because there was no server action
    // to call before the client-initiated OAuth navigation began.
    cookies.set("grove_auth_redirect", encodeURIComponent(redirectTo), {
      path: "/",
      maxAge: 600,
      sameSite: "lax",
      secure: true,
      httpOnly: true,
    });

    const authBaseUrl = platform.env.GROVEAUTH_URL ?? DEFAULT_AUTH_URL;
    let response: Response;
    try {
      response = await platform.env.AUTH.fetch(
        `${authBaseUrl}/api/auth/sign-in/social`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: url.origin,
          },
          body: JSON.stringify({ provider: "google", callbackURL }),
          redirect: "manual",
        },
      );
    } catch {
      return fail(503, {
        provider: "google" as const,
        error: "Could not reach auth service. Please try again.",
      });
    }

    // Better Auth responds with 302 → Google OAuth authorization URL.
    if (response.status === 301 || response.status === 302) {
      const location = response.headers.get("location");
      if (location) {
        // Forward oauth_state and any other cookies Better Auth set during setup.
        // Cloudflare Workers' Headers supports getAll() for set-cookie specifically.
        const cfHeaders = response.headers as unknown as {
          getAll?(name: string): string[];
        };
        const setCookies = cfHeaders.getAll?.("set-cookie") ?? [];
        for (const raw of setCookies) {
          const parsed = parseRawSetCookie(raw);
          if (parsed) {
            cookies.set(parsed.name, parsed.value, parsed.options);
          }
        }
        throw redirect(302, location);
      }
    }

    return fail(500, {
      provider: "google" as const,
      error: "Google sign-in failed to start. Please try again.",
    });
  },

  /**
   * Magic link — sends the sign-in email via Heartwood entirely server-side.
   *
   * Returns { emailSent, email } on success so the UI can show the confirmation.
   * Returns fail() with provider + error on failure so the form can display it.
   */
  email: async ({ request, platform, url }) => {
    const formData = await request.formData();
    const email = formData.get("email")?.toString().trim() ?? "";
    const redirectTo = validateRedirectUrl(
      formData.get("redirect")?.toString(),
    );

    if (!email) {
      return fail(400, {
        provider: "email" as const,
        error: "Email address is required.",
        email,
      });
    }

    if (!platform?.env?.AUTH) {
      return fail(503, {
        provider: "email" as const,
        error: "Auth service unavailable. Please try again shortly.",
        email,
      });
    }

    const callbackURL = `/callback?redirect=${encodeURIComponent(redirectTo)}`;
    const authBaseUrl = platform.env.GROVEAUTH_URL ?? DEFAULT_AUTH_URL;

    let response: Response;
    try {
      response = await platform.env.AUTH.fetch(
        `${authBaseUrl}/api/auth/sign-in/magic-link`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: url.origin,
          },
          body: JSON.stringify({ email, callbackURL }),
        },
      );
    } catch {
      return fail(503, {
        provider: "email" as const,
        error: "Could not reach auth service. Please try again.",
        email,
      });
    }

    if (!response.ok) {
      let message = "Failed to send magic link. Please try again.";
      try {
        const body = (await response.json()) as { message?: string };
        if (body.message) message = body.message;
      } catch {
        // Use default message if response isn't JSON
      }
      const status =
        response.status >= 400 && response.status < 600 ? response.status : 500;
      return fail(status, {
        provider: "email" as const,
        error: message,
        email,
      });
    }

    return { emailSent: true as const, email };
  },
};
