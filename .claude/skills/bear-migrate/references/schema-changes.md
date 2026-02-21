# Schema Changes — Bear Migrate Reference

ALTER TABLE patterns, Cloudflare D1 constraints, and data transformation reference for common schema evolution scenarios.

---

## SQLite / D1 ALTER TABLE Constraints

SQLite (and D1, which is built on SQLite) has significant limitations on ALTER TABLE compared to PostgreSQL:

**Supported:**
- `ALTER TABLE t ADD COLUMN col type`
- `ALTER TABLE t RENAME TO new_name`
- `ALTER TABLE t RENAME COLUMN old TO new` (SQLite 3.25.0+)

**Not supported (requires table rebuild):**
- `ALTER TABLE t DROP COLUMN col` (requires recreation)
- `ALTER TABLE t MODIFY COLUMN col type` (change type/constraints)
- `ALTER TABLE t ADD CONSTRAINT` (foreign keys, etc.)

For unsupported operations, use the table rebuild pattern.

---

## Table Rebuild Pattern (SQLite/D1)

When you need to drop a column, change a column type, or add a constraint:

```typescript
export async function up(db: Kysely<any>): Promise<void> {
  // Step 1: Create new table with desired schema
  await db.schema
    .createTable('users_new')
    .addColumn('id', 'integer', (col) => col.primaryKey())
    .addColumn('email', 'text', (col) => col.notNull().unique())
    .addColumn('display_name', 'text')
    // New column: split from full_name
    .addColumn('first_name', 'text')
    .addColumn('last_name', 'text')
    .addColumn('created_at', 'integer', (col) => col.notNull())
    .execute();

  // Step 2: Copy and transform data
  await sql`
    INSERT INTO users_new (id, email, display_name, first_name, last_name, created_at)
    SELECT
      id,
      lower(trim(email)),
      name,
      CASE WHEN instr(name, ' ') > 0
        THEN substr(name, 1, instr(name, ' ') - 1)
        ELSE name
      END as first_name,
      CASE WHEN instr(name, ' ') > 0
        THEN substr(name, instr(name, ' ') + 1)
        ELSE NULL
      END as last_name,
      created_at
    FROM users
  `.execute(db);

  // Step 3: Drop old table
  await db.schema.dropTable('users').execute();

  // Step 4: Rename new table
  await db.schema.alterTable('users_new').renameTo('users').execute();

  // Step 5: Recreate indexes
  await db.schema.createIndex('users_email_idx')
    .on('users')
    .column('email')
    .execute();
}
```

---

## Adding Columns with Defaults

This is safe and doesn't require a table rebuild:

```typescript
// Add column with default value
await db.schema.alterTable('posts')
  .addColumn('view_count', 'integer', (col) => col.defaultTo(0).notNull())
  .execute();

// Add nullable column (no default needed)
await db.schema.alterTable('posts')
  .addColumn('featured_image_url', 'text')
  .execute();

// Add column and immediately populate from existing data
await db.schema.alterTable('users')
  .addColumn('slug', 'text')
  .execute();

await sql`
  UPDATE users
  SET slug = lower(replace(display_name, ' ', '-')) || '-' || id
  WHERE slug IS NULL
`.execute(db);
```

---

## Index Management

```typescript
// Create standard index
await db.schema.createIndex('posts_user_id_idx')
  .on('posts')
  .column('user_id')
  .execute();

// Create unique index
await db.schema.createUniqueIndex('users_email_unique')
  .on('users')
  .column('email')
  .execute();

// Create composite index
await db.schema.createIndex('posts_user_created_idx')
  .on('posts')
  .columns(['user_id', 'created_at'])
  .execute();

// Drop index
await db.schema.dropIndex('old_index_name').execute();
```

---

## Common Transformation Patterns in SQL

```sql
-- Normalize email addresses
UPDATE users SET email = lower(trim(email));

-- Extract first word from a name field
UPDATE users SET first_name =
  CASE WHEN instr(full_name, ' ') > 0
    THEN substr(full_name, 1, instr(full_name, ' ') - 1)
    ELSE full_name
  END;

-- Convert boolean-like integers to text status
UPDATE users SET status = CASE WHEN is_active = 1 THEN 'active' ELSE 'inactive' END;

-- Generate slugs from titles (basic)
UPDATE posts SET slug = lower(replace(title, ' ', '-')) WHERE slug IS NULL;

-- Set timestamps from existing data
UPDATE posts SET published_at = created_at WHERE published = 1 AND published_at IS NULL;

-- Remove orphaned records before migration
DELETE FROM comments
WHERE post_id NOT IN (SELECT id FROM posts);
```

---

## D1-Specific Considerations

### Statement Size Limits
D1 has a maximum SQL statement size. For large data migrations, split into multiple statements:

```typescript
// Don't try to INSERT 50k rows in one statement
// Use batch processing: see references/migration-patterns.md
```

### Transaction Support
D1 supports basic transactions but not savepoints. If a transaction fails mid-migration in D1, rely on your pre-migration backup for rollback rather than transaction rollback.

### No JSON Functions (Older D1)
If using JSON columns, verify which SQLite version your D1 instance runs before using `json_extract()` and related functions.

---

## Zero-Downtime Schema Changes

For production apps that can't tolerate downtime:

**Pattern: Expand-Migrate-Contract**

1. **Expand**: Add new column (nullable, no default required initially)
2. **Migrate**: Backfill data in batches while app still uses old column
3. **Dual-write**: Deploy code that writes to BOTH old and new columns
4. **Read switch**: Deploy code that reads from new column
5. **Contract**: Drop old column in a subsequent migration

```typescript
// Step 1: Expand (safe, no downtime)
await db.schema.alterTable('users')
  .addColumn('display_name', 'text') // new column
  .execute();

// Step 2: Backfill (safe, run in background)
await sql`UPDATE users SET display_name = name WHERE display_name IS NULL`.execute(db);

// Step 3-4: Code changes (separate deployments)

// Step 5: Contract (after all code uses new column)
// Requires table rebuild in SQLite — see Table Rebuild Pattern above
```

---

## Rollback Strategies

For every migration `up()`, write the `down()`:

```typescript
export async function down(db: Kysely<any>): Promise<void> {
  // Reverse of up() — must restore original schema AND data

  // If you dropped a column in up(), re-add it and restore data from backup
  // (Store backup before running up())

  // If you added a column in up(), drop it in down()
  // SQLite: requires table rebuild even for DROP COLUMN
}
```

**When down() is complex or lossy:** Document that explicitly and keep the pre-migration backup for at least 30 days.

```typescript
export async function down(db: Kysely<any>): Promise<void> {
  // WARNING: This migration split full_name into first_name + last_name.
  // Original full_name data is NOT stored in the new schema.
  // Rollback from pre-migration backup: backup-20260130.db
  throw new Error(
    'Manual rollback required. See backup-20260130.db and migrations/rollback/20260130_split_name.sql'
  );
}
```
