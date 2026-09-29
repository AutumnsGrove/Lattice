export interface Header {
	level: number;
	text: string;
	id: string;
	/** Nesting relative to the nearest shallower heading; dividers reset it to 0 */
	depth?: number;
}

export interface Frontmatter {
	title?: string;
	date?: string;
	tags?: string[];
	description?: string;
	hero?: {
		title?: string;
		subtitle?: string;
		cta?: { text: string; link: string };
	};
	galleries?: unknown[];
	[key: string]: unknown;
}

export interface ParsedContent {
	data: Frontmatter;
	content: string;
	headers: Header[];
	rawMarkdown?: string;
}

export interface GalleryImage {
	url: string;
	alt: string;
	caption: string;
}

export interface GutterItemBase {
	type: string;
	anchor?: string;
	file?: string;
	url?: string;
	alt?: string;
	caption?: string;
	images?: Array<{
		url?: string;
		file?: string;
		alt?: string;
		caption?: string;
	}>;
	embedUrl?: string;
	embedProvider?: string;
}

export interface GutterItem extends GutterItemBase {
	content?: string;
	src?: string;
	images?: GalleryImage[];
	embedHtml?: string;
	embedThumbnail?: string;
	embedTitle?: string;
}

export interface GutterManifest {
	items: GutterItemBase[];
}

export interface PostMeta {
	slug: string;
	title: string;
	date: string;
	tags: string[];
	description: string;
	featured_image?: string;
}

export interface Post extends PostMeta {
	content: string;
	headers: Header[];
	gutterContent?: GutterItem[];
	sidecar?: unknown;
}

export interface Page {
	slug: string;
	title: string;
	description: string;
	content: string;
	headers: Header[];
	date?: string;
	hero?: Frontmatter["hero"];
	galleries?: unknown[];
	gutterContent?: GutterItem[];
}

export interface SiteConfig {
	owner: { name: string; email: string };
	site: { title: string; description: string; copyright: string };
	social: Record<string, string>;
}

export type ModuleMap = Record<string, string>;

export interface GutterModules {
	manifest: Record<string, GutterManifest | { default: GutterManifest }>;
	markdown?: Record<string, string>;
	images?: Record<string, string>;
}

export interface GetItemOptions {
	gutterModules?: GutterModules;
	sidecarModules?: Record<string, unknown>;
}

export interface GetPageOptions {
	gutterModules?: GutterModules;
	slug?: string;
}

export interface ContentLoader {
	getAllPosts(): PostMeta[];
	getAllRecipes(): PostMeta[];
	getLatestPost(): Post | null;
	getPostBySlug(slug: string): Post | null;
	getRecipeBySlug(slug: string): Post | null;
	getHomePage(): Page | null;
	getAboutPage(): Page | null;
	getContactPage(): Page | null;
	getSiteConfig(): SiteConfig;
	getGutterContent(slug: string): GutterItem[];
	getRecipeGutterContent(slug: string): GutterItem[];
	getHomeGutterContent(slug: string): GutterItem[];
	getAboutGutterContent(slug: string): GutterItem[];
	getContactGutterContent(slug: string): GutterItem[];
	getRecipeSidecar(slug: string): unknown;
}

export interface ContentLoaderConfig {
	posts?: ModuleMap;
	recipes?: ModuleMap;
	about?: ModuleMap;
	home?: ModuleMap;
	contact?: ModuleMap;
	siteConfig?: Record<string, SiteConfig | { default: SiteConfig }>;
	postGutter?: Partial<GutterModules>;
	recipeGutter?: Partial<GutterModules>;
	recipeMetadata?: Record<string, unknown>;
	aboutGutter?: Partial<GutterModules>;
	homeGutter?: Partial<GutterModules>;
	contactGutter?: Partial<GutterModules>;
}
