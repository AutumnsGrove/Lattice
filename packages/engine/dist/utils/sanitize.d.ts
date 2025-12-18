/**
 * Centralized sanitization utilities for XSS prevention
 *
 * Uses DOMPurify for client-side sanitization. On the server (SSR),
 * content is passed through unsanitized since it will be sanitized
 * when the page hydrates on the client.
 *
 * This approach avoids bundling jsdom (required by isomorphic-dompurify)
 * which doesn't work in Cloudflare Workers.
 */
/**
 * Sanitize HTML content to prevent XSS attacks
 * @param html - Raw HTML string to sanitize
 * @returns Sanitized HTML safe for rendering
 */
export declare function sanitizeHTML(html: string): string;
/**
 * Sanitize SVG content specifically (stricter rules for SVG)
 * @param svg - Raw SVG string to sanitize
 * @returns Sanitized SVG safe for rendering
 */
export declare function sanitizeSVG(svg: string): string;
/**
 * Sanitize markdown-generated HTML with appropriate security rules
 * This is a convenience wrapper for sanitizeHTML with markdown-specific settings
 * @param markdownHTML - HTML generated from markdown parsing
 * @returns Sanitized HTML safe for rendering
 */
export declare function sanitizeMarkdown(markdownHTML: string): string;
/**
 * Sanitize URL to prevent dangerous protocols
 * @param url - URL to sanitize
 * @returns Sanitized URL (returns empty string if dangerous)
 */
export declare function sanitizeURL(url: string): string;
