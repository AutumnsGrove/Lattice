/**
 * Health Check Handler
 *
 * Returns service health status and available templates.
 */

import type { Context } from "hono";
import type { Env } from "../types";

export async function healthHandler(c: Context<{ Bindings: Env }>) {
  const { TEMPLATES } = await import("../templates");

  return c.json({
    status: "healthy",
    service: "zephyr",
    version: "1.0.0",
    environment: c.env.ENVIRONMENT || "development",
    templates: Object.keys(TEMPLATES),
    timestamp: new Date().toISOString(),
  });
}
