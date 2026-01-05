// GroveUI - Form Components
//
// This module exports specialized form input components
//
// Usage:
//   import { SearchInput, ContentSearch } from '@groveengine/ui/forms';
//   import { createTextFilter, createMultiFieldFilter } from '@groveengine/ui/forms';

export { default as SearchInput } from './SearchInput.svelte';
export { default as ContentSearch } from './ContentSearch.svelte';

// Filter utilities for ContentSearch
export {
	normalizeSearchText,
	includesNormalized,
	textIncludes,
	createTextFilter,
	createMultiFieldFilter,
	precomputeLowercaseFields,
	createFuzzyFilter,
	combineFilters,
	createDateFilter
} from './filterUtils.js';

export const FORMS_VERSION = '0.2.0';
