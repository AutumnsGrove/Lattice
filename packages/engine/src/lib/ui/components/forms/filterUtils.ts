/**
 * Common filter utilities for use with ContentSearch component
 * Part of the Grove UI design system
 *
 * @example
 * ```typescript
 * import { createTextFilter, createMultiFieldFilter } from '@autumnsgrove/groveengine';
 *
 * const filterPost = createTextFilter(['title', 'description']);
 * <ContentSearch items={posts} filterFn={filterPost} />
 * ```
 */

/**
 * Normalize text for searching (lowercase, trim)
 */
export function normalizeSearchText(text: string): string {
	return text.toLowerCase().trim();
}

/**
 * Check if normalized text includes a normalized query
 * Note: Both inputs should already be normalized via normalizeSearchText()
 *
 * @param normalizedText - Already normalized text to search in
 * @param normalizedQuery - Already normalized query to search for
 */
export function includesNormalized(normalizedText: string, normalizedQuery: string): boolean {
	return normalizedText.includes(normalizedQuery);
}

/**
 * Check if text includes a search query (case-insensitive)
 * This is a convenience function that normalizes both inputs
 *
 * @param text - Text to search in (will be normalized)
 * @param query - Query to search for (will be normalized)
 */
export function textIncludes(text: string, query: string): boolean {
	return normalizeSearchText(text).includes(normalizeSearchText(query));
}

/**
 * Create a filter function that searches multiple text fields
 *
 * @param fields - Array of field names to search
 * @returns Filter function for use with ContentSearch
 *
 * @example
 * ```typescript
 * const filterPost = createTextFilter(['title', 'description', 'author']);
 * <ContentSearch items={posts} filterFn={filterPost} />
 * ```
 */
export function createTextFilter<T extends Record<string, any>>(
	fields: (keyof T)[]
): (item: T, query: string) => boolean {
	return (item: T, query: string) => {
		const normalizedQuery = normalizeSearchText(query);
		return fields.some(field => {
			const value = item[field];
			if (typeof value === 'string') {
				// Use includesNormalized to avoid double normalization
				return includesNormalized(normalizeSearchText(value), normalizedQuery);
			}
			return false;
		});
	};
}

/**
 * Create a filter function that searches text fields and array fields (like tags)
 *
 * @param textFields - Array of text field names to search
 * @param arrayFields - Array of array field names to search (e.g., tags)
 * @returns Filter function for use with ContentSearch
 *
 * @example
 * ```typescript
 * const filterPost = createMultiFieldFilter(['title', 'description'], ['tags', 'categories']);
 * <ContentSearch items={posts} filterFn={filterPost} />
 * ```
 */
export function createMultiFieldFilter<T extends Record<string, any>>(
	textFields: (keyof T)[],
	arrayFields: (keyof T)[] = []
): (item: T, query: string) => boolean {
	return (item: T, query: string) => {
		const normalizedQuery = normalizeSearchText(query);

		// Check text fields
		const matchesText = textFields.some(field => {
			const value = item[field];
			if (typeof value === 'string') {
				// Use includesNormalized to avoid double normalization
				return includesNormalized(normalizeSearchText(value), normalizedQuery);
			}
			return false;
		});

		if (matchesText) return true;

		// Check array fields
		const matchesArray = arrayFields.some(field => {
			const value = item[field];
			if (Array.isArray(value)) {
				return value.some(item => {
					if (typeof item === 'string') {
						// Use includesNormalized to avoid double normalization
						return includesNormalized(normalizeSearchText(item), normalizedQuery);
					}
					return false;
				});
			}
			return false;
		});

		return matchesArray;
	};
}

/**
 * Pre-compute lowercase versions of searchable fields for performance
 *
 * Use this for large datasets to avoid repeated toLowerCase() calls during filtering.
 *
 * @param items - Array of items to optimize
 * @param fields - Fields to pre-compute lowercase versions of
 * @returns Array of items with lowercase fields added (suffixed with 'Lower')
 *
 * @example
 * ```typescript
 * const optimizedPosts = precomputeLowercaseFields(posts, ['title', 'description']);
 * // Creates: { ...post, titleLower: '...', descriptionLower: '...' }
 *
 * function filterPost(post, query) {
 *   const q = query.toLowerCase();
 *   return post.titleLower.includes(q) || post.descriptionLower.includes(q);
 * }
 * ```
 */
export function precomputeLowercaseFields<T extends Record<string, any>>(
	items: T[],
	fields: (keyof T)[]
): (T & Record<string, any>)[] {
	return items.map(item => {
		const computed: Record<string, any> = { ...item };

		fields.forEach(field => {
			const value = item[field];
			if (typeof value === 'string') {
				computed[`${String(field)}Lower`] = value.toLowerCase();
			} else if (Array.isArray(value)) {
				computed[`${String(field)}Lower`] = value.map(v =>
					typeof v === 'string' ? v.toLowerCase() : v
				);
			}
		});

		return computed as T & Record<string, any>;
	});
}

/**
 * Create a fuzzy filter that matches partial words
 *
 * @param fields - Array of field names to search
 * @param minMatchLength - Minimum length of query before fuzzy matching (default: 2)
 * @returns Filter function for use with ContentSearch
 *
 * @example
 * ```typescript
 * const filterPost = createFuzzyFilter(['title', 'description']);
 * // Matches: "jav" in "JavaScript", "scr" in "TypeScript"
 * ```
 */
export function createFuzzyFilter<T extends Record<string, any>>(
	fields: (keyof T)[],
	minMatchLength = 2
): (item: T, query: string) => boolean {
	return (item: T, query: string) => {
		if (query.length < minMatchLength) return true;

		const normalizedQuery = normalizeSearchText(query);

		return fields.some(field => {
			const value = item[field];
			if (typeof value === 'string') {
				const normalizedValue = normalizeSearchText(value);
				// Split into words and check if any word starts with the query
				const words = normalizedValue.split(/\s+/);
				return words.some(word => word.startsWith(normalizedQuery));
			}
			return false;
		});
	};
}

/**
 * Combine multiple filter functions with AND logic
 *
 * @param filters - Array of filter functions to combine
 * @returns Combined filter function
 *
 * @example
 * ```typescript
 * const hasTag = (item, tag) => item.tags.includes(tag);
 * const matchesText = createTextFilter(['title']);
 * const combinedFilter = combineFilters([matchesText, (item) => hasTag(item, 'featured')]);
 * ```
 */
export function combineFilters<T>(
	filters: Array<(item: T, query: string) => boolean>
): (item: T, query: string) => boolean {
	return (item: T, query: string) => {
		return filters.every(filter => filter(item, query));
	};
}

/**
 * Create a date range filter
 *
 * @param dateField - Field name containing the date
 * @param startDate - Start of date range (optional)
 * @param endDate - End of date range (optional)
 * @returns Filter function for use with ContentSearch
 *
 * @example
 * ```typescript
 * const recentPostsFilter = createDateFilter('publishedAt', new Date('2024-01-01'));
 * ```
 */
export function createDateFilter<T extends Record<string, any>>(
	dateField: keyof T,
	startDate?: Date,
	endDate?: Date
): (item: T, query: string) => boolean {
	// Date filters don't use the query string, but must match the filterFn signature
	return (item: T, _query: string) => {
		const dateValue = item[dateField];
		if (!dateValue) return false;

		const itemDate = new Date(dateValue);

		if (startDate && itemDate < startDate) return false;
		if (endDate && itemDate > endDate) return false;

		return true;
	};
}
