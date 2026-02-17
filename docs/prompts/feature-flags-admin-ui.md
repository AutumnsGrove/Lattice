# Feature Flags Admin UI Implementation Prompt

## Context

You are implementing a Feature Flags Admin UI for the Grove platform. The backend evaluation engine has already been built in Lattice (`packages/engine/src/lib/feature-flags/`). Now we need the admin interface to create, edit, and manage feature flags.

**Repository**: https://github.com/AutumnsGrove/GroveAuth (frontend in `frontend/` directory)
**Location**: `/dashboard/flags/` routes

## Background Architecture

### Feature Flags System Overview

The feature flags system uses a **D1 + KV hybrid architecture**:

- **D1 (SQLite)**: Source of truth for flag definitions, rules, and audit log
- **KV**: Fast read cache for evaluation (60s TTL default)

### Database Schema (in Lattice)

```sql
-- Core flags table
CREATE TABLE feature_flags (
  id TEXT PRIMARY KEY,                 -- e.g., 'jxl_encoding', 'meadow_access'
  name TEXT NOT NULL,                  -- Human-readable name
  description TEXT,                    -- What this flag controls
  flag_type TEXT NOT NULL,             -- 'boolean', 'percentage', 'variant', 'tier', 'json'
  default_value TEXT NOT NULL,         -- Default when no rules match (JSON encoded)
  enabled INTEGER NOT NULL DEFAULT 1,  -- Master kill switch
  cache_ttl INTEGER DEFAULT 60,        -- KV cache TTL in seconds
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT,
  updated_by TEXT
);

-- Rules determine flag values based on context
CREATE TABLE flag_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flag_id TEXT NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  priority INTEGER NOT NULL DEFAULT 0,    -- Higher priority rules evaluated first
  rule_type TEXT NOT NULL,                -- 'tenant', 'tier', 'percentage', 'user', 'time', 'always'
  rule_value TEXT NOT NULL,               -- JSON: criteria for this rule
  result_value TEXT NOT NULL,             -- JSON: value to return if rule matches
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

-- Audit log for flag changes
CREATE TABLE flag_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flag_id TEXT NOT NULL,
  action TEXT NOT NULL,                   -- 'create', 'update', 'delete', 'enable', 'disable'
  old_value TEXT,
  new_value TEXT,
  changed_by TEXT,
  changed_at TEXT NOT NULL,
  reason TEXT
);
```

### Rule Types Supported

| Rule Type    | Condition Format                           | Description                                                        |
| ------------ | ------------------------------------------ | ------------------------------------------------------------------ |
| `tenant`     | `{ tenantIds: string[] }`                  | Match specific tenant IDs                                          |
| `tier`       | `{ tiers: TierKey[] }`                     | Match subscription tiers (free, seedling, sapling, oak, evergreen) |
| `percentage` | `{ percentage: number, salt?: string }`    | Gradual rollout (0-100%)                                           |
| `user`       | `{ userIds: string[] }`                    | Match specific user IDs                                            |
| `time`       | `{ startDate?: string, endDate?: string }` | Time-based activation                                              |
| `always`     | `{}`                                       | Catch-all default                                                  |

### Flag Types

| Type         | Description           | Default Value Example        |
| ------------ | --------------------- | ---------------------------- |
| `boolean`    | On/off toggle         | `"true"` or `"false"`        |
| `percentage` | Rollout percentage    | `"0"` to `"100"`             |
| `variant`    | A/B test variant      | `"control"`, `"treatment_a"` |
| `tier`       | Tier-gated access     | `"false"`                    |
| `json`       | Arbitrary JSON config | `"{ \"maxPosts\": 50 }"`     |

## Requirements

### 1. API Endpoints (Backend - `src/routes/admin.ts`)

Add these endpoints to the existing admin routes:

```typescript
// Feature Flags Admin API
GET  /admin/flags              // List all flags with rules
GET  /admin/flags/:id          // Get single flag with rules and recent audit
POST /admin/flags              // Create new flag
PUT  /admin/flags/:id          // Update flag (name, description, default, enabled, cache_ttl)
DELETE /admin/flags/:id        // Delete flag (cascade deletes rules)

// Flag Rules
POST /admin/flags/:id/rules    // Add rule to flag
PUT  /admin/flags/:id/rules/:ruleId  // Update rule
DELETE /admin/flags/:id/rules/:ruleId // Delete rule

// Audit Log
GET  /admin/flags/:id/audit    // Get audit log for specific flag
GET  /admin/audit/flags        // Get all flag audit events (recent)

// Cache Management
POST /admin/flags/:id/invalidate  // Invalidate KV cache for flag
POST /admin/flags/invalidate-all  // Invalidate all flag caches (emergency)
```

