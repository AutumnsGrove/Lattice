# Domain Guide: Database — Bear Migrate Reference

Kysely ORM patterns, batch processing, SQLite/D1 constraints, backup procedures, and verification queries.

---

## Preservation (WAKE)

### SQLite Backup

```bash
sqlite3 production.db ".backup backup-$(date +%Y%m%d-%H%M%S).db"
sqlite3 backup-$(date +%Y%m%d).db "PRAGMA integrity_check;"
```

### Cloudflare D1 Backup

```bash
npx wrangler d1 export db --output=backup-$(date +%Y%m%d).sql
```

### PostgreSQL Backup

```bash
pg_dump -Fc production > backup-$(date +%Y%m%d-%H%M%S).dump
pg_restore --list backup-$(date +%Y%m%d).dump | head -20
```

---

## Multi-Database Awareness

Grove uses multiple D1 bindings. Ensure migrations target the correct database:

- **DB** — Core tables (users, tenants, settings, storage_files, etc.)
- **CURIO_DB** — Curio-specific tables (articles, curio_settings, etc.)
- **OBS_DB** — Observability tables (pulse_events, analytics, etc.)

---

## Migration Plan Interface

```typescript
interface MigrationPlan {
	source: { schema: string; estimatedRows: number; criticalTables: string[] };
	destination: { schema: string; newConstraints: string[] };
	transformation: { mappings: Record<string, string>; calculatedFields: string[]; dataCleanup: string[] };
}
```

---

## Kysely Migration Script Structure

```typescript
import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
	await db.schema
		.createTable("user_preferences")
		.addColumn("id", "integer", (col) => col.primaryKey())
		.addColumn("user_id", "integer", (col) => col.references("users.id").onDelete("cascade"))
		.addColumn("theme", "varchar(50)", (col) => col.defaultTo("system"))
		.addColumn("created_at", "timestamp", (col) => col.defaultTo(sql`now()`))
		.execute();

	await sql`
    INSERT INTO user_preferences (user_id, theme)
    SELECT id, COALESCE(theme_preference, 'system') FROM users
    WHERE theme_preference IS NOT NULL
  `.execute(db);

	await db.schema.alterTable("users").dropColumn("theme_preference").execute();
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.alterTable("users").addColumn("theme_preference", "varchar(50)").execute();
	await sql`
    UPDATE users SET theme_preference = (
      SELECT theme FROM user_preferences WHERE user_preferences.user_id = users.id
    )
  `.execute(db);
	await db.schema.dropTable("user_preferences").execute();
}
```

---

## SQLite / D1 ALTER TABLE Constraints

**Supported:**
- `ADD COLUMN`, `RENAME TO`, `RENAME COLUMN` (SQLite 3.25.0+)

**Requires table rebuild:**
- `DROP COLUMN`, `MODIFY COLUMN`, `ADD CONSTRAINT`

### Table Rebuild Pattern

```typescript
export async function up(db: Kysely<any>): Promise<void> {
	// 1. Create new table with desired schema
	await db.schema.createTable("users_new")
		.addColumn("id", "integer", (col) => col.primaryKey())
		.addColumn("email", "text", (col) => col.notNull().unique())
		.addColumn("first_name", "text")
		.addColumn("last_name", "text")
		.addColumn("created_at", "integer", (col) => col.notNull())
		.execute();

	// 2. Copy and transform data
	await sql`
    INSERT INTO users_new (id, email, first_name, last_name, created_at)
    SELECT id, lower(trim(email)),
      CASE WHEN instr(name, ' ') > 0 THEN substr(name, 1, instr(name, ' ') - 1) ELSE name END,
      CASE WHEN instr(name, ' ') > 0 THEN substr(name, instr(name, ' ') + 1) ELSE NULL END,
      created_at
    FROM users
  `.execute(db);

	// 3. Drop old, rename new
	await db.schema.dropTable("users").execute();
	await db.schema.alterTable("users_new").renameTo("users").execute();

	// 4. Recreate indexes
	await db.schema.createIndex("users_email_idx").on("users").column("email").execute();
}
```

