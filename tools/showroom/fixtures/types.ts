/**
 * Showroom fixture type definitions.
 *
 * Each component can have a companion .showroom.ts file that exports
 * named scenarios with pre-built props for rendering in isolation.
 */

export interface ShowroomScenario {
	/** Props to pass to the component for this scenario. */
	props: Record<string, unknown>;

	/** Optional viewport override for this specific scenario. */
	viewport?: { width: number; height: number };

	/** Optional background override: 'surface' | 'accent' | 'dark' | 'transparent'. */
	background?: string;

	/** Human-readable description of what this scenario demonstrates. */
	description?: string;
}

export interface ShowroomFixture {
	/** Component-level viewport default (overrides global default). */
	viewport?: { width: number; height: number };

	/** Component-level background default. */
	background?: string;

	/** Named scenarios, each with their own props and optional overrides. */
	scenarios: Record<string, ShowroomScenario>;
}