**Authorization**: All endpoints require admin JWT + `is_admin=true` check (same as existing `/admin/*` routes).

### 2. Frontend Pages (in `frontend/src/routes/dashboard/`)

#### 2.1 Flags List Page (`/dashboard/flags/+page.svelte`)

**Features**:

- Table listing all flags with columns: Name, Type, Status (enabled/disabled), Rules count, Last Updated
- Quick toggle for enabled/disabled status
- Search/filter by name or type
- "Create Flag" button
- Click row to navigate to flag detail page

**UI Components**:

- Use existing GroveAuth styling patterns (Tailwind + grove color palette)
- Status badge: green for enabled, gray for disabled
- Flag type badges with distinct colors

#### 2.2 Flag Detail/Edit Page (`/dashboard/flags/[id]/+page.svelte`)

**Sections**:

1. **Header**
   - Flag name (editable)
   - Flag ID (read-only, shown as code)
   - Enable/Disable toggle (prominent)
   - Delete button (with confirmation dialog)

2. **Basic Configuration**
   - Description (textarea)
   - Flag Type (dropdown: boolean, percentage, variant, tier, json)
   - Default Value (input appropriate to type)
   - Cache TTL (number input, seconds, or "default" option)

3. **Rules Section**
   - List of rules sorted by priority
   - Each rule shows: Priority, Type, Condition, Result Value, Enabled toggle
   - Drag-and-drop to reorder priority (or manual priority input)
   - "Add Rule" button opens rule editor
   - Edit/Delete buttons per rule

4. **Audit Log Section**
   - Recent changes to this flag
   - Shows: Action, Changed By, Changed At, Reason
   - Collapsible/expandable

5. **Cache Actions**
   - "Invalidate Cache" button
   - Shows approximate cache entries affected

#### 2.3 Create Flag Page (`/dashboard/flags/new/+page.svelte`)

**Form Fields**:

- Flag ID (text, slug format, validated unique)
- Name (text, required)
- Description (textarea, optional)
- Flag Type (dropdown)
- Default Value (appropriate input for type)
- Enabled (checkbox, default true)

**Validation**:

- Flag ID: lowercase, alphanumeric with underscores, max 64 chars
- Name: required, max 128 chars
- Default Value: must be valid JSON for the selected type

### 3. Rule Editor Component

Create a reusable `RuleEditor.svelte` component for adding/editing rules.

**Fields by Rule Type**:

| Rule Type    | Fields                                                             |
| ------------ | ------------------------------------------------------------------ |
| `tenant`     | Multi-select or text input for tenant IDs                          |
| `tier`       | Checkbox group for tiers (free, seedling, sapling, oak, evergreen) |
| `percentage` | Slider (0-100%) + optional salt input                              |
| `user`       | Multi-select or text input for user IDs                            |
| `time`       | Date pickers for start/end                                         |
| `always`     | No additional fields                                               |

**Common Fields**:

- Priority (number)
- Result Value (appropriate input for flag type)
- Enabled (checkbox)

### 4. Design Patterns to Follow

Based on existing GroveAuth admin UI:

**Styling**:

```css
/* Follow existing grove color palette */
--grove-50 to --grove-950
--bark (brown accent)
--cream (light background)

/* Component patterns */
.card - white bg with light shadow
.btn-primary - grove green
.btn-secondary - white with grove border
.badge-success, .badge-error, .badge-info
.input-field - standard inputs with grove focus ring
```

**Layout**:

- Use same dashboard layout as other admin pages
- Header with page title and primary action button
- Content in card containers
- Responsive grid for form sections

**Interactions**:

- Form submissions use SvelteKit actions with `$enhance`
- Confirmations for destructive actions (delete flag, invalidate cache)
- Toast notifications for success/error feedback
- Loading states during API calls

### 5. TypeScript Types

Add to `frontend/src/lib/types/` or inline:

