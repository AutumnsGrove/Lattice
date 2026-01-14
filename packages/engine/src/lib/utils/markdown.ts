import { marked, type Tokens } from "marked";
import matter from "gray-matter";
import { sanitizeMarkdown } from "./sanitize.js";

// ============================================================================
// Type Definitions
// ============================================================================

/** Header extracted from markdown for table of contents */
export interface Header {
  level: number;
  text: string;
  id: string;
}

/**
 * Generate a URL-safe ID from header text.
 * This is used both by extractHeaders and heading renderers to ensure
 * the IDs in the TOC match the IDs in the generated HTML.
 */
export function generateHeadingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
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
    cta?: { text: string; link: string };
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
  [key: string]: unknown;
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
  owner: { name: string; email: string };
  site: { title: string; description: string; copyright: string };
  social: Record<string, string>;
}

/** Module map from import.meta.glob */
export type ModuleMap = Record<string, string>;

/** Gutter modules configuration */
export interface GutterModules {
  manifest: Record<string, GutterManifest | { default: GutterManifest }>;
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
  siteConfig?: Record<string, SiteConfig | { default: SiteConfig }>;
  postGutter?: Partial<GutterModules>;
  recipeGutter?: Partial<GutterModules>;
  recipeMetadata?: Record<string, unknown>;
  aboutGutter?: Partial<GutterModules>;
  homeGutter?: Partial<GutterModules>;
  contactGutter?: Partial<GutterModules>;
}

// ============================================================================
// Marked Configuration
// ============================================================================

// Configure marked renderer for GitHub-style code blocks
const renderer = new marked.Renderer();

renderer.code = function (token: Tokens.Code | string): string {
  // Handle both old (code, language) and new (token) API signatures
  const code = typeof token === "string" ? token : token.text;
  const language =
    typeof token === "string"
      ? (arguments as unknown as [string, string])[1]
      : token.lang;

  const lang = language || "text";

  // Render markdown/md code blocks as formatted HTML (like GitHub)
  if (lang === "markdown" || lang === "md") {
    // Parse the markdown content and render it
    // SECURITY: Sanitize recursively-rendered markdown to prevent XSS
    const renderedContent = sanitizeMarkdown(
      marked.parse(code, { async: false }) as string,
    );
    // Escape the raw markdown for the copy button
    const escapedCode = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

    return `<div class="rendered-markdown-block">
  <div class="rendered-markdown-header">
    <span class="rendered-markdown-label">Markdown</span>
    <button class="code-block-copy" aria-label="Copy markdown to clipboard" data-code="${escapedCode}">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5.75 4.75H10.25V1.75H5.75V4.75ZM5.75 4.75H2.75V14.25H10.25V11.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="5.75" y="4.75" width="7.5" height="9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="copy-text">Copy</span>
    </button>
  </div>
  <div class="rendered-markdown-content">
    ${renderedContent}
  </div>
</div>`;
  }

  const escapedCode = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  return `<div class="code-block-wrapper">
  <div class="code-block-header">
    <span class="code-block-language">${lang}</span>
    <button class="code-block-copy" aria-label="Copy code to clipboard" data-code="${escapedCode}">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5.75 4.75H10.25V1.75H5.75V4.75ZM5.75 4.75H2.75V14.25H10.25V11.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="5.75" y="4.75" width="7.5" height="9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="copy-text">Copy</span>
    </button>
  </div>
  <pre><code class="language-${lang}">${escapedCode}</code></pre>
</div>`;
};

marked.setOptions({
  renderer: renderer,
  gfm: true,
  breaks: false,
});

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validates if a string is a valid URL
 */
function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Extract headers from markdown content for table of contents
 */