---

## Batch Processing (MOVE)

For datasets larger than ~10k rows:

```typescript
async function migrateInBatches(batchSize: number = 1000): Promise<void> {
	let offset = 0;
	let hasMore = true;

	while (hasMore) {
		const batch = await db.selectFrom("old_table").selectAll()
			.limit(batchSize).offset(offset).execute();

		if (batch.length === 0) { hasMore = false; break; }

		const transformed = batch.map(transformRecord);
		await db.insertInto("new_table").values(transformed).execute();

		offset += batchSize;
		console.log(`Migrated ${offset} records...`);

		if (offset % 10000 === 0) {
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
	}
}
```

### Transaction Safety

```typescript
await db.transaction().execute(async (trx) => {
	await createNewTables(trx);
	await migrateData(trx);
	await validateMigration(trx);
	await dropOldTables(trx); // only after validation passes
});
```

**D1 note:** Limited transaction support. Prefer explicit BEGIN/COMMIT/ROLLBACK via raw SQL, or batch with idempotent operations (INSERT OR IGNORE).

---

## Data Quality Checks (GATHER)

```typescript
const issues: string[] = [];

const nullEmails = await db.selectFrom("users").where("email", "is", null).selectAll().execute();
if (nullEmails.length > 0) issues.push(`${nullEmails.length} users missing email`);

const duplicates = await sql`
  SELECT email, count(*) as count FROM users GROUP BY email HAVING count > 1
`.execute(db);
if (duplicates.rows.length > 0) issues.push(`${duplicates.rows.length} duplicate emails`);

if (issues.length > 0) {
	console.error("Fix these issues before migrating:", issues);
	process.exit(1);
}
```

### Data Inventory Queries

```bash
npx wrangler d1 execute db --command="
  SELECT 'users' as tbl, count(*) as rows FROM users
  UNION ALL SELECT 'posts', count(*) FROM posts
  UNION ALL SELECT 'comments', count(*) FROM comments;
"
```

---

## Verification (HIBERNATE)

```bash
# Row count validation
npx wrangler d1 execute db --command="
  SELECT
    (SELECT count(*) FROM users_old) as old_count,
    (SELECT count(*) FROM users_new) as new_count;
"
```

```typescript
// Spot check sample records
const samples = await db.selectFrom("users").selectAll().limit(10).execute();
for (const user of samples) {
	console.log("Sample:", { id: user.id, email: user.email, has_first_name: !!user.first_name });
}
```

### Performance Check (VERIFY)

```sql
EXPLAIN QUERY PLAN
SELECT u.*, count(p.id) as post_count
FROM users u LEFT JOIN posts p ON u.id = p.user_id
GROUP BY u.id;
-- "Using index" = good; "Scanning entire table" = needs index
```

---

## Common SQL Transformations

```sql
UPDATE users SET email = lower(trim(email));
UPDATE users SET status = CASE WHEN is_active = 1 THEN 'active' ELSE 'inactive' END;
UPDATE posts SET slug = lower(replace(title, ' ', '-')) WHERE slug IS NULL;
DELETE FROM comments WHERE post_id NOT IN (SELECT id FROM posts);
```

---

## Zero-Downtime: Expand-Migrate-Contract

1. **Expand**: Add new column (nullable)
2. **Migrate**: Backfill data in batches
3. **Dual-write**: Deploy code writing to both columns
4. **Read switch**: Deploy code reading from new column
5. **Contract**: Drop old column (table rebuild in SQLite)

---

## Migration Completion Report

```markdown
## BEAR MIGRATION COMPLETE

### Migration: [Description]
- Records migrated: [count] [table]
- Duration: [time]
- Batches: [n] ([size] each)
- Errors: 0

### Validation
- [x] Row counts match
- [x] All required fields populated
- [x] Foreign keys intact
- [x] Tests passing

### Rollback
Backup: backup-[date].db
Script: migrations/down/[date]_[name].sql
```
