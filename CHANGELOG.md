# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
- **Package export**: `@autumnsgrove/groveengine/ui/nature` for importing all nature components

### Changed
- Add season prop to Logo component with summer as default
- Fix variant and season props in GlassLogo so accentColor no longer overrides them
- Default both Logo and GlassLogo components to summer colors (emerald green)
- Remove animate prop from Logo and GlassLogo components (breathing is now the primary animation)
- Redesign breathing animation to remove static center shape and allow bars to extend to overlap at center then spread apart radially
- Expand viewBox to provide room for top bar animation upward

### Breaking Changes
- **Import path change**: Nature components now imported from `@autumnsgrove/groveengine/ui/nature` instead of local paths
- Components previously at `$lib/components/nature/*` should now use `import { ... } from '@autumnsgrove/groveengine/ui/nature'`

## [0.7.0] - Previous Release

See git history for previous changes.
