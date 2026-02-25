# Migration Patterns — Bear Migrate Reference

Kysely ORM patterns, batch processing (1000 records), transaction handling, data transformation, and progress tracking.

---

## Migration Plan Interface

```typescript
// Document current state before writing any code
interface MigrationPlan {
	source: {
		schema: string;
		estimatedRows: number;
		criticalTables: string[];
	};
	destination: {
		schema: string;
		newConstraints: string[];
	};
	transformation: {
		mappings: Record<string, string>;
		calculatedFields: string[];
		dataCleanup: string[];
	};
}
```

---

## Multi-Database Awareness

Grove uses multiple D1 bindings. Ensure migrations target the correct database:

- **DB** — Core tables (users, tenants, settings, storage_files, storage_addons, etc.)
- **CURIO_DB** — Curio-specific tables (articles, curio_settings, etc.)
- **OBS_DB** — Observability tables (pulse_events, analytics, etc.)

When migrating storage-related tables, verify Amber SDK's QuotaManager reflects changes.

---

## Kysely Migration Script Structure

```typescript
// migrations/20260130_add_user_preferences.ts
import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
	// 1. Create new structure
	await db.schema
		.createTable("user_preferences")
		.addColumn("id", "integer", (col) => col.primaryKey())
		.addColumn("user_id", "integer", (col) => col.references("users.id").onDelete("cascade"))
		.addColumn("theme", "varchar(50)", (col) => col.defaultTo("system"))
		.addColumn("notifications", "boolean", (col) => col.defaultTo(true))
		.addColumn("created_at", "timestamp", (col) => col.defaultTo(sql`now()`))
		.execute();

	// 2. Migrate existing data
	await sql`
    INSERT INTO user_preferences (user_id, theme)
    SELECT id, COALESCE(theme_preference, 'system')
    FROM users
    WHERE theme_preference IS NOT NULL
  `.execute(db);

	// 3. Drop old column
	await db.schema.alterTable("users").dropColumn("theme_preference").execute();
}

export async function down(db: Kysely<any>): Promise<void> {
	// Reverse migration
	await db.schema.alterTable("users").addColumn("theme_preference", "varchar(50)").execute();

	await sql`
    UPDATE users
    SET theme_preference = (
      SELECT theme FROM user_preferences
      WHERE user_preferences.user_id = users.id
    )
  `.execute(db);

	await db.schema.dropTable("user_preferences").execute();
}
```

---

## Batch Processing (1000 Records)

For datasets larger than ~10k rows:

```typescript
async function migrateInBatches(batchSize: number = 1000): Promise<void> {
	let offset = 0;
	let hasMore = true;

	while (hasMore) {
		const batch = await db
			.selectFrom("old_table")
			.selectAll()
			.limit(batchSize)
			.offset(offset)
			.execute();

		if (batch.length === 0) {
			hasMore = false;
			break;
		}

		// Transform and insert
		const transformed = batch.map(transformRecord);

		await db.insertInto("new_table").values(transformed).execute();

		offset += batchSize;
		console.log(`Migrated ${offset} records...`);

		// Brief pause every 10,000 records to prevent memory pressure
		if (offset % 10000 === 0) {
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
	}
}
```

---

## Transaction Safety

```typescript
await db.transaction().execute(async (trx) => {
	try {
		// 1. Create new structure
		await createNewTables(trx);

		// 2. Migrate data
		await migrateData(trx);

		// 3. Validate counts
		await validateMigration(trx);

		// 4. Drop old structure (only after validation passes)
		await dropOldTables(trx);
	} catch (error) {
		console.error("Migration failed, rolling back:", error);
		throw error; // Transaction automatically rolls back
	}
});
```

**Note for Cloudflare D1:** D1 has limited transaction support. For large D1 migrations, prefer explicit BEGIN/COMMIT/ROLLBACK via raw SQL, or run in batches with idempotent operations (INSERT OR IGNORE, UPDATE OR IGNORE).

---

## Data Transformation Logic

```typescript
function transformRecord(old: OldUser): NewUser {
	return {
		id: old.id,
		email: old.email.toLowerCase().trim(),
		display_name: old.name || old.email.split("@")[0],
		created_at: new Date(old.created_at),
		// Split full name into parts
		first_name: old.full_name?.split(" ")[0] || null,
		last_name: old.full_name?.split(" ").slice(1).join(" ") || null,
		// Convert string status to enum
		status: old.is_active ? "active" : "inactive",
		// Calculate new field
		account_age_days: Math.floor(
			(Date.now() - new Date(old.created_at).getTime()) / (1000 * 60 * 60 * 24),
		),
	};
}
```

---

## Progress Tracking

```typescript
const progress = {
	started: new Date(),
	totalRows: 0,
	processedRows: 0,
	errors: [] as string[],
	batchTimes: [] as number[],
};

// Before batching: count total
const { count } = await db
	.selectFrom("old_table")
	.select(db.fn.count("id").as("count"))
	.executeTakeFirstOrThrow();
progress.totalRows = Number(count);

// After each batch
progress.processedRows += batch.length;
const percent = ((progress.processedRows / progress.totalRows) * 100).toFixed(1);
console.log(`Progress: ${percent}% (${progress.processedRows}/${progress.totalRows})`);
```

---

## Data Quality Check (Pre-Migration)

Run these before executing any transformation:

```typescript
const issues: string[] = [];

// Check for nulls in required fields
const nullEmails = await db.selectFrom("users").where("email", "is", null).selectAll().execute();

if (nullEmails.length > 0) {
	issues.push(`${nullEmails.length} users missing email — fix before migrating`);
}

// Check for duplicates
const duplicates = await sql`
  SELECT email, count(*) as count
  FROM users
  GROUP BY email
  HAVING count > 1
`.execute(db);

if (duplicates.rows.length > 0) {
	issues.push(`${duplicates.rows.length} duplicate emails — resolve before migrating`);
}

if (issues.length > 0) {
	console.error("Data quality issues detected:", issues);
	console.error("Fix these issues before running the migration.");
	process.exit(1);
}

console.log("Data quality check passed. Ready to migrate.");
```

---

## Relationship Mapping

```typescript
// Document foreign key relationships before migration
const relationships = {
	users: {
		hasMany: ["posts", "comments", "sessions"],
		belongsTo: [],
	},
	posts: {
		hasMany: ["comments"],
		belongsTo: ["users"],
	},
	comments: {
		hasMany: [],
		belongsTo: ["users", "posts"],
	},
};

// Migration order matters! Always migrate parent tables first.
const migrationOrder = ["users", "posts", "comments"];
```

---

## Data Inventory Queries

```bash
# Count rows per table (D1/SQLite)
npx wrangler d1 execute db --command="
  SELECT 'users' as table_name, count(*) as rows FROM users
  UNION ALL
  SELECT 'posts', count(*) FROM posts
  UNION ALL
  SELECT 'comments', count(*) FROM comments;
"

# Check for orphaned records
npx wrangler d1 execute db --command="
  SELECT count(*) as orphaned_comments
  FROM comments c
  LEFT JOIN posts p ON c.post_id = p.id
  WHERE p.id IS NULL;
"

# Find edge cases
npx wrangler d1 execute db --command="
  SELECT
    max(length(content)) as max_content_length,
    min(created_at) as oldest_record,
    count(distinct status) as status_values
  FROM posts;
"
```
