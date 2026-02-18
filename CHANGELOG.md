# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Zip Data Export**: Self-service ZIP export at `/arbor/export` with markdown files (YAML frontmatter), actual R2 images, and README. Background processing via Durable Object with progress tracking, email delivery via Zephyr, and in-browser download. Exports expire after 7 days with automatic R2 cleanup.

## [0.8.5] - 2026-01-04

### Added

- **Glass Design System**: Complete implementation of glassmorphism UI across Forest, Plant, Admin, and Domains pages with browser fallbacks
- **Typography Components**: New `@autumnsgrove/lattice/ui/typography` package with scoped font application and showcase
- **Vineyard Showcase**: New `vineyard.grove.place` site displaying component library and asset gallery
- **Manifesto Page**: Personal vision page with midnight bloom aesthetic and community values
- **Workshop Page Reorganization**: Categorized sections with Grove ecosystem tools and patterns
- **Help Center**: 6 new articles covering browser compatibility, privacy, replies vs comments, formatting, and writing guides
- **Pattern Library Additions**:
  - **Songbird Pattern**: Prompt injection protection with multi-layer security (Canary, Kestrel, Robin)
  - **Prism Pattern**: Glass design system documentation
  - **Firefly Pattern**: Ephemeral server pattern for real-time features
  - **Loom Pattern**: Durable Objects coordination system
- **Vista Analytics Engine**: Privacy-first analytics with Rings integration and threshold monitoring
- **Onboarding Email Sequence**: Automated welcome series for waitlist signups with Resend integration
- **Dynamic OG Image Generation**: Standalone Worker for social sharing with glass panels and seasonal themes
- **Pricing Page Redesign**: Glass aesthetic with tier comparison and accessibility improvements

### Changed

- **Navigation**: Standardized Lucide icons across all components with consistent naming
- **Logo System**: Enhanced breathing animation with seasonal variants (summer as default)
- **Domain Pages**: Unified glass design system with consistent borders and dark mode visibility
- **Workshop Tools**: Added missing Grove ecosystem tools (Vineyard, Mycelium, Vista, etc.)
- **Documentation**: Standardized frontmatter across 30+ spec files with Grove naming conventions
- **Build System**: Improved Svelte 5 reactive patterns and defensive coding practices

### Fixed

- **Deployment Issues**: Resolved GitHub Actions failures and critical build errors
- **Accessibility**: Improved keyboard navigation, screen reader support, and mobile responsiveness
- **Browser Compatibility**: Enhanced glass system fallbacks for older browsers
- **Routing**: Fixed Shade routing and CSRF validation for Turnstile verification
- **Documentation Links**: Resolved broken internal links causing prerendering failures

### Breaking Changes

- **Import Paths**: Nature components now require `@autumnsgrove/lattice/ui/nature` import instead of local paths
- **Spec Naming**: All specification files renamed with Grove ecosystem names (affects cross-references)

## [0.8.0] - 2025-12-29

### Added

- **Nature Components Library**: Complete collection of SVG nature components for atmospheric forest scenes
  - **Trees**: `Logo`, `TreePine`, `TreeCherry`, `TreeAspen`, `TreeBirch`
  - **Botanical**: `Leaf`, `LeafFalling`, `PetalFalling`, `FallingLeavesLayer`, `FallingPetalsLayer`, `Vine`, `Acorn`, `PineCone`, `Berry`, `DandelionPuff`
  - **Creatures**: `Bee`, `Bird`, `BirdFlying`, `Butterfly`, `Cardinal`, `Chickadee`, `Robin`, `Bluebird`, `Deer`, `Firefly`, `Owl`, `Rabbit`, `Squirrel`
  - **Ground**: `Bush`, `Crocus`, `Daffodil`, `Fern`, `FlowerWild`, `GrassTuft`, `Log`, `Mushroom`, `MushroomCluster`, `Rock`, `Stump`, `Tulip`
  - **Sky**: `Cloud`, `CloudWispy`, `Moon`, `Rainbow`, `Star`, `StarCluster`, `StarShooting`, `Sun`
  - **Structural**: `Birdhouse`, `Bridge`, `FencePost`, `GardenGate`, `Lantern`, `Lattice`, `LatticeWithVine`, `StonePath`
  - **Water**: `LilyPad`, `Pond`, `Reeds`, `Stream`
  - **Weather**: `SnowfallLayer`, `Snowflake`, `SnowflakeFalling`
- **Seasonal Palette System**: Complete color palette with exports for `greens`, `bark`, `earth`, `natural`, `autumn`, `pinks`, `autumnReds`, `accents`, `winter`, `spring`, `springBlossoms`, `midnightBloom`
- **New CSS utility**: `.leaf-pattern` - elaborate vine background pattern with flowing vines, leaves, and ferns for organic atmosphere
- **Package export**: `@autumnsgrove/lattice/ui/nature` for importing all nature components

### Changed

- Add season prop to Logo component with summer as default
- Fix variant and season props in GlassLogo so accentColor no longer overrides them
- Default both Logo and GlassLogo components to summer colors (emerald green)
- Remove animate prop from Logo and GlassLogo components (breathing is now the primary animation)
- Redesign breathing animation to remove static center shape and allow bars to extend to overlap at center then spread apart radially
- Expand viewBox to provide room for top bar animation upward

### Breaking Changes

- **Import path change**: Nature components now imported from `@autumnsgrove/lattice/ui/nature` instead of local paths
- Components previously at `$lib/components/nature/*` should now use `import { ... } from '@autumnsgrove/lattice/ui/nature'`

## [0.7.0] - Previous Release

See git history for previous changes.
