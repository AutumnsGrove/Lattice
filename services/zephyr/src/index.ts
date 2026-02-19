/**
 * Zephyr - Unified Email Gateway
 *
 * A centralized email service that handles all email sending for Grove.
 * Provides rate limiting, unsubscribe checking, template rendering,
 * and D1 logging in a single, consistent API.
 *
 * Architecture:
 * Services → ZephyrClient → Zephyr Worker → Resend API
 *
 * POST /send
 * {
 *   "type": "transactional",
 *   "template": "WelcomeEmail",
 *   "to": "user@example.com",
 *   "data": { "name": "Autumn" },
 *   "tenant": "grove",
 *   "correlationId": "..."
 * }
 */

import { Hono } from "hono";
import type { Env } from "./types";
import { sendHandler } from "./handlers/send";
import { broadcastHandler, platformsHandler } from "./handlers/broadcast";
import { healthHandler } from "./handlers/health";
import { authMiddleware } from "./middleware/auth";

const app = new Hono<{ Bindings: Env }>();

// Health check endpoint (public)
app.get("/health", healthHandler);

// Main send endpoint (requires authentication)
app.post("/send", authMiddleware, sendHandler);

// Social broadcast endpoints (requires authentication)
app.post("/broadcast", authMiddleware, broadcastHandler);
app.get("/broadcast/platforms", authMiddleware, platformsHandler);

// List available templates (requires authentication)
app.get("/templates", authMiddleware, async (c) => {
  const { TEMPLATES } = await import("./templates");
  return c.json({
    templates: Object.keys(TEMPLATES),
    version: "1.0.0",
  });
});

export default app;
