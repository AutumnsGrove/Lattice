import { Hono } from "hono";
import type { Env } from "../types.js";
import { createDbSession } from "../db/session.js";
import { isUserAdmin } from "../db/queries.js";
import { verifyAccessToken } from "../services/jwt.js";
import * as statusQueries from "../db/status-queries.js";

const status = new Hono<{ Bindings: Env }>();

// Middleware: Verify admin access (same pattern as admin.ts)
status.use("/*", async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "unauthorized" }, 401);
  }

  const token = authHeader.substring(7);
  const payload = await verifyAccessToken(c.env, token);

  if (!payload) {
    return c.json({ error: "invalid_token" }, 401);
  }

  const db = createDbSession(c.env);
  const admin = await isUserAdmin(db, payload.sub);

  if (!admin) {
    return c.json({ error: "forbidden" }, 403);
  }

  await next();
});

// GET /status/incidents - List all incidents (with optional status filter)
status.get("/incidents", async (c) => {
  const statusFilter = c.req.query("status"); // 'active' | 'resolved' | null
  const db = c.env.ENGINE_DB;
  const incidents = await statusQueries.getIncidents(db, statusFilter);
  return c.json({ incidents });
});

// POST /status/incidents - Create new incident
status.post("/incidents", async (c) => {
  const body = await c.req.json();
  const db = c.env.ENGINE_DB;

  // Validate required fields
  const { title, type, impact, components, initialStatus, initialMessage } =
    body;

  if (
    !title ||
    !type ||
    !impact ||
    !components?.length ||
    !initialStatus ||
    !initialMessage
  ) {
    return c.json({ error: "missing_required_fields" }, 400);
  }

  const incident = await statusQueries.createIncident(db, {
    title,
    type,
    impact,
    components,
    initialStatus,
    initialMessage,
  });

  return c.json({ incident }, 201);
});

// GET /status/incidents/:id - Get incident with full update timeline
status.get("/incidents/:id", async (c) => {
  const id = c.req.param("id");
  const db = c.env.ENGINE_DB;

  const incident = await statusQueries.getIncidentById(db, id);

  if (!incident) {
    return c.json({ error: "not_found" }, 404);
  }

  return c.json({ incident });
});

// POST /status/incidents/:id/updates - Post update to incident timeline
status.post("/incidents/:id/updates", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const db = c.env.ENGINE_DB;

  const { status: newStatus, message } = body;

  if (!newStatus || !message) {
    return c.json({ error: "missing_required_fields" }, 400);
  }

  const update = await statusQueries.addIncidentUpdate(
    db,
    id,
    newStatus,
    message,
  );

  return c.json({ update }, 201);
});

// PATCH /status/incidents/:id - Update incident (mainly for resolving)
status.patch("/incidents/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const db = c.env.ENGINE_DB;

  const { status, resolved } = body;

  const incident = await statusQueries.updateIncident(db, id, {
    status,
    resolved: resolved ? new Date().toISOString() : null,
  });

  return c.json({ incident });
});

// GET /status/components - List all components with current status
status.get("/components", async (c) => {
  const db = c.env.ENGINE_DB;
  const components = await statusQueries.getAllComponents(db);
  return c.json({ components });
});

// PATCH /status/components/:slug - Override component status
status.patch("/components/:slug", async (c) => {
  const slug = c.req.param("slug");
  const body = await c.req.json();
  const db = c.env.ENGINE_DB;

  const { status } = body;

  if (!status) {
    return c.json({ error: "missing_status" }, 400);
  }

  const component = await statusQueries.updateComponentStatus(db, slug, status);

  return c.json({ component });
});

// GET /status/scheduled - List scheduled maintenance
status.get("/scheduled", async (c) => {
  const db = c.env.ENGINE_DB;
  const scheduled = await statusQueries.getScheduledMaintenance(db);
  return c.json({ scheduled });
});

// POST /status/scheduled - Create scheduled maintenance
status.post("/scheduled", async (c) => {
  const body = await c.req.json();
  const db = c.env.ENGINE_DB;

  const { title, description, scheduledStart, scheduledEnd, components } = body;

  if (!title || !scheduledStart || !scheduledEnd || !components?.length) {
    return c.json({ error: "missing_required_fields" }, 400);
  }

  const maintenance = await statusQueries.createScheduledMaintenance(db, {
    title,
    description,
    scheduledStart,
    scheduledEnd,
    components,
  });

  return c.json({ maintenance }, 201);
});

export default status;
