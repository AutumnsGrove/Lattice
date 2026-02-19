/**
 * Terrarium Configuration
 *
 * Central configuration for the Terrarium creative canvas.
 * All limits, constraints, and settings in one place.
 */

export const TERRARIUM_CONFIG = {
	// Scene constraints
	scene: {
		maxNameLength: 100,
		maxSizeBytes: 1_000_000, // 1MB JSON
	},

	// Complexity budget system (replaces hard asset limit)
	// Total complexity cannot exceed maxComplexity
	complexity: {
		maxComplexity: 200,
		weights: {
			animated: 5, // Animated assets cost 5 points
			scaled: 2, // Scale > 1.5 or < 0.5 costs 2 points
			normal: 1, // Standard assets cost 1 point
		},
		warningThreshold: 0.8, // Warn at 80% budget
	},

	// Canvas constraints
	canvas: {
		maxWidth: 4000,
		maxHeight: 4000,
		minWidth: 200,
		minHeight: 200,
		defaultWidth: 1200,
		defaultHeight: 800,
		gridSizes: [16, 32, 64] as const,
		defaultGridSize: 32,
	},

	// Asset constraints
	asset: {
		maxScale: 5,
		minScale: 0.1,
		defaultScale: 1,
	},

	// Storage limits (per tier)
	storage: {
		backend: "indexeddb" as const,
		dbName: "terrarium",
		dbVersion: 1,
		maxSavedScenes: {
			free: 0,
			seedling: 5,
			sapling: 20,
			oak: 100,
			evergreen: Infinity,
		},
		maxDecorationsPerZone: {
			free: 0,
			seedling: 1,
			sapling: 3,
			oak: Infinity,
			evergreen: Infinity,
		},
	},

	// Export settings
	export: {
		maxWidth: 4096,
		maxHeight: 4096,
		defaultScale: 2, // 2x for retina
		format: "png" as const,
		expectedTimeMs: { min: 1000, typical: 5000, max: 10000 },
	},

	// Auto-save settings
	autoSave: {
		enabled: true,
		debounceMs: 2000, // Wait 2s after last change
		maxIntervalMs: 30000, // Force save every 30s during activity
		showIndicator: true, // Show "Saving..." indicator
	},

	// Zone constraints for Foliage integration
	zones: {
		header: {
			recommendedAspectRatio: [16, 3] as [number, number],
			maxHeight: 200,
			fitBehavior: "scale" as const,
		},
		sidebar: {
			recommendedAspectRatio: [1, 2] as [number, number],
			maxHeight: 400,
			fitBehavior: "scale" as const,
		},
		footer: {
			recommendedAspectRatio: [16, 2] as [number, number],
			maxHeight: 150,
			fitBehavior: "scale" as const,
		},
		background: {
			recommendedAspectRatio: null,
			maxHeight: null,
			fitBehavior: "cover" as const,
		},
	},

	// Performance
	performance: {
		targetFPS: 60,
		maxAnimatedAssets: 20, // Warning threshold
		dragThrottleMs: 16, // One frame
	},

	// Phase 1 starter assets (10 components)
	// Note: All components must exist in libs/engine/src/lib/ui/components/nature/
	starterAssets: [
		"TreeAspen",
		"TreeBirch",
		"Lattice",
		"LatticeWithVine",
		"Lantern",
		"Butterfly",
		"Firefly",
		"Mushroom",
		"Rock",
		"Vine",
	] as const,

	// Magic numbers centralized for maintainability
	ui: {
		duplicateOffset: 20, // Pixels to offset duplicated assets
		exportWaitMs: 150, // Wait time for animations to pause before export
		filenameMaxLength: 100, // Max sanitized filename length
	},
} as const;

export type TerrariumConfig = typeof TERRARIUM_CONFIG;
export type GridSize = (typeof TERRARIUM_CONFIG.canvas.gridSizes)[number];
export type DecorationZone = keyof typeof TERRARIUM_CONFIG.zones;
export type UserTier = keyof typeof TERRARIUM_CONFIG.storage.maxSavedScenes;
