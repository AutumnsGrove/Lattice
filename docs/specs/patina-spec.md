---
aliases: []
date created: Saturday, January 4th 2026
date modified: Saturday, January 4th 2026
tags:
  - backups
  - disaster-recovery
  - cloudflare-r2
type: tech-spec
---

# Patina — Automated Backups

```
                         .  ·  .  ·  .
                      ·   time passes   ·
                     ╭───────────────────╮
                    ╭┤  ┌─────────────┐  ├╮
                   ╭┤│  │  2026-01-05 │  │├╮
                   │││  │  ▓▓▓▓▓▓▓▓▓▓ │  │││
                   │││  │  ▒▒▒▒▒▒▒▒▒▒ │  │││
                   │││  │  ░░░░░░░░░░ │  │││
                   │││  │  ·········· │  │││
                   ╰┴┴──└─────────────┘──┴┴╯
                  ╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱
               ──────────────────────────────
              ~~~~~~~~ oxidation layer ~~~~~~~~
              Age as armor. Time as protection.
```

> *Age as armor. Time as protection.*

```
              Backup Retention Timeline

  TODAY                                              12 WEEKS AGO
    │                                                      │
    ▼                                                      ▼
   ┌─┬─┬─┬─┬─┬─┬─┐                                        ┌─┐
   │█│█│█│█│█│█│█│ ◀── Daily backups (7 days)             │░│
   └─┴─┴─┴─┴─┴─┴─┘                                        └─┘
   S M T W T F S
         │                                                 │
         └────────────┬────────────────────────────────────┘
                      │
                      ▼
   Week  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐     ┌───┐ ┌───┐
    #    │ 1 │ │ 2 │ │ 3 │ │ 4 │ │ 5 │ │ 6 │ ··· │11 │ │12 │
         └───┘ └───┘ └───┘ └───┘ └───┘ └───┘     └───┘ └───┘
           │     │     │     │     │     │         │     │
           ▼     ▼     ▼     ▼     ▼     ▼         ▼     ▼
         ┌───────────────────────────────────────────────────┐
         │              Weekly Archives (12 weeks)           │
         │  Each archive = compressed 7 daily backups        │
         │  Sundays: compress week → delete dailies          │
         └───────────────────────────────────────────────────┘

   ════════════════════════════════════════════════════════════

   Storage strategy:
   ┌────────────────┐     ┌────────────────┐     ┌────────────┐
   │  /daily/       │     │  /weekly/      │     │  Expired   │
   │  2026-01-05/   │ ──▶ │  2026-W01.tar  │ ──▶ │  (deleted) │
   │  *.sql         │     │  .gz           │     │            │
   └────────────────┘     └────────────────┘     └────────────┘
      7 days max           12 weeks max          auto-cleanup
```

Grove's automated backup system running nightly SQL dumps of all D1 databases to R2 cold storage. Weekly meta-backups compress daily layers, maintaining 12 weeks of history ready if you ever need to reach back in time.

