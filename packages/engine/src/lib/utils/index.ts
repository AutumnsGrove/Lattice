// Utils barrel export
// Re-exports all utility functions from the utils module

export * from './api.js';
export * from './cn.js';
export * from './csrf.js';
export * from './debounce.js';

// Gallery - explicit exports to avoid ambiguity
export {
  parseImageFilename,
  getImageTitle,
  getImageDate,
  searchImages,
  filterImagesByDateRange,
  filterImagesByTags,
  filterImagesByCategory,
  getAvailableYears,
  getAvailableCategories,
  type GalleryImage,
  type ImageTag,
  type ParsedImageMetadata
} from './gallery.js';

// Gutter - explicit exports to avoid ambiguity
export {
  parseAnchor,
  getAnchorKey,
  getUniqueAnchors,
  getAnchorLabel,
  getItemsForAnchor,
  getOrphanItems,
  findAnchorElement,
  type AnchorType,
  type ParsedAnchor,
  type Header,
  type GutterItem
} from './gutter.js';

export * from './imageProcessor.js';
export * from './json.js';
export * from './markdown.js';
export * from './sanitize.js';
export * from './validation.js';
