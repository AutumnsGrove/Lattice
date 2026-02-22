# Greenhouse Admin Graft - Implementation Plan

Issue: #824

## Overview

Move all greenhouse enrollment UI from the landing package into the engine as a Wayfinder-only graft. This consolidates the admin functionality into the engine-first architecture.

## Components to Create

### 1. GreenhouseAdminPanel.svelte (NEW)

Location: `libs/engine/src/lib/grafts/greenhouse/GreenhouseAdminPanel.svelte`

A complete admin panel graft that includes:

- Stats cards (total enrolled, active, disabled counts)
- Info card explaining the greenhouse program
- Enrollment table (uses existing `GreenhouseEnrollTable`)
- Enrollment dialog (uses existing `GreenhouseEnrollDialog`)
- Cultivate mode section with flag table (uses existing `CultivateFlagTable`)

Props:

```typescript
interface GreenhouseAdminPanelProps {
	tenants: GreenhouseTenant[];
	tenantNames: Record<string, string>;
	availableTenants: Record<string, string>;
	featureFlags: FeatureFlagSummary[];
	onEnroll: (tenantId: string, notes: string) => void;
	onToggle: (tenantId: string, enabled: boolean) => void;
	onRemove: (tenantId: string) => void;
	onCultivate: (flagId: string) => void;
	onPrune: (flagId: string) => void;
	enrollLoading?: boolean;
	loadingFlagId?: string;
	formResult?: { success?: boolean; error?: string; message?: string };
}
```

## Server-Side Changes

### settings/+page.server.ts

Add to load function (Wayfinder-only data):

```typescript
// Only load for Wayfinder
if (isWayfinder(locals.user?.email)) {
	const [greenhouseTenants, featureFlags, allTenants] = await Promise.all([
		getGreenhouseTenants(flagsEnv),
		getFeatureFlags(flagsEnv),
		loadAllTenants(env.DB),
	]);
	// Build tenantNames and availableTenants maps
}
```

Add form actions:

- `enrollTenant` - Enroll a tenant in greenhouse
- `removeTenant` - Remove a tenant from greenhouse
- `toggleTenant` - Toggle tenant's greenhouse status
- `cultivateFlag` - Enable a feature flag globally
- `pruneFlag` - Disable a feature flag globally

## UI Integration

### settings/+page.svelte

Add after the existing GraftControlPanel section:

```svelte
{#if data.isWayfinder}
	<div class="mt-8">
		<GreenhouseAdminPanel
			tenants={data.greenhouseTenants}
			tenantNames={data.tenantNames}
			availableTenants={data.availableTenants}
			featureFlags={data.featureFlags}
			onEnroll={handleEnroll}
			onToggle={handleToggleTenant}
			onRemove={handleRemove}
			onCultivate={handleCultivate}
			onPrune={handlePrune}
			enrollLoading={enrollingTenant}
			{loadingFlagId}
		/>
	</div>
{/if}
```

## Files to Delete

After migration is complete:

- `apps/landing/src/routes/admin/greenhouse/+page.svelte`
- `apps/landing/src/routes/admin/greenhouse/+page.server.ts`

## Implementation Order

1. Create `GreenhouseAdminPanel.svelte` in engine
2. Export from `$lib/grafts/greenhouse/index.ts`
3. Add form actions to settings `+page.server.ts`
4. Add Wayfinder-only data loading to settings load function
5. Integrate panel into settings `+page.svelte`
6. Test functionality
7. Delete landing greenhouse admin page

## Type Updates

Add to `libs/engine/src/lib/grafts/greenhouse/types.ts`:

```typescript
export interface GreenhouseAdminPanelProps {
	tenants: GreenhouseTenant[];
	tenantNames: Record<string, string>;
	availableTenants: Record<string, string>;
	featureFlags: FeatureFlagSummary[];
	onEnroll: (tenantId: string, notes: string) => void;
	onToggle: (tenantId: string, enabled: boolean) => void;
	onRemove: (tenantId: string) => void;
	onCultivate: (flagId: string) => void;
	onPrune: (flagId: string) => void;
	enrollLoading?: boolean;
	loadingFlagId?: string;
	formResult?: { success?: boolean; error?: string; message?: string };
}
```
