// @autumnsgrove/prism/icons
//
// THE consumer-facing entry point for all icons in Grove.
// Import from here — never from @lucide/svelte or adapters directly.
//
// import { stateIcons, navIcons, resolveIcon } from '@autumnsgrove/prism/icons'
//
// To swap icon packs: change which adapter this file wires to.
// Consumers never change.

// Resolved semantic icon maps (from the active adapter)
export {
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
	// Safe resolver — the icon trust boundary
	resolveIcon,
	resolveAnyIcon,
} from "./adapters/lucide.js";

// Manifest — the vocabulary (pure data, zero-dep)
export {
	ICON_MANIFEST,
	normalize,
	isIconKey,
	isGroupKey,
	getGroupKeys,
	getGroupNames,
	findKeyGroups,
	_resetKeyIndexes,
} from "./manifest.js";

// Types
export type {
	IconGroupName,
	IconGroupManifest,
	IconManifest,
	ResolvedIconMap,
	ResolveIconOptions,
} from "./types.js";
