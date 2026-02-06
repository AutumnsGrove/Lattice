/**
 * Email Render Worker
 *
 * Stateless worker that renders Grove email templates on demand.
 * Provides an API for the catch-up cron and preview tools.
 *
 * POST /render
 * {
 *   "template": "WelcomeEmail",
 *   "audienceType": "wanderer",
 *   "name": "Autumn" // optional
 * }
 *
 * Returns:
 * {
 *   "html": "<html>...</html>",
 *   "text": "Plain text version..."
 * }
 */

import * as React from "react";
import { render } from "@react-email/render";

// Import templates - synced from engine package during build
// See scripts/sync-templates.mjs
import { WelcomeEmail } from "./templates/WelcomeEmail";
import { Day1Email } from "./templates/Day1Email";
import { Day7Email } from "./templates/Day7Email";
import { Day14Email } from "./templates/Day14Email";
import { Day30Email } from "./templates/Day30Email";
import { BetaInviteEmail } from "./templates/BetaInviteEmail";
import type { AudienceType } from "./templates/types";

// =============================================================================
// Types
// =============================================================================

interface RenderRequest {
  template: string;
  audienceType?: AudienceType;
  name?: string | null;
  /** Template-specific data (used by templates that don't follow the audience pattern) */
  data?: Record<string, unknown>;
}

interface RenderResponse {
  html: string;
  text: string;
}

// =============================================================================
// Template Registry
// =============================================================================

type SequenceTemplateProps = {
  name?: string;
  audienceType: AudienceType;
};

type TemplateComponent = (props: Record<string, unknown>) => React.ReactElement;

/** Sequence templates use audienceType + name */
const SEQUENCE_TEMPLATES: Record<
  string,
  (props: SequenceTemplateProps) => React.ReactElement
> = {
  WelcomeEmail: WelcomeEmail as (
    props: SequenceTemplateProps,
  ) => React.ReactElement,
  Day1Email: Day1Email as (props: SequenceTemplateProps) => React.ReactElement,
  Day7Email: Day7Email as (props: SequenceTemplateProps) => React.ReactElement,
  Day14Email: Day14Email as (
    props: SequenceTemplateProps,
  ) => React.ReactElement,
  Day30Email: Day30Email as (
    props: SequenceTemplateProps,
  ) => React.ReactElement,
};

/** Data-driven templates receive props via the data field */
const DATA_TEMPLATES: Record<string, TemplateComponent> = {
  BetaInviteEmail: BetaInviteEmail as TemplateComponent,
};

const ALL_TEMPLATE_NAMES = [
  ...Object.keys(SEQUENCE_TEMPLATES),
  ...Object.keys(DATA_TEMPLATES),
];

// =============================================================================
// Worker Handler
// =============================================================================

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders(),
      });
    }

    // Health check
    if (url.pathname === "/health") {
      return json({ status: "ok", templates: ALL_TEMPLATE_NAMES });
    }

    // Render endpoint
    if (url.pathname === "/render" && request.method === "POST") {
      return handleRender(request);
    }

    // List available templates
    if (url.pathname === "/templates" && request.method === "GET") {
      return json({
        templates: ALL_TEMPLATE_NAMES,
        sequenceTemplates: Object.keys(SEQUENCE_TEMPLATES),
        dataTemplates: Object.keys(DATA_TEMPLATES),
        audienceTypes: ["wanderer", "promo", "rooted"],
      });
    }

    return json({ error: "Not found" }, 404);
  },
};

// =============================================================================
// Render Handler
// =============================================================================

async function handleRender(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as RenderRequest;

    // Validate request
    if (!body.template) {
      return json({ error: "Missing template parameter" }, 400);
    }

    let element: React.ReactElement;

    // Check if it's a data-driven template (e.g. BetaInviteEmail)
    const DataTemplate = DATA_TEMPLATES[body.template];
    if (DataTemplate) {
      // Data templates receive props from the data field and/or top-level fields.
      // Zephyr spreads request.data at top level when calling us, so extra fields
      // like tier/inviteType/customMessage arrive as top-level JSON properties.
      // We re-parse the raw body to capture everything beyond RenderRequest's type.
      const rawBody = JSON.parse(JSON.stringify(body)) as Record<
        string,
        unknown
      >;
      const props: Record<string, unknown> = { name: body.name || undefined };

      // Merge nested data (if sent directly with a data field)
      if (body.data) {
        Object.assign(props, body.data);
      }

      // Merge top-level extras (from Zephyr's spread)
      for (const [key, value] of Object.entries(rawBody)) {
        if (!["template", "audienceType", "name", "data"].includes(key)) {
          props[key] = value;
        }
      }

      element = React.createElement(DataTemplate, props);
    } else {
      // Sequence templates require audienceType
      const SequenceTemplate = SEQUENCE_TEMPLATES[body.template];
      if (!SequenceTemplate) {
        return json(
          {
            error: `Unknown template: ${body.template}`,
            available: ALL_TEMPLATE_NAMES,
          },
          400,
        );
      }

      if (!body.audienceType) {
        return json(
          {
            error:
              "Missing audienceType parameter (required for sequence templates)",
          },
          400,
        );
      }

      if (!["wanderer", "promo", "rooted"].includes(body.audienceType)) {
        return json({ error: "Invalid audienceType" }, 400);
      }

      element = React.createElement(SequenceTemplate, {
        name: body.name || undefined,
        audienceType: body.audienceType,
      });
    }

    const html = await render(element);
    const text = await render(element, { plainText: true });

    const response: RenderResponse = { html, text };
    return json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Render error:", message);
    return json({ error: `Render failed: ${message}` }, 500);
  }
}

// =============================================================================
// Helpers
// =============================================================================

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
    },
  });
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
