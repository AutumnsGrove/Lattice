/**
 * SvelteKit Type Augmentation — login.grove.place
 *
 * Platform.env has AUTH (Heartwood service binding) and GROVEAUTH_URL only.
 * No DB binding — this is an auth hub, not a data layer.
 * Session resolution happens in Heartwood; we only check cookie presence.
 */

/// <reference types="@sveltejs/kit" />
/// <reference types="@cloudflare/workers-types" />

declare global {
  namespace App {
    interface Error {
      message: string;
      code?: string;
    }

    interface Locals {
      user?: {
        id: string;
        email: string;
        name?: string;
      };
    }

    interface PageData {}

    interface Platform {
      env?: {
        /** GroveAuth Service Binding (Heartwood) */
        AUTH: Fetcher;
        /** GroveAuth API base URL */
        GROVEAUTH_URL: string;
      };
      context?: {
        waitUntil(promise: Promise<unknown>): void;
      };
    }
  }
}

export {};
