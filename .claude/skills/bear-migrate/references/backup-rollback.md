# Backup and Rollback — Bear Migrate Reference

SQLite/PostgreSQL backup procedures, rollback plans, verification queries, and the migration completion report.

---

## Backup Before Every Migration

This is non-negotiable. Never migrate production without a backup you've verified can be restored.

### SQLite Backup

```bash
# SQLite backup — creates a consistent snapshot
sqlite3 production.db ".backup backup-$(date +%Y%m%d-%H%M%S).db"

# Verify backup is not corrupt
sqlite3 backup-$(date +%Y%m%d).db "PRAGMA integrity_check;"
# Should return: ok
```

### PostgreSQL Backup

```bash
# Custom format (compressed, restorable)
pg_dump -Fc production > backup-$(date +%Y%m%d-%H%M%S).dump

# Verify backup
pg_restore --list backup-$(date +%Y%m%d).dump | head -20

# Restore from backup if needed
pg_restore -d production_restored backup-$(date +%Y%m%d).dump
```

### Cloudflare D1 Backup

D1 doesn't have a native pg_dump equivalent. Export via wrangler:

```bash
# Export all data as SQL
npx wrangler d1 export db --output=backup-$(date +%Y%m%d).sql

# For large databases, export table by table
npx wrangler d1 execute db --command="SELECT * FROM users" | \
  jq -r '.[] | "INSERT INTO users VALUES (\(.id), \(.email|@json), ...)"' \
  > backup-users-$(date +%Y%m%d).sql
```

---

## Row Count Validation

```bash
# Verify row counts match before removing old data
npx wrangler d1 execute db --command="
  SELECT
    (SELECT count(*) FROM users_old) as old_count,
    (SELECT count(*) FROM users_new) as new_count;
"

# Both columns should show equal numbers
# If new_count < old_count: migration is incomplete — do NOT drop old table
```

---

## Data Integrity Checks

```typescript
// Run these verification queries after migration completes
const checks = [
  {
    name: 'Email format',
    query: db.selectFrom('users')
      .where(sql`email NOT LIKE '%@%.%'`, '=', true)
      .select(sql`count(*)`.as('count'))
  },
  {
    name: 'Required fields',
    query: db.selectFrom('users')
      .where('created_at', 'is', null)
      .select(sql`count(*)`.as('count'))
  },
  {
    name: 'Foreign key integrity',
    query: sql`
      SELECT count(*) as count
      FROM comments c
      LEFT JOIN posts p ON c.post_id = p.id
      WHERE p.id IS NULL
    `
  }
];

for (const check of checks) {
  const result = await check.query.execute(db);
  const count = Number(result.rows[0].count);
  if (count > 0) {
    console.error(`FAIL: ${check.name} — ${count} issues found`);
  } else {
    console.log(`PASS: ${check.name}`);
  }
}
```

---

## Spot Check

```typescript
// Manually inspect sample records to verify transformation logic
const samples = await db.selectFrom('users')
  .selectAll()
  .limit(10)
  .execute();

for (const user of samples) {
  console.log('Sample user:', {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    has_first_name: !!user.first_name,
    has_account_age: (user.account_age_days || 0) > 0
  });
}
```

---

## Application Testing After Migration

```bash
# Run full test suite
npm test

# Test critical paths manually in dev server
npm run dev
# Check:
# - User login
# - Create post
# - View dashboard
# - Search functionality
# - Any feature that touches migrated tables
```

---

## Performance Check

```sql
-- Check query performance on new schema
EXPLAIN QUERY PLAN
SELECT u.*, count(p.id) as post_count
FROM users u
LEFT JOIN posts p ON u.id = p.user_id
GROUP BY u.id;

-- Look for:
-- Using index → good
-- Scanning entire table → may need index on join column
```

If a full table scan appears where it didn't before, add an index:

```typescript
await db.schema.createIndex('users_heartwood_id_idx')
  .on('users')
  .column('heartwood_id')
  .execute();
```

---

## Cleanup and Archiving

```bash
# Production: keep backup for at least 30 days before deleting
# Development: remove after verification
rm backup-20260130.db

# Or archive (recommended for production)
mv backup-20260130.db /backups/archived/

# Archive policy: keep last 3 migration backups minimum
ls -la /backups/archived/ | tail -5
```

---

## Migration Completion Report Template

```markdown
## BEAR MIGRATION COMPLETE

### Migration: [Description of what changed]

### Stats
- Records migrated: [count] [table name]
- Duration: [time]
- Batches: [n] ([batch_size] records each)
- Errors: 0

### Transformations Applied
- [Description of each transformation]
- Normalized [n] records with [what change]
- Removed [n] orphaned records

### Validation
- [x] Row count matches: [count]
- [x] All [field] valid format
- [x] No null required fields
- [x] Foreign keys intact
- [x] Application tests passing

### Rollback Available
Backup retained at: backup-[date].db
Rollback script: migrations/down/[date]_[name].sql
```