**Public Name:** Patina
**Internal Name:** GrovePatina
**Domain:** `patina.grove.place`
**Repository:** [AutumnsGrove/Patina](https://github.com/AutumnsGrove/Patina)
**Last Updated:** December 2025

A patina forms on copper over time. Not decay, but protection. The oxidation becomes armor, beauty emerging from age. Patina is Grove's automated backup system, quietly preserving everything while you sleep.

Every night, Patina runs automated backups of all Grove D1 databases to R2 cold storage. Weekly archives compress the daily layers. Twelve weeks of history remain quietly preserved, ready if you ever need to reach back in time.

---

## Goals

1. **Automated nightly backups** of all 6 D1 databases
2. **Weekly meta-backups** — compress 7 daily backups into one archive
3. **SQL dump format** — portable, restorable, human-readable
4. **12-week retention** with automatic cleanup
5. **Manual trigger capability** for on-demand backups
6. **Status dashboard** to view backup history
7. **Restore documentation** for disaster recovery
8. **Alerting** on backup failures (integrate with GroveMonitor later)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             Patina System                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                    grove-patina (Worker)                         │
│                                                                  │
│  Cron Triggers:                                                  │
│    • Nightly @ 3:00 AM UTC — individual DB backups               │
│    • Weekly (Sunday) @ 4:00 AM UTC — compress to meta-backup     │
│  HTTP Endpoints: /status, /trigger, /download, /restore-guide    │
│                                                                  │
└──────────────────────────────┬───────────────────────────────────┘
                               │
           ┌───────────────────┼───────────────────┐
           │                   │                   │
           ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   D1 Databases  │  │  grove-patina   │  │  grove-patina   │
│   (6 total)     │  │     (R2)        │  │     -db (D1)    │
│                 │  │                 │  │                 │
│ • groveauth     │  │ Backup Storage  │  │ Backup metadata │
│ • scout-db      │  │                 │  │ Job history     │
│ • grove-engine  │  │ /daily/         │  │ Alert config    │
│ • autumnsgrove- │  │   YYYY-MM-DD/   │  │                 │
│     posts       │  │   db-name.sql   │  │                 │
│ • autumnsgrove- │  │                 │  │                 │
│     git-stats   │  │ /weekly/        │  │                 │
│ • grove-domain  │  │   YYYY-Www.tar  │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘

Backup Flow (Nightly):
1. Cron triggers at 3 AM UTC every night
2. Worker iterates through all 6 databases
3. For each DB: export schema + data to SQL
4. Upload to R2: /daily/YYYY-MM-DD/db-name.sql
5. Log results to grove-patina-db
6. Send alert if any failures (webhook)

Meta-Backup Flow (Weekly, Sunday):
1. Cron triggers at 4 AM UTC (after nightly backup completes)
2. Collect all 7 daily backups from the past week
3. Compress into single archive: /weekly/YYYY-Www.tar.gz
4. Delete daily backups older than 7 days
5. Delete weekly archives older than 12 weeks

Timing Dependencies:
• Nightly backup (3 AM): ~15-30 min for 6 DBs (concurrency=3, timeout=30s each)
• Meta-backup starts 1 hour later (4 AM) - sufficient buffer
• If nightly runs long, meta-backup checks for running jobs before starting:
  - Query backup_jobs for status='running' AND started_at > (now - 2 hours)
  - If found, skip meta-backup this week (alert via webhook)
  - Nightly will complete, and next week's meta-backup will include 14 days
```

---

## 📦 Project Structure

```
Patina/                          # Standalone repository
├── src/
│   ├── index.ts                 # Main worker entry
│   ├── scheduled.ts             # Nightly backup cron handler
│   ├── weekly.ts                # Weekly meta-backup cron handler
│   ├── routes/
│   │   ├── status.ts            # GET /status
│   │   ├── trigger.ts           # POST /trigger
│   │   ├── download.ts          # GET /download/:date/:db
│   │   ├── list.ts              # GET /list
│   │   └── restore-guide.ts     # GET /restore-guide/:db
│   ├── lib/
│   │   ├── exporter.ts          # D1 to SQL export logic
│   │   ├── compressor.ts        # Weekly archive compression
│   │   ├── cleanup.ts           # Old backup deletion
│   │   ├── databases.ts         # Database configuration
│   │   ├── alerting.ts          # Webhook notifications
│   │   └── utils.ts             # Helper functions
│   └── types.ts                 # TypeScript interfaces
├── migrations/
│   └── 001_backup_metadata.sql  # Metadata schema
├── wrangler.toml
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🗄️ Database Schema (grove-patina-db)

```sql
-- migrations/001_backup_metadata.sql

-- Backup job history
CREATE TABLE backup_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT UNIQUE NOT NULL,           -- UUID for the job
  started_at INTEGER NOT NULL,           -- Unix timestamp
  completed_at INTEGER,                  -- Unix timestamp
  status TEXT NOT NULL,                  -- 'running', 'completed', 'failed'
  trigger_type TEXT NOT NULL,            -- 'scheduled', 'manual'
  total_databases INTEGER NOT NULL,
  successful_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  total_size_bytes INTEGER DEFAULT 0,
  duration_ms INTEGER,
  error_message TEXT
);

CREATE INDEX idx_backup_jobs_started ON backup_jobs(started_at DESC);
CREATE INDEX idx_backup_jobs_status ON backup_jobs(status);

-- Individual database backup results
CREATE TABLE backup_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT NOT NULL,
  database_name TEXT NOT NULL,
  database_id TEXT NOT NULL,
  status TEXT NOT NULL,                  -- 'success', 'failed', 'skipped'
  r2_key TEXT,                           -- Path in R2
  size_bytes INTEGER,
  table_count INTEGER,
  row_count INTEGER,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  duration_ms INTEGER,
  error_message TEXT,
  FOREIGN KEY (job_id) REFERENCES backup_jobs(job_id)
);

CREATE INDEX idx_backup_results_job ON backup_results(job_id);
CREATE INDEX idx_backup_results_db ON backup_results(database_name, started_at DESC);

-- Backup inventory (what's in R2)
CREATE TABLE backup_inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  r2_key TEXT UNIQUE NOT NULL,           -- Full R2 path
  database_name TEXT NOT NULL,
  backup_date TEXT NOT NULL,             -- YYYY-MM-DD
  size_bytes INTEGER NOT NULL,
  table_count INTEGER,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,           -- When it will be cleaned up
  deleted_at INTEGER                     -- Null if still exists
);

CREATE INDEX idx_inventory_date ON backup_inventory(backup_date DESC);
CREATE INDEX idx_inventory_db ON backup_inventory(database_name);
CREATE INDEX idx_inventory_expires ON backup_inventory(expires_at) WHERE deleted_at IS NULL;

-- Alert configuration
CREATE TABLE alert_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  webhook_url TEXT,
  enabled INTEGER DEFAULT 1,
  notify_on_success INTEGER DEFAULT 0,   -- Send alert even on success
  notify_on_failure INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

---

## ⚙️ Configuration

### Database Registry

```typescript
// src/lib/databases.ts

export interface DatabaseConfig {
  name: string;
  id: string;
  binding: string;
  description: string;
  priority: 'critical' | 'high' | 'normal';
  estimatedSize: string;
}

export const DATABASES: DatabaseConfig[] = [
  {
    name: 'groveauth',
    id: '45eae4c7-8ae7-4078-9218-8e1677a4360f',
    binding: 'GROVEAUTH_DB',
    description: 'Authentication, users, sessions, OAuth (Heartwood)',
    priority: 'critical',
    estimatedSize: '212 KB',
  },
  {
    name: 'scout-db',
    id: '6a289378-c662-4c6a-9f1b-fa5296e03fa2',
    binding: 'SCOUT_DB',
    description: 'GroveScout searches, credits, referrals',
    priority: 'critical',
    estimatedSize: '364 KB',
  },
  {
    name: 'grove-engine-db',
    id: 'a6394da2-b7a6-48ce-b7fe-b1eb3e730e68',
    binding: 'GROVE_ENGINE_DB',
    description: 'Core platform: tenants, content, multi-tenant data (Lattice)',
    priority: 'critical',
    estimatedSize: '180 KB',
  },
  {
    name: 'autumnsgrove-posts',
    id: '510badf3-457a-4892-bf2a-45d4bfd7a7bb',
    binding: 'AUTUMNSGROVE_POSTS_DB',
    description: 'AutumnsGrove blog posts',
    priority: 'high',
    estimatedSize: '118 KB',
  },
  {
    name: 'autumnsgrove-git-stats',
    id: '0ca4036f-93f7-4c8a-98a5-5353263acd44',
    binding: 'AUTUMNSGROVE_GIT_STATS_DB',
    description: 'Git statistics for AutumnsGrove',
    priority: 'normal',
    estimatedSize: '335 KB',
  },
  {
    name: 'grove-domain-jobs',
    id: 'cd493112-a901-4f6d-aadf-a5ca78929557',
    binding: 'GROVE_DOMAIN_JOBS_DB',
    description: 'Domain search jobs (Forage/Acorn)',
    priority: 'normal',
    estimatedSize: '45 KB',
  },
];

// NOTE: This list will grow as Grove expands. The backup system supports
// dynamic database registration via the DATABASES array above. When adding
// new D1 databases to Grove:
// 1. Add entry to this array with appropriate priority
// 2. Add D1 binding to wrangler.toml
// 3. Run a manual backup to verify export works
// 4. Update backup count references in documentation

// Backup schedule and retention
export const BACKUP_CONFIG = {
  // Cron: Every day at 3:00 AM UTC (nightly backups)
  nightlyCron: '0 3 * * *',

  // Cron: Every Sunday at 4:00 AM UTC (weekly meta-backup)
  weeklyCron: '0 4 * * 0',

  // Keep 7 days of daily backups (before compression)
  dailyRetentionDays: 7,

  // Keep 12 weeks of weekly archives
  weeklyRetentionWeeks: 12,

  // R2 bucket name
  bucketName: 'grove-patina',

  // Max concurrent database exports
  concurrency: 3,

  // Timeout per database export (ms)
  exportTimeout: 30000,
};
```

---

## 📤 SQL Export Format

### Export Structure

```sql
-- ================================================
-- Grove Backup: groveauth
-- Generated: 2024-12-09T03:00:00.000Z
-- Job ID: 550e8400-e29b-41d4-a716-446655440000
-- Tables: 15
-- Total Rows: 1,234
-- ================================================

PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;

-- Table: users
-- Rows: 150
DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER
);

