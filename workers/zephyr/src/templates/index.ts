/**
 * Template Registry
 *
 * Maps template names to render functions.
 * Supports both named templates and "raw" for pre-rendered content.
 */

import type { TemplateRenderFn } from "../types";

/**
 * Template registry
 *
 * Templates are rendered by the email-render worker.
 * This registry maps template names to their rendering logic.
 */
export const TEMPLATES: Record<string, TemplateRenderFn> = {
  // Raw template - use pre-rendered HTML/text
  raw: async (data) => {
    const html = data.html as string;
    const text = data.text as string;
    const subject = data.subject as string;

    if (!html && !text) {
      throw new Error("Raw template requires html or text");
    }
    if (!subject) {
      throw new Error("Raw template requires subject");
    }

    return {
      html: html || text!,
      text: text || html!,
      subject,
    };
  },
};

/**
 * Render a template
 *
 * For named templates, calls the email-render worker.
 * For "raw" template, returns pre-rendered content.
 */
export async function renderTemplate(
  templateName: string,
  data: Record<string, unknown>,
  renderUrl: string,
  rawHtml?: string,
  rawText?: string,
  rawSubject?: string,
): Promise<{ html: string; text: string; subject: string }> {
  // Handle raw template
  if (templateName === "raw") {
    if (!rawHtml && !rawText) {
      throw new Error("Raw template requires html or text");
    }
    if (!rawSubject) {
      throw new Error("Raw template requires subject");
    }

    return {
      html: rawHtml || rawText!,
      text: rawText || rawHtml!,
      subject: rawSubject,
    };
  }

  // Call email-render worker for named templates
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(`${renderUrl}/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        template: templateName,
        audienceType: data.audienceType || "wanderer",
        name: data.name || null,
        ...data,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Render worker returned ${response.status}: ${error}`);
    }

    const result = (await response.json()) as {
      html: string;
      text: string;
      subject?: string;
    };

    // If the render worker doesn't return a subject, use the one from data
    const subject =
      result.subject || (data.subject as string) || "Message from Grove";

    return {
      html: result.html,
      text: result.text,
      subject,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Template rendering failed: ${message}`);
  }
}

/**
 * Check if a template exists
 */
export function templateExists(name: string): boolean {
  return name === "raw" || true; // Named templates are validated by render worker
}

/**
 * Get list of available templates
 */
export function getTemplateNames(): string[] {
  return Object.keys(TEMPLATES);
}
