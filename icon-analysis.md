# Grove Project Icon Standardization - Final Summary

## Source of Truth

**Workshop Page** (`landing/src/routes/roadmap/workshop/+page.svelte`) is the authoritative source for all Grove project icons.

## Changes Made

### 1. Added Missing Icon Imports to Icons.ts

Added the following imports to `landing/src/lib/utils/icons.ts`:
- `Database` - For Patina backups (was incorrectly using HardDrive)
- `Zap` - For performance/ephemeral features

### 2. Fixed Icon Mappings in `toolIcons`

Updated in `landing/src/lib/utils/icons.ts`:
- `database: HardDrive` → `database: Database` ✅

### 3. Standardized `roadmapFeatureIcons` to Match Workshop

Updated in `landing/src/lib/utils/icons.ts` to match Workshop page semantics:

| Feature | Old Icon | New Icon | Reasoning |
|---------|----------|----------|-----------|
| **Bloom** (Remote Coding) | `terminal: FileText` | `terminal: Terminal` | Coding/CLI metaphor |
| **Mycelium** (MCP Server) | `network: Github` | `network: CircuitBoard` | Server infrastructure |
| **Patina** (Backups) | `database: HardDrive` | `database: Database` | Database backups |
| **Ivy** (Email) | `ivy: Mail` | `ivy: Mailbox` | Matches Workshop |
| **Trails** (Roadmaps) | `trails: MapPin` | `trails: MapPinPlus` | Journey/creation metaphor |
| **Foliage** (Theming) | `swatchbook: Palette` | `swatchbook: SwatchBook` | Matches Workshop |
| **Meadow** (Social) | `meadow: Flower2` | `meadow: Users` | Community/social focus |
| **Thorn** (Moderation) | `shield: ShieldUser` | `shield: UserRoundCheck` | Matches Workshop |
| **Performance** | `zap: TrendingUp` | `zap: Zap` | Speed/energy metaphor |
| **The Cafe** | `coffee: Heart` | `coffee: Coffee` | Literal representation |
| **Community Boards** | `qrcode: Lightbulb` | `qrcode: QrCode` | Literal QR code feature |

## Current Standardized Icon Registry

### Core Infrastructure
- **Lattice** (Framework): `Codesandbox` - Container/framework metaphor
- **Heartwood** (Auth): `ShieldCheck` - Security
- **Arbor** (Admin): `LayoutDashboard` - Control panel
- **Plant** (Onboarding): `LandPlot` - New growth

### Platform Services
- **Amber** (Storage): `HardDrive` - Storage
- **Foliage** (Themes): `SwatchBook` - Theme swatches
- **Terrarium** (Creative Canvas): `PencilRuler` - Design tool
- **Rings** (Analytics): `BarChart3` - Analytics
- **Clearing** (Status): `Activity` - System health
- **Waystone** (Help): `Signpost` - Guidance

### Content & Community
- **Wisp** (Writing Assistant): `Wind` - Light, airy helper
- **Reeds** (Comments): `MessagesSquare` - Discussions
- **Thorn** (Moderation): `UserRoundCheck` - User protection
- **Meadow** (Social): `Users` - Community
- **Trails** (Roadmaps): `MapPinPlus` - Journey tracking

### Standalone Tools
- **Ivy** (Email): `Mailbox` - Email service
- **Bloom** (Remote Coding): `Terminal` - CLI/coding
- **Forage** (Domain Search): `SearchCode` - Advanced search
- **Nook** (Video Sharing): `Projector` - Video projection
- **Outpost** (Minecraft): `Pickaxe` - Mining/Minecraft

### Operations
- **CDN Uploader**: `Upload` - File upload
- **Vista** (Monitoring): `Binoculars` - Observability
- **Patina** (Backups): `Database` - Database backups
- **Mycelium** (MCP): `CircuitBoard` - Server infrastructure
- **Shade** (Protection): `BrickWall` - Defensive wall

### Patterns
- **Prism** (Design System): `Triangle` - Light prism
- **Loom** (Durable Objects): `Spool` - Thread weaving
- **Threshold** (Rate Limiting): `Gauge` - Measurement
- **Songbird** (Prompt Protection): `Bird` - Canary/guardian
- **Sentinel** (Load Testing): `Radar` - Detection
- **Firefly** (Ephemeral Servers): `Webhook` - Event trigger
- **Vineyard** (Showcase Pattern): `Grape` - Vineyard metaphor

### Midnight Bloom (Future Vision)
- **The Cafe**: `Coffee` - Tea/coffee shop
- **Community Boards**: `QrCode` - QR code links
- **Local Zines**: `BookOpen` - Published zines
- **A Third Place**: `Home` - Home/community space

## Implementation Notes

### All Icons Are Lucide

Following Grove UI Design principles:
- ✅ Use Lucide icons exclusively
- ❌ Never use emojis
- ✅ Import from centralized `icons.ts`
- ❌ Never import directly from `lucide-svelte`

### Icon Usage Pattern

```svelte
<script>
  import { toolIcons, roadmapFeatureIcons } from '$lib/utils/icons';
</script>

<!-- Workshop page -->
<svelte:component this={toolIcons[tool.icon]} class="w-5 h-5" />

<!-- Roadmap page -->
<svelte:component this={roadmapFeatureIcons[feature.icon]} class="w-5 h-5" />
```

### Color Schemes (Roadmap Page)

Icons are colored semantically by phase and project:
- **Spring/First Buds**: Green, amber, teal, emerald, violet
- **Summer/Full Bloom**: Green, blue, sky, pink, amber, indigo
- **Autumn/Golden Hour**: Amber, yellow, blue, purple tones
- **Winter/Midnight Bloom**: Purple, amber, pink for mystical feel

## Consistency Achieved

✅ Workshop page remains authoritative source of truth
✅ Icons.ts updated to match Workshop semantics
✅ Roadmap page uses standardized icon mappings
✅ All icons properly imported from Lucide
✅ Database icon now uses actual Database component
✅ Performance/ephemeral features use Zap icon
✅ Social features use Users icon
✅ Midnight Bloom features use literal icons (Coffee, QrCode)

## Files Modified

1. `landing/src/lib/utils/icons.ts`
   - Added `Database` and `Zap` imports
   - Fixed `toolIcons.database` mapping
   - Updated `roadmapFeatureIcons` to match Workshop

2. `landing/src/routes/roadmap/workshop/+page.svelte`
   - No changes (source of truth preserved)

3. `landing/src/routes/roadmap/+page.svelte`
   - No changes needed (uses updated `roadmapFeatureIcons`)

## Grove UI Design Compliance

This standardization follows all Grove UI Design skill principles:
- Lucide icons only ✅
- Semantic icon choices ✅
- Centralized icon registry ✅
- Consistent mapping across pages ✅
- Nature metaphors where appropriate ✅

---

*Standardization completed: 2026-01-06*
*Next review: When new Grove projects are added*
