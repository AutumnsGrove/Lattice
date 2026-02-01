/**
 * Email Rendering Utilities
 *
 * Wraps @react-email/render with Grove-specific defaults
 * and utilities for generating both HTML and plain text.
 */
import { render as reactEmailRender } from "@react-email/render";
import type { ReactElement } from "react";

export interface RenderOptions {
  /** Generate plain text version alongside HTML */
  plainText?: boolean;
  /** Pretty-print the HTML output */
  pretty?: boolean;
}

export interface RenderResult {
  html: string;
  text?: string;
}

/**
 * Render a React Email component to HTML
 *
 * @example
 * ```tsx
 * import { render } from '@autumnsgrove/groveengine/email/render';
 * import { WelcomeEmail } from './WelcomeEmail';
 *
 * const { html, text } = await render(
 *   <WelcomeEmail name="Autumn" />,
 *   { plainText: true }
 * );
 * ```
 */
export async function render(
  email: ReactElement,
  options: RenderOptions = {},
): Promise<RenderResult> {
  const { plainText = false, pretty = false } = options;

  const html = await reactEmailRender(email, { pretty });

  if (!plainText) {
    return { html };
  }

  const text = await reactEmailRender(email, { plainText: true });
  return { html, text };
}

/**
 * Render only the HTML version (convenience function)
 */
export async function renderHtml(
  email: ReactElement,
  pretty = false,
): Promise<string> {
  return reactEmailRender(email, { pretty });
}

/**
 * Render only the plain text version (convenience function)
 */
export async function renderText(email: ReactElement): Promise<string> {
  return reactEmailRender(email, { plainText: true });
}

/**
 * Convert HTML to plain text (for custom HTML content)
 *
 * Strips tags, converts links to "text (url)" format,
 * and normalizes whitespace.
 */
export function htmlToPlainText(html: string): string {
  return (
    html
      // Convert links to "text (url)" format
      .replace(/<a[^>]+href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, "$2 ($1)")
      // Convert headers to uppercase with newlines
      .replace(/<h[1-6][^>]*>([^<]*)<\/h[1-6]>/gi, "\n$1\n")
      // Convert paragraphs to double newlines
      .replace(/<\/p>/gi, "\n\n")
      // Convert breaks to newlines
      .replace(/<br\s*\/?>/gi, "\n")
      // Convert list items to bullet points
      .replace(/<li[^>]*>/gi, "• ")
      .replace(/<\/li>/gi, "\n")
      // Strip remaining tags
      .replace(/<[^>]+>/g, "")
      // Decode common entities
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Normalize whitespace
      .replace(/\n\s*\n\s*\n/g, "\n\n")
      .trim()
  );
}
