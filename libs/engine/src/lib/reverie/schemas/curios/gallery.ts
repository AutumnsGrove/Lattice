import type { DomainSchema } from "../../types";

/**
 * Gallery — your visual portfolio.
 * Images organized, tagged, and displayed beautifully.
 */
export const gallerySchema: DomainSchema = {
	id: "curios.gallery",
	name: "Gallery",
	description:
		"Image gallery with collections, tags, and multiple layout options. Controls grid style, pagination, and display features.",
	group: "curios",
	database: "curios",
	readEndpoint: "GET /api/curios/gallery/config",
	writeEndpoint: "PUT /api/curios/gallery/config",
	writeMethod: "PUT",
	fields: {
		enabled: {
			type: "boolean",
			description: "Enable the gallery page",
			default: false,
		},
		galleryTitle: {
			type: "string",
			description: "Gallery page heading",
			constraints: { maxLength: 100 },
		},
		galleryDescription: {
			type: "string",
			description: "Introductory text shown above the gallery",
			constraints: { maxLength: 500 },
		},
		itemsPerPage: {
			type: "integer",
			description: "Number of images per page",
			default: 30,
			constraints: { min: 10, max: 100 },
		},
		sortOrder: {
			type: "enum",
			description: "How images are sorted",
			options: ["date-desc", "date-asc", "title-asc", "title-desc"],
			default: "date-desc",
		},
		showDescriptions: {
			type: "boolean",
			description: "Show per-image descriptions",
			default: true,
		},
		showDates: {
			type: "boolean",
			description: "Show upload dates",
			default: true,
		},
		showTags: {
			type: "boolean",
			description: "Show tag filter buttons",
			default: true,
		},
		enableLightbox: {
			type: "boolean",
			description: "Click to view images in a modal overlay",
			default: true,
		},
		enableSearch: {
			type: "boolean",
			description: "Show search bar for filtering images",
			default: true,
		},
		enableFilters: {
			type: "boolean",
			description: "Show category/tag filter UI",
			default: true,
		},
		gridStyle: {
			type: "enum",
			description: "Gallery layout pattern",
			options: ["masonry", "uniform", "mood-board"],
			default: "masonry",
		},
		thumbnailSize: {
			type: "enum",
			description: "Size of image thumbnails",
			options: ["small", "medium", "large"],
			default: "medium",
		},
		customCss: {
			type: "string",
			description: "Custom CSS for gallery styling",
			constraints: { maxLength: 10000 },
		},
	},
	examples: [
		"Enable my gallery",
		"Use a masonry grid layout",
		"Show 50 images per page",
		"Hide dates on gallery images",
		"Enable the lightbox viewer",
		"Switch to uniform grid",
	],
	keywords: ["gallery", "images", "photos", "pictures", "portfolio", "lightbox"],
};