INSERT INTO "users" ("id", "email", "name", "created_at", "updated_at") VALUES ('usr_123', 'user@example.com', 'Example User', 1702100000, 1702100000);
INSERT INTO "users" ("id", "email", "name", "created_at", "updated_at") VALUES ('usr_456', 'another@example.com', 'Another User', 1702200000, NULL);
-- ... more rows

-- Table: sessions
-- Rows: 500
DROP TABLE IF EXISTS sessions;
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ... more tables

COMMIT;
PRAGMA foreign_keys=ON;

-- ================================================
-- Backup Complete
-- Duration: 1.234s
-- Size: 212,992 bytes
-- ================================================
```

### Exporter Implementation

```typescript
// src/lib/exporter.ts

export interface ExportResult {
  sql: string;
  tableCount: number;
  rowCount: number;
  sizeBytes: number;
  durationMs: number;
}

export async function exportDatabase(
  db: D1Database,
  dbName: string,
  jobId: string
): Promise<ExportResult> {
  const startTime = Date.now();
  let totalRows = 0;
  
  // Get all user tables (exclude CF internal and SQLite tables)
  const tablesResult = await db.prepare(`
    SELECT name, sql FROM sqlite_master 
    WHERE type='table' 
    AND name NOT LIKE '_cf%' 
    AND name NOT LIKE 'sqlite%'
    ORDER BY name
  `).all();

  const tables = tablesResult.results as { name: string; sql: string }[];
  
  // Build header
  let sqlDump = `-- ================================================\n`;
  sqlDump += `-- Grove Backup: ${dbName}\n`;
  sqlDump += `-- Generated: ${new Date().toISOString()}\n`;
  sqlDump += `-- Job ID: ${jobId}\n`;
  sqlDump += `-- Tables: ${tables.length}\n`;
  sqlDump += `-- ================================================\n\n`;

  sqlDump += `PRAGMA foreign_keys=OFF;\n`;
  sqlDump += `BEGIN TRANSACTION;\n\n`;

  // Export each table
  for (const table of tables) {
    const tableName = table.name;
    
    // Get row count
    const countResult = await db.prepare(
      `SELECT COUNT(*) as count FROM "${tableName}"`
    ).first<{ count: number }>();
    const rowCount = countResult?.count || 0;
    totalRows += rowCount;
    
    sqlDump += `-- Table: ${tableName}\n`;
    sqlDump += `-- Rows: ${rowCount}\n`;
    sqlDump += `DROP TABLE IF EXISTS "${tableName}";\n`;
    sqlDump += `${table.sql};\n\n`;

    // Export rows in batches to avoid memory issues
    // NOTE: Fixed batch size works for most Grove tables (small rows).
    // For tables with large JSON/blob columns, consider adaptive sizing:
    //   - Estimate avg row size from first 100 rows
    //   - Target ~1MB per batch (adjust BATCH_SIZE = 1MB / avgRowSize)
    //   - Worker memory limit: 128MB, keep total buffer under 64MB
    const BATCH_SIZE = 1000;
    let offset = 0;
    
    while (offset < rowCount) {
      const rowsResult = await db.prepare(
        `SELECT * FROM "${tableName}" LIMIT ${BATCH_SIZE} OFFSET ${offset}`
      ).all();
      
      for (const row of rowsResult.results) {
        const columns = Object.keys(row);
        const values = Object.values(row).map(formatSqlValue);
        
        sqlDump += `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${values.join(', ')});\n`;
      }
      
      offset += BATCH_SIZE;
    }
    
    sqlDump += '\n';
  }

  sqlDump += `COMMIT;\n`;
  sqlDump += `PRAGMA foreign_keys=ON;\n\n`;

  const durationMs = Date.now() - startTime;
  
  // Add footer
  sqlDump += `-- ================================================\n`;
  sqlDump += `-- Backup Complete\n`;
  sqlDump += `-- Duration: ${(durationMs / 1000).toFixed(3)}s\n`;
  sqlDump += `-- Total Rows: ${totalRows}\n`;
  sqlDump += `-- Size: ${sqlDump.length.toLocaleString()} bytes\n`;
  sqlDump += `-- ================================================\n`;

  return {
    sql: sqlDump,
    tableCount: tables.length,
    rowCount: totalRows,
    sizeBytes: sqlDump.length,
    durationMs,
  };
}

