import type { PageServerLoad } from "./$types";
import { getGreenhouseTenant } from "$lib/feature-flags";

// List of Wayfinder (platform owner) emails
// The Wayfinder has access to system health and other platform-wide features
const WAYFINDER_EMAILS = ["autumn@grove.place"];

function isWayfinder(email: string | undefined): boolean {
  if (!email) return false;
  return WAYFINDER_EMAILS.includes(email.toLowerCase());
}

export const load: PageServerLoad = async ({ locals, platform }) => {
  const env = platform?.env;

  // Check greenhouse status for this tenant
  let greenhouseStatus: {
    inGreenhouse: boolean;
    enrolledAt?: Date;
    notes?: string;
  } = { inGreenhouse: false };

  if (env?.DB && env?.CACHE_KV && locals.tenantId) {
    try {
      const tenant = await getGreenhouseTenant(locals.tenantId, {
        DB: env.DB,
        FLAGS_KV: env.CACHE_KV,
      });

      if (tenant && tenant.enabled) {
        greenhouseStatus = {
          inGreenhouse: true,
          enrolledAt: tenant.enrolledAt,
          notes: tenant.notes,
        };
      }
    } catch (error) {
      console.error("Failed to check greenhouse status:", error);
    }
  }

  return {
    isWayfinder: isWayfinder(locals.user?.email),
    greenhouseStatus,
  };
};
