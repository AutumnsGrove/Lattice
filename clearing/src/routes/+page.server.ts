/**
 * Status Page - Server-side data loading
 *
 * Loads all status data from D1 database for the main status page.
 */
import type { PageServerLoad } from "./$types";
import { getStatusPageData } from "$lib/server/status";
import {
  getBackupStatus,
  getMockBackupStatus,
  type BackupStatus,
} from "$lib/server/backups";

export const load: PageServerLoad = async ({ platform }) => {
  // In development without D1, return mock data
  if (!platform?.env?.DB) {
    console.warn("[status] D1 database binding not available, using mock data");
    return {
      ...getMockData(),
      backupStatus: getMockBackupStatus(),
      isMockData: true,
    };
  }

  try {
    const data = await getStatusPageData(platform.env.DB);

    // Fetch backup status (separate try/catch so status page still works if backups fail)
    // Uses 6-hour cache to avoid D1 reads on every page load
    let backupStatus: BackupStatus;
    try {
      if (platform.env.BACKUPS_DB) {
        backupStatus = await getBackupStatus(
          platform.env.BACKUPS_DB,
          platform.caches,
        );
      } else {
        backupStatus = getMockBackupStatus();
      }
    } catch (backupError) {
      console.error("[status] Failed to load backup status:", backupError);
      backupStatus = getMockBackupStatus();
    }

    return { ...data, backupStatus, isMockData: false };
  } catch (error) {
    console.error(
      "[status] Failed to load status data, falling back to mock:",
      error,
    );
    // Return mock data on error
    return {
      ...getMockData(),
      backupStatus: getMockBackupStatus(),
      isMockData: true,
    };
  }
};

/**
 * Mock data for development/demo purposes
 */
function getMockData() {
  const now = new Date();

  // Create relative dates for demo incident (2 days ago)
  const incidentStart = new Date(now);
  incidentStart.setDate(incidentStart.getDate() - 2);
  incidentStart.setHours(10, 15, 0, 0);

  const incidentResolved = new Date(incidentStart);
  incidentResolved.setMinutes(incidentResolved.getMinutes() + 45);

  const updateIdentified = new Date(incidentStart);
  updateIdentified.setMinutes(updateIdentified.getMinutes() + 15);

  const updateMonitoring = new Date(incidentStart);
  updateMonitoring.setMinutes(updateMonitoring.getMinutes() + 30);

  // Generate 90 days of mock uptime data
  function generate90Days(
    componentId: string,
    componentName: string,
    issueChance: number = 0.02,
  ) {
    const days = [];
    const today = new Date();

    for (let i = 89; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      // Random chance of non-operational day
      const roll = Math.random();
      let status:
        | "operational"
        | "degraded"
        | "partial_outage"
        | "major_outage" = "operational";
      let incidentCount = 0;

      if (roll < issueChance) {
        status = "degraded";
        incidentCount = 1;
      } else if (roll < issueChance * 0.3) {
        status = "partial_outage";
        incidentCount = 1;
      }

      days.push({ date: dateStr, status, incidentCount });
    }

    const operationalDays = days.filter(
      (d) => d.status === "operational",
    ).length;
    const uptimePercentage = (operationalDays / days.length) * 100;

    return {
      componentId,
      componentName,
      days,
      uptimePercentage,
    };
  }

  return {
    status: "operational" as const,
    components: [
      {
        id: "comp_blog",
        name: "Blog Engine",
        slug: "blog-engine",
        description: "Core blogging functionality",
        display_order: 1,
        current_status: "operational" as const,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      },
      {
        id: "comp_cdn",
        name: "CDN",
        slug: "cdn",
        description: "Image and media delivery",
        display_order: 2,
        current_status: "operational" as const,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      },
      {
        id: "comp_auth",
        name: "Authentication",
        slug: "authentication",
        description: "Login and session management",
        display_order: 3,
        current_status: "operational" as const,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      },
      {
        id: "comp_meadow",
        name: "Meadow",
        slug: "meadow",
        description: "Community feed and social features",
        display_order: 4,
        current_status: "operational" as const,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      },
      {
        id: "comp_payments",
        name: "Payments",
        slug: "payments",
        description: "Subscription and billing",
        display_order: 5,
        current_status: "operational" as const,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      },
      {
        id: "comp_api",
        name: "API",
        slug: "api",
        description: "Backend API endpoints",
        display_order: 6,
        current_status: "operational" as const,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      },
    ],
    activeIncidents: [],
    recentIncidents: [
      {
        id: "inc_demo_1",
        title: "CDN Degraded Performance",
        slug: "cdn-degraded-performance-demo",
        status: "resolved" as const,
        impact: "minor" as const,
        type: "degraded" as const,
        started_at: incidentStart.toISOString(),
        resolved_at: incidentResolved.toISOString(),
        created_at: incidentStart.toISOString(),
        updated_at: incidentResolved.toISOString(),
        components: [
          {
            id: "comp_cdn",
            name: "CDN",
            slug: "cdn",
            description: "Image and media delivery",
            display_order: 2,
            current_status: "operational" as const,
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
          },
        ],
        updates: [
          {
            id: "upd_4",
            incident_id: "inc_demo_1",
            status: "resolved" as const,
            message:
              "The issue has been resolved. Image delivery is back to normal speeds.",
            created_at: incidentResolved.toISOString(),
          },
          {
            id: "upd_3",
            incident_id: "inc_demo_1",
            status: "monitoring" as const,
            message:
              "We've deployed a fix and are monitoring. Image loading times are improving.",
            created_at: updateMonitoring.toISOString(),
          },
          {
            id: "upd_2",
            incident_id: "inc_demo_1",
            status: "identified" as const,
            message:
              "Root cause identified: cache invalidation issue following deployment. Working on a fix.",
            created_at: updateIdentified.toISOString(),
          },
          {
            id: "upd_1",
            incident_id: "inc_demo_1",
            status: "investigating" as const,
            message: "We're investigating reports of slow image loading.",
            created_at: incidentStart.toISOString(),
          },
        ],
      },
    ],
    scheduledMaintenance: [],
    uptimeHistory: [
      generate90Days("comp_blog", "Blog Engine", 0.01),
      generate90Days("comp_cdn", "CDN", 0.03),
      generate90Days("comp_auth", "Authentication", 0.005),
      generate90Days("comp_meadow", "Meadow", 0.02),
      generate90Days("comp_payments", "Payments", 0.01),
      generate90Days("comp_api", "API", 0.015),
    ],
    updatedAt: now.toISOString(),
  };
}