function formatSqlValue(value: unknown): string {
  if (value === null) return 'NULL';
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (value instanceof Uint8Array) {
    return `X'${Buffer.from(value).toString('hex')}'`;
  }
  // Escape single quotes for strings
  return `'${String(value).replace(/'/g, "''")}'`;
}
```

### Error Handling Strategy

| Error Type | Behavior | Recovery |
|------------|----------|----------|
| **Connection failure** | Retry 3x with exponential backoff | Mark DB as failed, continue others |
| **Export timeout** (30s) | Abort export for that DB | Log partial progress, don't save to R2 |
| **Partial batch failure** | Abort entire DB export | Don't save incomplete dumps |
| **Schema extraction error** | Skip table, log warning | Continue with remaining tables |
| **R2 upload failure** | Retry 2x | Mark job failed if persists |

```typescript
// Error handling wrapper for exports
async function safeExportDatabase(
  db: D1Database,
  dbName: string,
  jobId: string,
  timeoutMs: number
): Promise<ExportResult | ExportError> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await exportDatabase(db, dbName, jobId);
    clearTimeout(timeout);
    return result;
  } catch (error) {
    clearTimeout(timeout);

    // Determine error type for appropriate handling
    if (error.name === 'AbortError') {
      return { error: 'timeout', dbName, message: `Export exceeded ${timeoutMs}ms` };
    }
    if (error.message?.includes('no such table')) {
      return { error: 'schema', dbName, message: error.message };
    }
    return { error: 'connection', dbName, message: error.message };
  }
}

// Partial exports are NEVER saved - all or nothing per database
// Failed DBs don't block successful ones in the same job
```

---

## 🌐 API Endpoints

### GET /

Worker info and documentation.

```typescript
// Response
{
  "name": "Patina",
  "version": "1.0.0",
  "description": "Automated D1 database backup system for Grove",
  "schedule": "Every Sunday at 3:00 AM UTC",
  "retention": "12 weeks",
  "databases": 6,
  "endpoints": {
    "GET /": "This documentation",
    "GET /status": "Current backup status and recent history",
    "GET /list": "List all available backups",
    "POST /trigger": "Manually trigger a backup",
    "GET /download/:date/:db": "Download a specific backup",
    "GET /restore-guide/:db": "Get restore instructions for a database"
  }
}
```

### GET /status

Current status and recent backup history.

```typescript
// Response
{
  "currentStatus": "idle", // or "running"
  "lastBackup": {
    "jobId": "550e8400-e29b-41d4-a716-446655440000",
    "date": "2024-12-08",
    "status": "completed",
    "successful": 6,
    "failed": 0,
    "totalSize": "2.1 MB",
    "duration": "45s"
  },
  "nextScheduled": "2024-12-15T03:00:00Z",
  "recentJobs": [
    {
      "jobId": "...",
      "date": "2024-12-08",
      "status": "completed",
      "databases": { "successful": 9, "failed": 0 }
    },
    // ... last 10 jobs
  ],
  "storage": {
    "totalBackups": 72, // 6 DBs × 12 weeks
    "totalSize": "25.2 MB",
    "oldestBackup": "2024-09-15",
    "newestBackup": "2024-12-08"
  }
}
```

### GET /list

List all available backups with filtering.

```typescript
// Query params:
// ?database=groveauth - Filter by database
// ?date=2024-12-08 - Filter by date
// ?limit=20 - Limit results

// Response
{
  "backups": [
    {
      "database": "groveauth",
      "date": "2024-12-08",
      "r2Key": "2024-12-08/groveauth.sql",
      "size": "212 KB",
      "tables": 15,
      "rows": 1234,
      "createdAt": "2024-12-08T03:00:45Z",
      "expiresAt": "2024-03-02T03:00:45Z"
    },
    // ...
  ],
  "total": 108,
  "filtered": 12
}
```

### POST /trigger

Manually trigger a backup.

```typescript
// Request body (optional)
{
  "databases": ["groveauth", "scout-db"], // Specific DBs, or omit for all
  "reason": "Pre-deployment backup"       // Optional note
}

// Response
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "started",
  "databases": 6,
  "message": "Backup job started. Check /status for progress."
}
```

### GET /download/:date/:db

Download a specific backup file.

**⚠️ Authentication Required**

This endpoint contains sensitive data (user emails, sessions, OAuth tokens) and MUST be protected. Implement one of these authentication methods:

| Method | Description | Use Case |
|--------|-------------|----------|
| **Cloudflare Access** (Recommended) | Zero Trust access policy | Dashboard/browser access |
| **API Key Header** | `X-Patina-Key` header | Automated scripts |
| **IP Allowlist** | Restrict to known IPs | CI/CD pipelines |

```typescript
// Authentication implementation
async function authenticateDownload(request: Request, env: Env): Promise<boolean> {
  // Method 1: Cloudflare Access JWT (if behind Access)
  const cfAccessJwt = request.headers.get('Cf-Access-Jwt-Assertion');
  if (cfAccessJwt) {
    return await verifyAccessJwt(cfAccessJwt, env.CF_ACCESS_AUD);
  }

  // Method 2: API Key
  const apiKey = request.headers.get('X-Patina-Key');
  if (apiKey && apiKey === env.PATINA_API_KEY) {
    return true;
  }

  // Method 3: IP Allowlist (for known infrastructure)
  const clientIp = request.headers.get('CF-Connecting-IP');
  if (env.ALLOWED_IPS?.includes(clientIp)) {
    return true;
  }

  return false;
}
```

**Rate Limiting**

To prevent abuse if API keys are compromised, implement rate limiting:

| Limit | Value | Rationale |
|-------|-------|-----------|
| Per-client downloads | 10/hour | Normal restore needs 6 DBs max |
| Per-IP requests | 30/hour | Allow multiple clients behind NAT |
| Concurrent downloads | 2 | Prevent bandwidth exhaustion |

```typescript
// Rate limiting with Cloudflare KV
const RATE_LIMIT = { maxRequests: 10, windowSeconds: 3600 };