export function extractHeaders(markdown: string): Header[] {
  const headers: Header[] = [];

  // Remove fenced code blocks before extracting headers
  // This prevents # comments inside code blocks from being treated as headers
  const markdownWithoutCodeBlocks = markdown.replace(/```[\s\S]*?```/g, "");

  const headerRegex = /^(#{1,6})\s+(.+)$/gm;

  let match;
  while ((match = headerRegex.exec(markdownWithoutCodeBlocks)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    // Use shared helper to generate ID - ensures consistency with heading renderers
    const id = generateHeadingId(text);

    headers.push({
      level,
      text,
      id,
    });
  }

  return headers;
}

/**
 * Process anchor tags in HTML content
 * Converts <!-- anchor:tagname --> comments to identifiable span elements
 */
export function processAnchorTags(html: string): string {
  // Convert <!-- anchor:tagname --> to <span class="anchor-marker" data-anchor="tagname"></span>
  // Supports alphanumeric characters, underscores, and hyphens in tag names
  return html.replace(
    /<!--\s*anchor:([\w-]+)\s*-->/g,
    (_match, tagname) =>
      `<span class="anchor-marker" data-anchor="${tagname}"></span>`,
  );
}

/**
 * Parse markdown content and convert to HTML
 * SECURITY: Now sanitizes output by default to prevent XSS
 */
export function parseMarkdownContent(markdownContent: string): ParsedContent {
  const { data, content: markdown } = matter(markdownContent);

  let htmlContent = marked.parse(markdown, { async: false }) as string;

  // Process anchor tags in the HTML content
  htmlContent = processAnchorTags(htmlContent);

  // SECURITY: Sanitize markdown-generated HTML to prevent XSS
  // This protects blog posts and recipes from malicious content
  htmlContent = sanitizeMarkdown(htmlContent);

  // Extract headers for table of contents
  const headers = extractHeaders(markdown);

  return {
    data: data as Frontmatter,
    content: htmlContent,
    headers,
    rawMarkdown: markdown,
  };
}

/**
 * Parse markdown content with sanitization (for user-facing pages like home, about, contact)
 */
export function parseMarkdownContentSanitized(
  markdownContent: string,
): ParsedContent {
  const { data, content: markdown } = matter(markdownContent);
  const htmlContent = sanitizeMarkdown(
    marked.parse(markdown, { async: false }) as string,
  );
  const headers = extractHeaders(markdown);

  return {
    data: data as Frontmatter,
    content: htmlContent,
    headers,
  };
}

/**
 * Get gutter content from provided modules
 * This is a utility function that processes gutter manifests, markdown, and images
 */
export function processGutterContent(
  slug: string,
  manifestModules: Record<string, GutterManifest | { default: GutterManifest }>,
  markdownModules: Record<string, string>,
  imageModules: Record<string, string>,
): GutterItem[] {
  // Find the manifest file for this page/post
  const manifestEntry = Object.entries(manifestModules).find(([filepath]) => {
    const parts = filepath.split("/");
    const folder = parts[parts.length - 3]; // Get the folder name
    return folder === slug;
  });

  if (!manifestEntry) {
    return [];
  }

  const manifestData = manifestEntry[1];
  const manifest: GutterManifest =
    "default" in manifestData ? manifestData.default : manifestData;

  if (!manifest.items || !Array.isArray(manifest.items)) {
    return [];
  }

  // Process each gutter item
  return manifest.items
    .map((item): GutterItem | null => {
      // Destructure to separate images from other properties
      // This ensures proper type handling when spreading
      const { images: rawImages, ...baseItem } = item;

      if (item.type === "comment" || item.type === "markdown") {
        // Find the markdown content file
        const mdEntry = Object.entries(markdownModules).find(([filepath]) => {
          return filepath.includes(`/${slug}/gutter/${item.file}`);
        });

        if (mdEntry) {
          const markdownContent = mdEntry[1];
          // SECURITY: Sanitize gutter markdown content to prevent XSS
          const htmlContent = sanitizeMarkdown(
            marked.parse(markdownContent, {
              async: false,
            }) as string,
          );

          return {
            ...baseItem,
            content: htmlContent,
          };
        }
      } else if (item.type === "photo" || item.type === "image") {
        // Check if file is an external URL
        if (item.file && isValidUrl(item.file)) {
          return {
            ...baseItem,
            src: item.file,
          };
        }

        // Find the local image file
        const imgEntry = Object.entries(imageModules).find(([filepath]) => {
          return filepath.includes(`/${slug}/gutter/${item.file}`);
        });

        if (imgEntry) {
          return {
            ...baseItem,
            src: imgEntry[1],
          };
        }
      } else if (item.type === "emoji") {
        // Emoji items can use URLs (local or CDN) or local files
        if (item.url) {
          // Direct URL (local path like /icons/instruction/mix.webp or CDN URL)
          return {
            ...baseItem,
            src: item.url,
          };
        } else if (item.file) {
          // Local file in gutter directory
          const imgEntry = Object.entries(imageModules).find(([filepath]) => {
            return filepath.includes(`/${slug}/gutter/${item.file}`);
          });

          if (imgEntry) {
            return {
              ...baseItem,
              src: imgEntry[1],
            };
          }
        }
        return baseItem;
      } else if (item.type === "gallery") {
        /**
         * Process gallery items containing multiple images
         *
         * Galleries can contain:
         * - External URLs (validated for http/https protocol)
         * - Local files (resolved from the gutter directory)
         *
         * Images that fail to resolve (invalid URLs or missing files) are filtered out.
         * If all images fail to resolve, the entire gallery item is excluded.
         */
        const originalImageCount = (rawImages || []).length;
        const images: GalleryImage[] = (rawImages || [])
          .map((img): GalleryImage | null => {
            // Check if it's an external URL
            if (img.url) {
              // Validate URL format to prevent malformed URLs from failing silently
              if (!isValidUrl(img.url)) {
                console.warn(
                  `Invalid URL in gallery for "${slug}": ${img.url}`,
                );
                return null;
              }
              return {
                url: img.url,
                alt: img.alt || "",
                caption: img.caption || "",
              };
            }

            // Otherwise, look for local file
            if (img.file) {
              const imgEntry = Object.entries(imageModules).find(
                ([filepath]) => {
                  return filepath.includes(`/${slug}/gutter/${img.file}`);
                },
              );

              if (imgEntry) {
                return {
                  url: imgEntry[1],
                  alt: img.alt || "",
                  caption: img.caption || "",
                };
              } else {
                console.warn(
                  `Local file not found in gallery for "${slug}": ${img.file}`,
                );
              }
            }

            return null;
          })
          .filter((img): img is GalleryImage => img !== null);

        if (images.length > 0) {
          return {
            ...baseItem,
            images,
          };
        } else if (originalImageCount > 0) {
          // All images failed to resolve - log warning for debugging
          console.warn(
            `Gallery in "${slug}" has ${originalImageCount} image(s) defined but none could be resolved`,
          );
        }
      }

      return baseItem;
    })
    .filter(
      (item): item is GutterItem =>
        item !== null &&
        (!!item.content ||
          !!item.src ||
          !!item.images ||
          item.type === "emoji"),
    );
}

/**
 * Process a list of markdown files into post/recipe objects
 */
export function processMarkdownModules(modules: ModuleMap): PostMeta[] {
  try {
    const items = Object.entries(modules)
      .map(([filepath, content]): PostMeta | null => {
        try {
          // Extract slug from filepath: /path/to/Posts/example.md -> example
          const filename = filepath.split("/").pop();
          if (!filename) return null;
          const slug = filename.replace(".md", "");
          const { data } = matter(content);

          return {
            slug,
            title: (data.title as string) || "Untitled",
            date: (data.date as string) || new Date().toISOString(),
            tags: (data.tags as string[]) || [],
            description: (data.description as string) || "",
          };
        } catch (err) {
          console.error(`Error processing file ${filepath}:`, err);
          return null;
        }
      })
      .filter((item): item is PostMeta => item !== null)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return items;
  } catch (err) {
    console.error("Error in processMarkdownModules:", err);
    return [];
  }
}

/**
 * Get a single item by slug from modules
 */
export function getItemBySlug(
  slug: string,
  modules: ModuleMap,
  options: GetItemOptions = {},
): Post | null {
  // Find the matching module by slug
  const entry = Object.entries(modules).find(([filepath]) => {
    const filename = filepath.split("/").pop();
    if (!filename) return false;
    const fileSlug = filename.replace(".md", "");
    return fileSlug === slug;
  });

  if (!entry) {
    return null;
  }

  const rawContent = entry[1];
  const { data, content, headers } = parseMarkdownContent(rawContent);

  // Build the result object
  const result: Post = {
    slug,
    title: data.title || "Untitled",
    date: data.date || new Date().toISOString(),
    tags: data.tags || [],
    description: data.description || "",
    content,
    headers,
  };

  // Process gutter content if provided
  if (options.gutterModules?.manifest) {
    const { manifest, markdown = {}, images = {} } = options.gutterModules;
    result.gutterContent = processGutterContent(
      slug,
      manifest,
      markdown,
      images,
    );
  }

  // Process sidecar/metadata if provided (for recipes)
  if (options.sidecarModules) {
    const sidecarEntry = Object.entries(options.sidecarModules).find(
      ([filepath]) => {
        const parts = filepath.split("/");
        const folder = parts[parts.length - 3]; // Get the folder name
        return folder === slug;
      },
    );

    if (sidecarEntry) {
      const sidecarData = sidecarEntry[1] as { default?: unknown } | unknown;
      result.sidecar =
        typeof sidecarData === "object" &&
        sidecarData !== null &&
        "default" in sidecarData
          ? sidecarData.default
          : sidecarData;
    }
  }

  return result;
}

/**
 * Get a page (home, about, contact) by filename from modules
 * Uses sanitization for security
 */
export function getPageByFilename(
  filename: string,
  modules: ModuleMap,
  options: GetPageOptions = {},
): Page | null {
  try {
    // Find the matching file
    const entry = Object.entries(modules).find(([filepath]) => {
      return filepath.includes(filename);
    });

    if (!entry) {
      return null;
    }

    const rawContent = entry[1];
    const { data, content, headers } =
      parseMarkdownContentSanitized(rawContent);
    const slug = options.slug || filename.replace(".md", "");

    // Build the result object
    const result: Page = {
      slug,
      title: data.title || slug.charAt(0).toUpperCase() + slug.slice(1),
      description: data.description || "",
      content,
      headers,
    };

    // Add optional fields from frontmatter
    if (data.date) result.date = data.date;
    if (data.hero) result.hero = data.hero;
    if (data.galleries) result.galleries = data.galleries;

    // Process gutter content if provided
    if (options.gutterModules?.manifest) {
      const { manifest, markdown = {}, images = {} } = options.gutterModules;
      result.gutterContent = processGutterContent(
        slug,
        manifest,
        markdown,
        images,
      );
    }

    return result;
  } catch (err) {
    console.error(`Error in getPageByFilename for ${filename}:`, err);
    return null;
  }
}

/**
 * Get site configuration from a config module
 */
export function getSiteConfigFromModule(
  configModule: Record<string, SiteConfig | { default: SiteConfig }>,
): SiteConfig {
  const entry = Object.entries(configModule)[0];
  if (entry) {
    const config = entry[1];
    return "default" in config ? config.default : config;
  }
  return {
    owner: { name: "Admin", email: "" },
    site: { title: "The Grove", description: "", copyright: "AutumnsGrove" },
    social: {},
  };
}

/**
 * Create a configured content loader with all functions bound to the provided modules
 * This is the main factory function for creating a content loader in the consuming app
 */
export function createContentLoader(
  config: ContentLoaderConfig,
): ContentLoader {
  const {
    posts = {},
    recipes = {},
    about = {},
    home = {},
    contact = {},
    siteConfig = {},
    postGutter = {},
    recipeGutter = {},
    recipeMetadata = {},
    aboutGutter = {},
    homeGutter = {},
    contactGutter = {},
  } = config;

  const loader: ContentLoader = {
    /**
     * Get all posts with metadata
     */
    getAllPosts() {
      return processMarkdownModules(posts);
    },

    /**
     * Get all recipes with metadata
     */
    getAllRecipes() {
      return processMarkdownModules(recipes);
    },

    /**
     * Get the latest (most recent) post with full content
     */
    getLatestPost() {
      const allPosts = processMarkdownModules(posts);
      if (allPosts.length === 0) {
        return null;
      }
      return loader.getPostBySlug(allPosts[0].slug);
    },

    /**
     * Get a single post by slug
     */
    getPostBySlug(slug: string) {
      return getItemBySlug(slug, posts, {
        gutterModules: postGutter.manifest
          ? (postGutter as GutterModules)
          : undefined,
      });
    },

    /**
     * Get a single recipe by slug
     */
    getRecipeBySlug(slug: string) {
      return getItemBySlug(slug, recipes, {
        gutterModules: recipeGutter.manifest
          ? (recipeGutter as GutterModules)
          : undefined,
        sidecarModules: recipeMetadata,
      });
    },

    /**
     * Get the home page content
     */
    getHomePage() {
      return getPageByFilename("home.md", home, {
        gutterModules: homeGutter.manifest
          ? (homeGutter as GutterModules)
          : undefined,
        slug: "home",
      });
    },

    /**
     * Get the about page content
     */
    getAboutPage() {
      return getPageByFilename("about.md", about, {
        gutterModules: aboutGutter.manifest
          ? (aboutGutter as GutterModules)
          : undefined,
        slug: "about",
      });
    },

    /**
     * Get the contact page content
     */
    getContactPage() {
      return getPageByFilename("contact.md", contact, {
        gutterModules: contactGutter.manifest
          ? (contactGutter as GutterModules)
          : undefined,
        slug: "contact",
      });
    },

    /**
     * Get the site configuration
     */
    getSiteConfig() {
      return getSiteConfigFromModule(siteConfig);
    },

    /**
     * Get gutter content for a post
     */
    getGutterContent(slug: string) {
      if (!postGutter.manifest) return [];
      return processGutterContent(
        slug,
        postGutter.manifest,
        postGutter.markdown || {},
        postGutter.images || {},
      );
    },

    /**
     * Get gutter content for a recipe
     */
    getRecipeGutterContent(slug: string) {
      if (!recipeGutter.manifest) return [];
      return processGutterContent(
        slug,
        recipeGutter.manifest,
        recipeGutter.markdown || {},
        recipeGutter.images || {},
      );
    },

    /**
     * Get gutter content for the home page
     */
    getHomeGutterContent(slug: string) {
      if (!homeGutter.manifest) return [];
      return processGutterContent(
        slug,
        homeGutter.manifest,
        homeGutter.markdown || {},
        homeGutter.images || {},
      );
    },

    /**
     * Get gutter content for the about page
     */
    getAboutGutterContent(slug: string) {
      if (!aboutGutter.manifest) return [];
      return processGutterContent(
        slug,
        aboutGutter.manifest,
        aboutGutter.markdown || {},
        aboutGutter.images || {},
      );
    },

    /**
     * Get gutter content for the contact page
     */
    getContactGutterContent(slug: string) {
      if (!contactGutter.manifest) return [];
      return processGutterContent(
        slug,
        contactGutter.manifest,
        contactGutter.markdown || {},
        contactGutter.images || {},
      );
    },

    /**
     * Get recipe sidecar/metadata by slug
     */
    getRecipeSidecar(slug: string) {
      const entry = Object.entries(recipeMetadata).find(([filepath]) => {
        const parts = filepath.split("/");
        const folder = parts[parts.length - 3];
        return folder === slug;
      });

      if (!entry) {
        return null;
      }

      const data = entry[1] as { default?: unknown } | unknown;
      return typeof data === "object" && data !== null && "default" in data
        ? data.default
        : data;
    },
  };

  return loader;
}

// ============================================================================
// Global Content Loader Registry
// ============================================================================

/**
 * Registry for site-specific content loaders
 * Sites must register their content loaders using registerContentLoader()
 */
let contentLoader: ContentLoader | null = null;

/**
 * Register a content loader for the site
 * This should be called by the consuming site to provide access to content
 */
export function registerContentLoader(loader: ContentLoader): void {
  contentLoader = loader;
}

/**
 * Get all blog posts
 */
export function getAllPosts(): PostMeta[] {
  if (!contentLoader || !contentLoader.getAllPosts) {
    console.warn(
      "getAllPosts: No content loader registered. Call registerContentLoader() in your site.",
    );
    return [];
  }
  return contentLoader.getAllPosts();
}

/**
 * Get site configuration
 */
export function getSiteConfig(): SiteConfig {
  if (!contentLoader || !contentLoader.getSiteConfig) {
    console.warn(
      "getSiteConfig: No content loader registered. Call registerContentLoader() in your site.",
    );
    return {
      owner: { name: "Admin", email: "" },
      site: { title: "GroveEngine Site", description: "", copyright: "" },
      social: {},
    };
  }
  return contentLoader.getSiteConfig();
}

/**
 * Get the latest post
 */
export function getLatestPost(): Post | null {
  if (!contentLoader || !contentLoader.getLatestPost) {
    console.warn(
      "getLatestPost: No content loader registered. Call registerContentLoader() in your site.",
    );
    return null;
  }
  return contentLoader.getLatestPost();
}

/**
 * Get home page content
 */
export function getHomePage(): Page | null {
  if (!contentLoader || !contentLoader.getHomePage) {
    console.warn(
      "getHomePage: No content loader registered. Call registerContentLoader() in your site.",
    );
    return null;
  }
  return contentLoader.getHomePage();
}

/**
 * Get a post by its slug
 */
export function getPostBySlug(slug: string): Post | null {
  if (!contentLoader || !contentLoader.getPostBySlug) {
    console.warn(
      "getPostBySlug: No content loader registered. Call registerContentLoader() in your site.",
    );
    return null;
  }
  return contentLoader.getPostBySlug(slug);
}

/**
 * Get about page content
 */
export function getAboutPage(): Page | null {
  if (!contentLoader || !contentLoader.getAboutPage) {
    console.warn(
      "getAboutPage: No content loader registered. Call registerContentLoader() in your site.",
    );
    return null;
  }
  return contentLoader.getAboutPage();
}

/**
 * Get contact page content
 */
export function getContactPage(): Page | null {
  if (!contentLoader || !contentLoader.getContactPage) {
    console.warn(
      "getContactPage: No content loader registered. Call registerContentLoader() in your site.",
    );
    return null;
  }
  return contentLoader.getContactPage();
}

/**
 * Get all recipes
 */
export function getAllRecipes(): PostMeta[] {
  if (!contentLoader || !contentLoader.getAllRecipes) {
    console.warn(
      "getAllRecipes: No content loader registered. Call registerContentLoader() in your site.",
    );
    return [];
  }
  return contentLoader.getAllRecipes();
}

/**
 * Get a recipe by its slug
 */
export function getRecipeBySlug(slug: string): Post | null {
  if (!contentLoader || !contentLoader.getRecipeBySlug) {
    console.warn(
      "getRecipeBySlug: No content loader registered. Call registerContentLoader() in your site.",
    );
    return null;
  }
  return contentLoader.getRecipeBySlug(slug);
}