```typescript
interface FeatureFlag {
  id: string;
  name: string;
  description?: string;
  flagType: "boolean" | "percentage" | "variant" | "tier" | "json";
  defaultValue: unknown;
  enabled: boolean;
  cacheTtl?: number;
  rules: FlagRule[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

interface FlagRule {
  id: number;
  flagId: string;
  priority: number;
  ruleType: "tenant" | "tier" | "percentage" | "user" | "time" | "always";
  ruleValue: Record<string, unknown>;
  resultValue: unknown;
  enabled: boolean;
  createdAt: string;
}

interface FlagAuditEntry {
  id: number;
  flagId: string;
  action:
    | "create"
    | "update"
    | "delete"
    | "enable"
    | "disable"
    | "rule_add"
    | "rule_update"
    | "rule_delete";
  oldValue?: unknown;
  newValue?: unknown;
  changedBy?: string;
  changedAt: string;
  reason?: string;
}
```

### 6. Navigation Integration

Add to existing dashboard sidebar in `frontend/src/routes/dashboard/+layout.svelte`:

```svelte
<a href="/dashboard/flags" class="nav-item">
  <Flag class="nav-icon" />  <!-- lucide-svelte -->
  <span>Feature Flags</span>
</a>
```

Position in navigation: After "Status" or at the end of admin tools section.

### 7. Database Connection

The feature flags tables are in the **Lattice D1 database** (`grove-engine-db`), not the GroveAuth database. The admin API needs to connect to the engine database for flag management.

**Options**:

1. Add `GROVE_ENGINE_DB` binding to GroveAuth worker
2. Proxy flag management through a Lattice API endpoint
3. Create a shared database binding

Recommendation: Add a new D1 binding to GroveAuth's `wrangler.toml`:

```toml
[[d1_databases]]
binding = "ENGINE_DB"
database_name = "grove-engine-db"
database_id = "your-engine-db-id"
```

### 8. Cache Invalidation

When flags are updated in the admin UI, invalidate the KV cache:

```typescript
// In admin API after flag update
await env.FLAGS_KV.delete(`flag:${flagId}:*`);
// Or use list + delete pattern for prefix matching
```

Ensure `FLAGS_KV` binding is available in GroveAuth worker.

## Files to Create/Modify

### New Files

```
frontend/src/routes/dashboard/flags/
├── +page.svelte          # Flags list
├── +page.server.ts       # Load all flags
├── new/
│   ├── +page.svelte      # Create flag form
│   └── +page.server.ts   # Create action
└── [id]/
    ├── +page.svelte      # Flag detail/edit
    └── +page.server.ts   # Load flag, update/delete actions

frontend/src/lib/components/flags/
├── RuleEditor.svelte     # Rule add/edit modal
├── PercentageSlider.svelte  # 0-100% slider for percentage rules
├── TierSelector.svelte   # Checkbox group for tier selection
├── FlagTypeBadge.svelte  # Colored badge for flag type
└── AuditLogTable.svelte  # Audit log display

frontend/src/lib/types/flags.ts  # TypeScript interfaces
```

### Modified Files

```
src/routes/admin.ts                 # Add flag management endpoints
src/db/queries.ts                   # Add flag query functions
frontend/src/routes/dashboard/+layout.svelte  # Add flags nav item
wrangler.toml                       # Add ENGINE_DB binding
```

## Testing Considerations

1. **Unit Tests**: Test rule evaluation logic edge cases
2. **Integration Tests**: Test API endpoints with mock D1
3. **E2E Tests**: Test full flow from UI to database and back

## Implementation Order

1. **Backend API** (src/routes/admin.ts) - CRUD endpoints
2. **Database queries** (src/db/queries.ts) - Flag query functions
3. **Flags list page** - Basic listing with enable/disable toggle
4. **Create flag page** - New flag form
5. **Flag detail page** - View and edit existing flags
6. **Rule editor** - Add/edit rules modal
7. **Audit log** - Display change history
8. **Cache invalidation** - Wire up KV invalidation
9. **Navigation** - Add to sidebar

## Success Criteria

- [ ] Admin can view all feature flags in a list
- [ ] Admin can create new flags with appropriate type and default value
- [ ] Admin can edit flag configuration (name, description, default, TTL)
- [ ] Admin can enable/disable flags with a toggle
- [ ] Admin can add rules with various condition types
- [ ] Admin can reorder rules by priority
- [ ] Admin can delete flags and rules (with confirmation)
- [ ] Audit log tracks all changes with user attribution
- [ ] Cache invalidation works when flags are updated
- [ ] UI follows existing GroveAuth design patterns
- [ ] All endpoints are protected by admin authorization

## Example Initial Flags

These flags already exist in the migration seed data:

1. **jxl_encoding** - JPEG XL image compression rollout
2. **jxl_kill_switch** - Emergency disable for JXL (no caching)
3. **meadow_access** - Tier-gated social features

The admin UI should be able to manage these and create new ones.