async function checkRateLimit(clientId: string, kv: KVNamespace): Promise<boolean> {
  const key = `ratelimit:download:${clientId}`;
  const current = parseInt(await kv.get(key) || '0');
  if (current >= RATE_LIMIT.maxRequests) return false;
  await kv.put(key, String(current + 1), { expirationTtl: RATE_LIMIT.windowSeconds });
  return true;
}
```

```typescript
// Example: GET /download/2024-12-08/groveauth
// Headers: X-Patina-Key: <secret-key>
// -or- behind Cloudflare Access

// Response: SQL file download
// Content-Type: application/sql
// Content-Disposition: attachment; filename="groveauth-2024-12-08.sql"

// Error Response (401 Unauthorized)
{
  "error": "unauthorized",
  "message": "Valid authentication required to download backups"
}
```

### GET /restore-guide/:db

Get restore instructions for a specific database.

```typescript
// Example: GET /restore-guide/groveauth

// Response
{
  "database": "groveauth",
  "databaseId": "45eae4c7-8ae7-4078-9218-8e1677a4360f",
  "description": "Authentication, users, sessions, OAuth",
  "priority": "critical",
  "availableBackups": [
    { "date": "2024-12-08", "size": "212 KB" },
    { "date": "2024-12-01", "size": "210 KB" },
    // ...
  ],
  "restoreInstructions": {
    "method1_wrangler": {
      "name": "Wrangler CLI (Recommended)",
      "steps": [
        "1. Download backup: curl -o groveauth-2024-12-08.sql https://backups.grove.place/download/2024-12-08/groveauth",
        "2. Review the SQL file to ensure it's correct",
        "3. Execute: wrangler d1 execute groveauth --file=groveauth-2024-12-08.sql",
        "4. Verify: wrangler d1 execute groveauth --command=\"SELECT COUNT(*) FROM users\""
      ],
      "warning": "This will DROP and recreate tables. All existing data will be replaced."
    },
    "method2_timetravel": {
      "name": "D1 Time Travel (Last 30 days)",
      "steps": [
        "1. Get available restore points: wrangler d1 time-travel info groveauth",
        "2. Restore to timestamp: wrangler d1 time-travel restore groveauth --timestamp=\"2024-12-08T03:00:00Z\"",
        "3. Verify restoration"
      ],
      "note": "Time Travel is faster and doesn't require downloading files."
    }
  }
}
```

---

## 🔔 Alerting

### Webhook Payloads

```typescript
// Success notification (if enabled)
{
  "type": "backup_completed",
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "success",
  "timestamp": "2024-12-08T03:01:30Z",
  "summary": {
    "successful": 6,
    "failed": 0,
    "totalSize": "2.1 MB",
    "duration": "45s"
  },
  "details": [
    { "database": "groveauth", "status": "success", "size": "212 KB" },
    // ...
  ]
}

// Failure notification
{
  "type": "backup_failed",
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "partial_failure",
  "timestamp": "2024-12-08T03:01:30Z",
  "summary": {
    "successful": 7,
    "failed": 2,
    "totalSize": "1.8 MB",
    "duration": "52s"
  },
  "failures": [
    { "database": "scout-db", "error": "Timeout after 30s" },
    { "database": "grovemusic-db", "error": "Connection refused" }
  ]
}
```

### Discord Format

```typescript
// src/lib/alerting.ts

export function formatDiscordMessage(result: BackupJobResult): object {
  const isSuccess = result.failedCount === 0;
  
  return {
    embeds: [{
      title: isSuccess
        ? '✅ Patina Backup Completed'
        : '⚠️ Patina Backup Partially Failed',
      color: isSuccess ? 0x22c55e : 0xef4444,
      fields: [
        { 
          name: 'Databases', 
          value: `${result.successfulCount}/${result.totalDatabases} successful`,
          inline: true 
        },
        { 
          name: 'Total Size', 
          value: formatBytes(result.totalSizeBytes),
          inline: true 
        },
        { 
          name: 'Duration', 
          value: `${(result.durationMs / 1000).toFixed(1)}s`,
          inline: true 
        },
      ],
      footer: {
        text: `Job ID: ${result.jobId}`
      },
      timestamp: new Date().toISOString(),
    }],
  };
}
```

---

## 🧹 Cleanup Logic

```typescript
// src/lib/cleanup.ts

