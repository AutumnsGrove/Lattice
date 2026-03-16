// GroveUI - Icon Components
//
// Custom SVG components + Prism icon gateway re-exports.
//
// Usage:
//   import { Icons, IconLegend } from '@autumnsgrove/lattice/ui/icons';
//   import { stateIcons, navIcons } from '@autumnsgrove/lattice/ui/icons';

// Custom SVG components
export { default as Icons } from "./Icons.svelte";
export { default as IconLegend } from "./IconLegend.svelte";
export { default as BlueSky } from "./BlueSky.svelte";

// Prism icon gateway — the SSOT for all icon identity
export {
	// Semantic icon maps
	navIcons,
	stateIcons,
	natureIcons,
	seasonIcons,
	actionIcons,
	featureIcons,
	authIcons,
	metricIcons,
	phaseIcons,
	toolIcons,
	blazeIcons,
	chromeIcons,
	allIcons,
	// Lookup utilities
	getIcon,
	getIconFromAll,
	// Safe resolver (resolveIcon omitted — re-exported from groveicon/resolver)
	resolveAnyIcon,
	// Manifest utilities
	isIconKey,
	isGroupKey,
	normalize,
	ICON_MANIFEST,
	getGroupKeys,
	getGroupNames,
	findKeyGroups,
} from "@autumnsgrove/prism/icons";

// Re-export types
export type { IconGroupName, IconGroupManifest } from "@autumnsgrove/prism/icons";
