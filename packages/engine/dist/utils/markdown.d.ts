/** Header extracted from markdown for table of contents */
export interface Header {
    level: number;
    text: string;
    id: string;
}
/** Frontmatter data from markdown files */
export interface Frontmatter {
    title?: string;
    date?: string;
    tags?: string[];
    description?: string;
    hero?: {
        title?: string;
        subtitle?: string;
        cta?: {
            text: string;
            link: string;
        };
    };
    galleries?: unknown[];
    [key: string]: unknown;
}
/** Parsed markdown content result */
export interface ParsedContent {
    data: Frontmatter;
    content: string;
    headers: Header[];
    rawMarkdown?: string;
}
/** Image in a gallery */
export interface GalleryImage {
    url: string;
    alt: string;
    caption: string;
}
/** Base gutter item */
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
}
/** Processed gutter item with resolved content */
export interface GutterItem extends GutterItemBase {
    content?: string;
    src?: string;
    images?: GalleryImage[];
}
/** Gutter manifest structure */
export interface GutterManifest {
    items: GutterItemBase[];
}
/** Post/Recipe metadata */
export interface PostMeta {
    slug: string;
    title: string;
    date: string;
    tags: string[];
    description: string;
}
/** Full post/recipe with content */
export interface Post extends PostMeta {
    content: string;
    headers: Header[];
    gutterContent?: GutterItem[];
    sidecar?: unknown;
}
/** Page content (home, about, contact) */
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
/** Site configuration */
export interface SiteConfig {
    owner: {
        name: string;
        email: string;
    };
    site: {
        title: string;
        description: string;
        copyright: string;
    };
    social: Record<string, string>;
}
/** Module map from import.meta.glob */
export type ModuleMap = Record<string, string>;
/** Gutter modules configuration */
export interface GutterModules {
    manifest: Record<string, GutterManifest | {
        default: GutterManifest;
    }>;
    markdown?: Record<string, string>;
    images?: Record<string, string>;
}
/** Options for getItemBySlug */
export interface GetItemOptions {
    gutterModules?: GutterModules;
    sidecarModules?: Record<string, unknown>;
}
/** Options for getPageByFilename */
export interface GetPageOptions {
    gutterModules?: GutterModules;
    slug?: string;
}
/** Content loader interface */
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
/** Content loader configuration */
export interface ContentLoaderConfig {
    posts?: ModuleMap;
    recipes?: ModuleMap;
    about?: ModuleMap;
    home?: ModuleMap;
    contact?: ModuleMap;
    siteConfig?: Record<string, SiteConfig | {
        default: SiteConfig;
    }>;
    postGutter?: Partial<GutterModules>;
    recipeGutter?: Partial<GutterModules>;
    recipeMetadata?: Record<string, unknown>;
    aboutGutter?: Partial<GutterModules>;
    homeGutter?: Partial<GutterModules>;
    contactGutter?: Partial<GutterModules>;
}
/**
 * Extract headers from markdown content for table of contents
 */
export declare function extractHeaders(markdown: string): Header[];
/**
 * Process anchor tags in HTML content
 * Converts <!-- anchor:tagname --> comments to identifiable span elements
 */
export declare function processAnchorTags(html: string): string;
/**
 * Parse markdown content and convert to HTML
 */
export declare function parseMarkdownContent(markdownContent: string): ParsedContent;
/**
 * Parse markdown content with sanitization (for user-facing pages like home, about, contact)
 */
export declare function parseMarkdownContentSanitized(markdownContent: string): ParsedContent;
/**
 * Get gutter content from provided modules
 * This is a utility function that processes gutter manifests, markdown, and images
 */
export declare function processGutterContent(slug: string, manifestModules: Record<string, GutterManifest | {
    default: GutterManifest;
}>, markdownModules: Record<string, string>, imageModules: Record<string, string>): GutterItem[];
/**
 * Process a list of markdown files into post/recipe objects
 */
export declare function processMarkdownModules(modules: ModuleMap): PostMeta[];
/**
 * Get a single item by slug from modules
 */
export declare function getItemBySlug(slug: string, modules: ModuleMap, options?: GetItemOptions): Post | null;
/**
 * Get a page (home, about, contact) by filename from modules
 * Uses sanitization for security
 */
export declare function getPageByFilename(filename: string, modules: ModuleMap, options?: GetPageOptions): Page | null;
/**
 * Get site configuration from a config module
 */
export declare function getSiteConfigFromModule(configModule: Record<string, SiteConfig | {
    default: SiteConfig;
}>): SiteConfig;
/**
 * Create a configured content loader with all functions bound to the provided modules
 * This is the main factory function for creating a content loader in the consuming app
 */
export declare function createContentLoader(config: ContentLoaderConfig): ContentLoader;
/**
 * Register a content loader for the site
 * This should be called by the consuming site to provide access to content
 */
export declare function registerContentLoader(loader: ContentLoader): void;
/**
 * Get all blog posts
 */
export declare function getAllPosts(): PostMeta[];
/**
 * Get site configuration
 */
export declare function getSiteConfig(): SiteConfig;
/**
 * Get the latest post
 */
export declare function getLatestPost(): Post | null;
/**
 * Get home page content
 */
export declare function getHomePage(): Page | null;
/**
 * Get a post by its slug
 */
export declare function getPostBySlug(slug: string): Post | null;
/**
 * Get about page content
 */
export declare function getAboutPage(): Page | null;
/**
 * Get contact page content
 */
export declare function getContactPage(): Page | null;
/**
 * Get all recipes
 */
export declare function getAllRecipes(): PostMeta[];
/**
 * Get a recipe by its slug
 */
export declare function getRecipeBySlug(slug: string): Post | null;
