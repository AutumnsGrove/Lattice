// GroveUI - Form Components
//
// This module exports specialized form input components
//
// Usage:
//   import { SearchInput, ContentSearch } from '@lattice/ui/forms';
//   import { createTextFilter, createMultiFieldFilter } from '@lattice/ui/forms';

export { default as SearchInput } from "./SearchInput.svelte";
export { default as ContentSearch } from "./ContentSearch.svelte";
export { default as TurnstileWidget } from "./TurnstileWidget.svelte";

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
  createDateFilter,
} from "./filterUtils.js";

export const FORMS_VERSION = "0.2.0";
