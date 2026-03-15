// @autumnsgrove/prism/icons
//
// The icon vocabulary — zero dependencies. Defines semantic groups, aliases,
// type guards, and normalizer. No icon components here — those live in adapters.
//
// import { isIconKey, isGroupKey, normalize, ICON_MANIFEST } from '@autumnsgrove/prism/icons'

// Manifest — the vocabulary
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
