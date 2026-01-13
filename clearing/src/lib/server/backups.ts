/**
 * Backup Status Data Fetching
 *
 * Queries the grove-backups-db D1 database to retrieve backup statistics
 * for the Data Protection section of the status page.
 *
 * Caching: Results are cached for 6 hours since backups only run:
 * - Daily at 3 AM UTC (priority databases)
 * - Weekly on Sundays at 4 AM UTC (full backup)
 */

// Cache TTL: 6 hours (4 refreshes per day at roughly 6am/noon/6pm/midnight)
const CACHE_TTL_SECONDS = 6 * 60 * 60;
const CACHE_KEY = "https://status.grove.place/api/backup-status";

export interface BackupSummary {
  totalBackups: number;
  uniqueDays: number;
  totalBytes: number;
  lastBackup: string | null;
}

export interface DailyBackup {
  date: string;
  count: number;
  size: number;
  type: "daily" | "weekly";
}

export interface BackupReliability {
  score: number;
  perfectJobs: number;
  partialJobs: number;
  totalJobs: number;
}

export interface BackupStatus {
  summary: BackupSummary;
  dailyHistory: DailyBackup[];
  reliability: BackupReliability;
  isHealthy: boolean;
}

/**
 * Fetches backup status with caching (6-hour TTL)
 *
 * Uses Cloudflare Cache API to avoid hitting D1 on every page load.
 * Cache refreshes ~4 times per day, which is plenty for data that
 * only changes with daily/weekly backup runs.
 */
export async function getBackupStatus(
  db: D1Database,
  caches?: CacheStorage & { default: Cache },
): Promise<BackupStatus> {
  // Try to get from cache first
  if (caches?.default) {
    try {
      const cached = await caches.default.match(CACHE_KEY);
      if (cached) {
        const data = await cached.json();
        return data as BackupStatus;
      }
    } catch {
      // Cache miss or error, fetch fresh
    }
  }

  // Fetch fresh data from D1
  const freshData = await fetchBackupStatusFromDb(db);

  // Store in cache for next time (fire and forget)
  if (caches?.default) {
    const response = new Response(JSON.stringify(freshData), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}`,
      },
    });
    // Don't await - let it cache in background
    caches.default.put(CACHE_KEY, response).catch(() => {});
  }

  return freshData;
}

/**
 * Fetches backup status directly from the grove-backups-db database
 */
async function fetchBackupStatusFromDb(db: D1Database): Promise<BackupStatus> {
  // Get summary stats
  const summaryResult = await db
    .prepare(
      `
    SELECT
      COUNT(*) as total_backups,
      COUNT(DISTINCT backup_date) as unique_days,
      SUM(size_bytes) as total_bytes,
      MAX(backup_date) as last_backup
    FROM backup_inventory
    WHERE deleted_at IS NULL
  `,
    )
    .first<{
      total_backups: number;
      unique_days: number;
      total_bytes: number;
      last_backup: string | null;
    }>();

  // Get daily history (last 7 days)
  const dailyResult = await db
    .prepare(
      `
    SELECT
      backup_date,
      COUNT(*) as backup_count,
      SUM(size_bytes) as total_size
    FROM backup_inventory
    WHERE deleted_at IS NULL
    GROUP BY backup_date
    ORDER BY backup_date DESC
    LIMIT 7
  `,
    )
    .all<{
      backup_date: string;
      backup_count: number;
      total_size: number;
    }>();

  // Get job reliability (last 10 jobs)
  const jobsResult = await db
    .prepare(
      `
    SELECT
      status,
      successful_count,
      failed_count
    FROM backup_jobs
    ORDER BY started_at DESC
    LIMIT 10
  `,
    )
    .all<{
      status: string;
      successful_count: number;
      failed_count: number;
    }>();

  // Calculate reliability score
  const jobs = jobsResult.results || [];
  const perfectJobs = jobs.filter(
    (j) => j.status === "completed" && j.failed_count === 0,
  ).length;
  const partialJobs = jobs.filter(
    (j) => j.status === "completed" && j.failed_count > 0,
  ).length;
  const score = jobs.length > 0 ? (perfectJobs / jobs.length) * 100 : 0;

  // Map daily history with type detection (weekly = 10+ databases)
  const dailyHistory: DailyBackup[] = (dailyResult.results || []).map((d) => ({
    date: d.backup_date,
    count: d.backup_count,
    size: d.total_size,
    type: d.backup_count >= 10 ? "weekly" : "daily",
  }));

  // Check health: has backup in last 2 days
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const isHealthy = dailyHistory.some(
    (d) => d.date === today || d.date === yesterday,
  );

  return {
    summary: {
      totalBackups: summaryResult?.total_backups || 0,
      uniqueDays: summaryResult?.unique_days || 0,
      totalBytes: summaryResult?.total_bytes || 0,
      lastBackup: summaryResult?.last_backup || null,
    },
    dailyHistory,
    reliability: {
      score,
      perfectJobs,
      partialJobs,
      totalJobs: jobs.length,
    },
    isHealthy,
  };
}

/**
 * Returns mock data for development when BACKUPS_DB is not available
 */
export function getMockBackupStatus(): BackupStatus {
  const today = new Date();
  const dailyHistory: DailyBackup[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const isSunday = date.getDay() === 0;

    dailyHistory.push({
      date: dateStr,
      count: isSunday ? 12 : 2,
      size: isSunday ? 1200000 : 300000,
      type: isSunday ? "weekly" : "daily",
    });
  }

  return {
    summary: {
      totalBackups: 54,
      uniqueDays: 12,
      totalBytes: 5740000,
      lastBackup: today.toISOString().split("T")[0],
    },
    dailyHistory,
    reliability: {
      score: 90,
      perfectJobs: 9,
      partialJobs: 1,
      totalJobs: 10,
    },
    isHealthy: true,
  };
}