export async function cleanupOldBackups(
  bucket: R2Bucket,
  metadataDb: D1Database,
  retentionWeeks: number
): Promise<CleanupResult> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - (retentionWeeks * 7));
  const cutoffTimestamp = Math.floor(cutoffDate.getTime() / 1000);
  
  // Get expired backups from inventory
  const expiredBackups = await metadataDb.prepare(`
    SELECT id, r2_key, database_name, backup_date, size_bytes
    FROM backup_inventory
    WHERE expires_at < ?
    AND deleted_at IS NULL
  `).bind(cutoffTimestamp).all();
  
  const results: { key: string; success: boolean; error?: string }[] = [];
  
  for (const backup of expiredBackups.results) {
    try {
      // IMPORTANT: Mark as deleted in D1 FIRST, then delete from R2
      // This prevents orphaned records if R2 deletion succeeds but D1 fails
      // (Better to have a "deleted" record pointing to existing file than
      // an "active" record pointing to deleted file)

      // Step 1: Mark as deleted in inventory
      await metadataDb.prepare(`
        UPDATE backup_inventory
        SET deleted_at = ?
        WHERE id = ?
      `).bind(Math.floor(Date.now() / 1000), backup.id).run();

      // Step 2: Delete from R2
      await bucket.delete(backup.r2_key);

      results.push({ key: backup.r2_key, success: true });

    } catch (error) {
      // If D1 update succeeded but R2 delete failed, we have a soft-deleted
      // record pointing to an existing file - this is acceptable and can be
      // cleaned up in a subsequent run
      results.push({
        key: backup.r2_key,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  return {
    totalExpired: expiredBackups.results.length,
    deleted: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    freedBytes: expiredBackups.results
      .filter((_, i) => results[i].success)
      .reduce((sum, b) => sum + (b.size_bytes || 0), 0),
    results,
  };
}
```

### Metadata Reconciliation

The `backup_inventory` table tracks R2 contents separately. To handle drift from partial operations or failures, run weekly reconciliation:

```typescript
// src/lib/reconcile.ts - Run weekly after meta-backup (Sunday 5 AM UTC)

export async function reconcileInventory(
  bucket: R2Bucket,
  metadataDb: D1Database
): Promise<ReconcileResult> {
  // 1. List actual R2 contents
  const r2Objects = await bucket.list({ prefix: 'daily/' });
  const r2Keys = new Set(r2Objects.objects.map(o => o.key));

  // 2. Get inventory records (not marked deleted)
  const inventoryResult = await metadataDb.prepare(`
    SELECT id, r2_key FROM backup_inventory WHERE deleted_at IS NULL
  `).all();

  const orphanedRecords: string[] = [];  // In DB but not in R2
  const untracked: string[] = [];         // In R2 but not in DB

  // 3. Find orphaned records (DB says exists, R2 says no)
  for (const record of inventoryResult.results) {
    if (!r2Keys.has(record.r2_key)) {
      orphanedRecords.push(record.r2_key);
      // Mark as deleted since file doesn't exist
      await metadataDb.prepare(`
        UPDATE backup_inventory SET deleted_at = ? WHERE id = ?
      `).bind(Date.now() / 1000, record.id).run();
    }
  }

  // 4. Find untracked files (R2 has file, DB doesn't know)
  const trackedKeys = new Set(inventoryResult.results.map(r => r.r2_key));
  for (const key of r2Keys) {
    if (!trackedKeys.has(key)) {
      untracked.push(key);
      // Optionally: add to inventory or flag for review
    }
  }

  return { orphanedRecords, untracked, reconciled: true };
}
```

Add to cron schedule:
```toml
crons = [
  "0 3 * * *",   # Nightly backup
  "0 4 * * 0",   # Weekly meta-backup (Sunday)
  "0 5 * * 0"    # Weekly reconciliation (Sunday, after meta-backup)
]
```

---

## 📝 wrangler.toml

```toml
name = "grove-patina"
main = "src/index.ts"
compatibility_date = "2024-12-01"
compatibility_flags = ["nodejs_compat"]

# Cron triggers
[triggers]
crons = [
  "0 3 * * *",   # Nightly backup at 3:00 AM UTC
  "0 4 * * 0"    # Weekly meta-backup at 4:00 AM UTC (Sunday)
]

# ============================================
# Source D1 Databases (6 Grove databases)
# ============================================

[[d1_databases]]
binding = "GROVEAUTH_DB"
database_name = "groveauth"
database_id = "45eae4c7-8ae7-4078-9218-8e1677a4360f"

[[d1_databases]]
binding = "SCOUT_DB"
database_name = "scout-db"
database_id = "6a289378-c662-4c6a-9f1b-fa5296e03fa2"

[[d1_databases]]
binding = "GROVE_ENGINE_DB"
database_name = "grove-engine-db"
database_id = "a6394da2-b7a6-48ce-b7fe-b1eb3e730e68"

[[d1_databases]]
binding = "AUTUMNSGROVE_POSTS_DB"
database_name = "autumnsgrove-posts"
database_id = "510badf3-457a-4892-bf2a-45d4bfd7a7bb"

[[d1_databases]]
binding = "AUTUMNSGROVE_GIT_STATS_DB"
database_name = "autumnsgrove-git-stats"
database_id = "0ca4036f-93f7-4c8a-98a5-5353263acd44"

[[d1_databases]]
binding = "GROVE_DOMAIN_JOBS_DB"
database_name = "grove-domain-jobs"
database_id = "cd493112-a901-4f6d-aadf-a5ca78929557"

# ============================================
# Metadata Database (for backup tracking)
# ============================================

[[d1_databases]]
binding = "METADATA_DB"
database_name = "grove-patina-db"
database_id = "TODO_CREATE_THIS"

# ============================================
# R2 Backup Storage
# ============================================

[[r2_buckets]]
binding = "BACKUPS"
bucket_name = "grove-patina"

# ============================================
# Environment Variables
# ============================================

[vars]
RETENTION_WEEKS = "12"
DISCORD_WEBHOOK_URL = ""  # Set via wrangler secret
ALERT_ON_SUCCESS = "false"
ALERT_ON_FAILURE = "true"
```

---

## 🚀 Deployment

### Prerequisites

```bash
# 1. Create the backup R2 bucket
wrangler r2 bucket create grove-patina

# 2. Create the metadata D1 database
wrangler d1 create grove-patina-db
# Note the database_id and update wrangler.toml

# 3. Run migrations
wrangler d1 execute grove-patina-db --file=migrations/001_backup_metadata.sql

# 4. Set Discord webhook (optional)
wrangler secret put DISCORD_WEBHOOK_URL
```

### Deploy

```bash
cd packages/backups
pnpm install
pnpm deploy
```

### Test

```bash
# Check status
curl https://grove-patina.YOUR_SUBDOMAIN.workers.dev/status

# Trigger manual backup
curl -X POST https://grove-patina.YOUR_SUBDOMAIN.workers.dev/trigger

# Tail logs
wrangler tail grove-patina
```

---

## 📋 Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] Create R2 bucket `grove-patina`
- [ ] Create D1 database `grove-patina-db`
- [ ] Run migrations
- [ ] Set up project structure in `packages/backups/`

### Phase 2: Export Logic
- [ ] Implement `exporter.ts` with SQL dump logic
- [ ] Handle all data types correctly
- [ ] Add batch processing for large tables
- [ ] Include header/footer metadata in dumps

### Phase 3: Scheduled Handler
- [ ] Implement `scheduled.ts`
- [ ] Iterate through all databases
- [ ] Upload to R2 with date prefix
- [ ] Log results to metadata DB
- [ ] Handle errors gracefully

### Phase 4: API Endpoints
- [ ] GET / (documentation)
- [ ] GET /status
- [ ] GET /list
- [ ] POST /trigger
- [ ] GET /download/:date/:db
- [ ] GET /restore-guide/:db

### Phase 5: Cleanup & Alerting
- [ ] Implement cleanup logic
- [ ] Add Discord webhook support
- [ ] Configure alert thresholds

### Phase 6: Testing & Docs
- [ ] Test full backup cycle
- [ ] Test restore process
- [ ] Write README
- [ ] Add to GroveEngine docs

---

## 📚 Recovery Procedures

### Full Database Restore

```bash
# 1. Download the backup
curl -o restore.sql https://backups.grove.place/download/2024-12-08/groveauth

# 2. Review the file (important!)
head -100 restore.sql
tail -20 restore.sql

# 3. Execute against D1
wrangler d1 execute groveauth --file=restore.sql

# 4. Verify
wrangler d1 execute groveauth --command="SELECT COUNT(*) FROM users"
```

### Partial Restore (Single Table)

```bash
# 1. Download and extract specific table
curl https://backups.grove.place/download/2024-12-08/groveauth > full-backup.sql

# 2. Extract table (manual or with script)
grep -A 1000 "-- Table: users" full-backup.sql | grep -B 1000 "-- Table:" > users-only.sql

# 3. Execute
wrangler d1 execute groveauth --file=users-only.sql
```

### Using D1 Time Travel (Preferred for Recent Data)

```bash
# Check available restore points
wrangler d1 time-travel info groveauth

# Restore to specific timestamp
wrangler d1 time-travel restore groveauth --timestamp="2024-12-08T10:00:00Z"

# Or restore to bookmark
wrangler d1 time-travel restore groveauth --bookmark="<bookmark-id>"
```

---

## 🚨 Disaster Recovery Runbook (DEFCON 1)

**Scenario: Multiple or ALL databases corrupted/compromised**

### Severity Assessment

| Level | Condition | Response Time |
|-------|-----------|---------------|
| **DEFCON 1** | All databases corrupted | Immediate (< 1 hour) |
| **DEFCON 2** | Critical DBs affected (groveauth, grove-engine) | < 2 hours |
| **DEFCON 3** | Non-critical DBs affected | < 24 hours |

### Required Access

Before beginning recovery, ensure you have:
- [ ] Cloudflare dashboard access (owner/admin)
- [ ] Wrangler CLI authenticated (`wrangler whoami`)
- [ ] Access to Patina download endpoint (API key or CF Access)
- [ ] Discord/communication channel for status updates

### Full System Recovery Procedure

**Step 1: Assess the damage (5 minutes)**
```bash
# Check which databases are affected
for db in groveauth scout-db grove-engine-db autumnsgrove-posts autumnsgrove-git-stats grove-domain-jobs; do
  echo "Checking $db..."
  wrangler d1 execute $db --command="SELECT COUNT(*) FROM sqlite_master" 2>&1
done
```

**Step 2: Identify latest good backups (5 minutes)**
```bash
# List available backups
curl -H "X-Patina-Key: $PATINA_KEY" https://patina.grove.place/list

# Or check R2 directly
wrangler r2 object list grove-patina --prefix="daily/"
```

**Step 3: Restore in priority order**

⚠️ **CRITICAL: Restore databases in this exact order** (dependencies matter):

| Order | Database | Priority | Reason |
|-------|----------|----------|--------|
| 1 | `groveauth` | Critical | All auth depends on this |
| 2 | `grove-engine-db` | Critical | Core platform, references auth |
| 3 | `scout-db` | Critical | References users from groveauth |
| 4 | `autumnsgrove-posts` | High | Blog content |
| 5 | `autumnsgrove-git-stats` | Normal | Can be regenerated |
| 6 | `grove-domain-jobs` | Normal | Transient job data |

```bash
# Restore groveauth FIRST
curl -H "X-Patina-Key: $PATINA_KEY" \
  -o groveauth-restore.sql \
  https://patina.grove.place/download/YYYY-MM-DD/groveauth

# Review before executing!
head -50 groveauth-restore.sql
wrangler d1 execute groveauth --file=groveauth-restore.sql

# Verify restoration
wrangler d1 execute groveauth --command="SELECT COUNT(*) FROM users"

# Continue with grove-engine-db, then scout-db, etc.
```

**Step 4: Verify system functionality**
```bash
# Test auth endpoints
curl https://auth.grove.place/health

# Test main application
curl https://grove.place/api/health

# Check for foreign key violations
wrangler d1 execute grove-engine-db --command="PRAGMA foreign_key_check"
```

**Step 5: Post-recovery actions**
- [ ] Trigger fresh backup of all databases
- [ ] Review logs for root cause
- [ ] Post incident report to team
- [ ] Update runbook if needed

### Expected Recovery Times

| Scenario | Time Estimate | Notes |
|----------|---------------|-------|
| Single DB restore | 5-10 minutes | Download + execute |
| All 6 DBs (sequential) | 30-45 minutes | Including verification |
| Full system + verification | 1-2 hours | Including health checks |

### If Backups Are Also Corrupted

1. **Check D1 Time Travel first** (30-day window):
   ```bash
   wrangler d1 time-travel info groveauth
   wrangler d1 time-travel restore groveauth --timestamp="YYYY-MM-DDTHH:MM:SSZ"
   ```

2. **Check weekly archives** in R2:
   ```bash
   wrangler r2 object list grove-patina --prefix="weekly/"
   ```

3. **Contact Cloudflare Support** for D1 recovery assistance

4. **Last resort**: Reconstruct from application logs and external sources

---

## 🔗 Integration with GroveMonitor

Once GroveMonitor is deployed, add these metrics:

```typescript
// Metrics to expose for monitoring
const backupMetrics = {
  'backup_last_success_timestamp': lastSuccessfulBackup,
  'backup_last_duration_ms': lastBackupDuration,
  'backup_total_size_bytes': totalBackupSize,
  'backup_databases_count': 6,
  'backup_failures_24h': failuresInLast24Hours,
};
```

### Alert Thresholds

| Alert | Threshold | Rationale |
|-------|-----------|-----------|
| **Stale backup** | 8+ days since success | Provides 1-week buffer after weekly retention. Allows for weekend maintenance windows + 1 day grace period. |
| **Size decrease** | >50% smaller than 7-day average | Significant data loss indicator. Small fluctuations (10-20%) are normal due to session cleanup, etc. |
| **Size increase** | >200% (2x) larger than 7-day average | Possible data corruption, injection attack, or runaway process. |
| **Consecutive failures** | 3+ in a row | Single failures may be transient; 3+ indicates systemic issue. |

GroveMonitor alert conditions:

```typescript
// Alert threshold constants
const ALERT_THRESHOLDS = {
  // Days without successful backup before alerting
  // Rationale: 7-day retention + 1 day grace = 8 days
  STALE_BACKUP_DAYS: 8,

  // Size change thresholds (as decimal multipliers)
  // >50% decrease = possible data loss
  SIZE_DECREASE_THRESHOLD: 0.5,
  // >200% increase = possible corruption/attack
  SIZE_INCREASE_THRESHOLD: 2.0,

  // Consecutive failures before escalating
  CONSECUTIVE_FAILURE_LIMIT: 3,
};

function shouldAlert(current: BackupMetrics, history: BackupMetrics[]): AlertType | null {
  const avg7Day = history.slice(0, 7).reduce((sum, m) => sum + m.sizeBytes, 0) / 7;

  if (current.sizeBytes < avg7Day * ALERT_THRESHOLDS.SIZE_DECREASE_THRESHOLD) {
    return 'size_decrease'; // Possible data loss
  }
  if (current.sizeBytes > avg7Day * ALERT_THRESHOLDS.SIZE_INCREASE_THRESHOLD) {
    return 'size_increase'; // Possible corruption
  }
  return null;
}
```

---

## 🔐 Security Checklist

Before deploying Patina to production, verify:

### Infrastructure Security

- [ ] **R2 Bucket Privacy**: Bucket is private (no public access URLs)
  ```bash
  # Verify: should show no public access
  wrangler r2 bucket info grove-patina
  ```
- [ ] **D1 Database Isolation**: Metadata DB only accessible via Worker binding
- [ ] **Worker Authentication**: Download endpoint requires auth (CF Access or API key)
- [ ] **Secrets Management**: All sensitive values in `wrangler secret`, not vars

### Operational Security

- [ ] **API Key Rotation Schedule**: Document rotation procedure
  ```bash
  # Rotate API key (update all clients first)
  wrangler secret put PATINA_API_KEY
  ```
  Recommended: Rotate every 90 days or immediately if compromised

- [ ] **Audit Logging**: Log all download requests
  ```typescript
  // Log format for download requests
  console.log(JSON.stringify({
    event: 'backup_download',
    timestamp: Date.now(),
    clientId: authenticatedClient,
    database: requestedDb,
    date: requestedDate,
    ip: request.headers.get('CF-Connecting-IP'),
  }));
  ```

- [ ] **Webhook Security**: Discord webhooks don't expose sensitive DB names/sizes
  - Use generic descriptions ("backup completed" not "groveauth: 212KB")
  - Or use internal-only notification channel

### Incident Response

- [ ] **Compromised API Key**: Rotation procedure documented
  1. Generate new key via `wrangler secret put PATINA_API_KEY`
  2. Update all authorized clients
  3. Review download logs for unauthorized access
  4. Consider re-encrypting backups if data exfiltration suspected

- [ ] **Backup Corruption**: Detection and response
  1. Size anomaly alerts trigger investigation
  2. Compare against previous exports
  3. Use D1 Time Travel for uncorrupted source

- [ ] **Unauthorized Restore Attempt**: Monitoring
  1. All restore-guide accesses logged
  2. Unusual patterns alert to security channel

---

## 📝 Notes for Claude Code

1. **Start with the exporter** — it's the core logic
2. **Test with one database first** (e.g., `your-site-posts` - smallest)
3. **Use batch processing** for large tables to avoid memory issues
4. **The metadata DB is optional initially** — can log to console first
5. **Discord alerting can be Phase 2** — get backups working first
6. **R2 keys should be `YYYY-MM-DD/database-name.sql`** format
7. **Include comprehensive headers** in SQL dumps for debugging
