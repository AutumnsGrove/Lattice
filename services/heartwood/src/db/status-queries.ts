// TypeScript types
interface Incident {
  id: string;
  title: string;
  slug: string;
  status: string;
  impact: string;
  type: string;
  started_at: string;
  resolved_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface Update {
  id: string;
  incident_id: string;
  status: string;
  message: string;
  created_at: string;
}

interface Component {
  id: string;
  name: string;
  slug: string;
  description?: string;
  current_status: string;
  display_order: number;
}

interface ScheduledMaintenance {
  id: string;
  title: string;
  description?: string;
  scheduled_start: string;
  scheduled_end: string;
  components?: string;
  status: string;
  created_at?: string;
}

interface IncidentWithUpdates extends Incident {
  updates: Update[];
  components: { name: string; slug: string }[];
}

// Generate URL-friendly slug from title
function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") +
    "-" +
    Date.now().toString(36).slice(-6)
  );
}

// Get all incidents (optionally filtered by status)
export async function getIncidents(
  db: D1Database,
  statusFilter?: string | null,
): Promise<Incident[]> {
  let query = `
    SELECT id, title, slug, status, impact, type, started_at, resolved_at
    FROM status_incidents
  `;

  if (statusFilter === "active") {
    query += " WHERE resolved_at IS NULL";
  } else if (statusFilter === "resolved") {
    query += " WHERE resolved_at IS NOT NULL";
  }

  query += " ORDER BY started_at DESC LIMIT 100";

  const result = await db.prepare(query).all<Incident>();
  return result.results;
}

// Get incident by ID with full timeline
export async function getIncidentById(
  db: D1Database,
  id: string,
): Promise<IncidentWithUpdates | null> {
  const incident = await db
    .prepare("SELECT * FROM status_incidents WHERE id = ?")
    .bind(id)
    .first<Incident>();

  if (!incident) return null;

  // Get updates
  const updates = await db
    .prepare(
      `
      SELECT id, status, message, created_at
      FROM status_updates
      WHERE incident_id = ?
      ORDER BY created_at DESC
    `,
    )
    .bind(id)
    .all<Update>();

  // Get affected components
  const components = await db
    .prepare(
      `
      SELECT c.name, c.slug
      FROM status_components c
      JOIN status_incident_components ic ON c.id = ic.component_id
      WHERE ic.incident_id = ?
    `,
    )
    .bind(id)
    .all<{ name: string; slug: string }>();

  return {
    ...incident,
    updates: updates.results,
    components: components.results,
  };
}

// Create new incident with initial update
export async function createIncident(
  db: D1Database,
  data: {
    title: string;
    type: string;
    impact: string;
    components: string[]; // component IDs
    initialStatus: string;
    initialMessage: string;
  },
): Promise<Incident> {
  const incidentId = `inc_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const slug = slugify(data.title);
  const now = new Date().toISOString();

  // Insert incident
  await db
    .prepare(
      `
      INSERT INTO status_incidents (id, title, slug, status, impact, type, started_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    )
    .bind(
      incidentId,
      data.title,
      slug,
      data.initialStatus,
      data.impact,
      data.type,
      now,
      now,
      now,
    )
    .run();

  // Insert initial update
  const updateId = `upd_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  await db
    .prepare(
      `
      INSERT INTO status_updates (id, incident_id, status, message, created_at)
      VALUES (?, ?, ?, ?, ?)
    `,
    )
    .bind(updateId, incidentId, data.initialStatus, data.initialMessage, now)
    .run();

  // Link affected components
  for (const componentId of data.components) {
    await db
      .prepare(
        `
        INSERT INTO status_incident_components (incident_id, component_id)
        VALUES (?, ?)
      `,
      )
      .bind(incidentId, componentId)
      .run();

    // Update component status based on incident impact
    const componentStatus =
      data.impact === "critical"
        ? "major_outage"
        : data.impact === "major"
          ? "partial_outage"
          : "degraded";

    await db
      .prepare(
        "UPDATE status_components SET current_status = ?, updated_at = ? WHERE id = ?",
      )
      .bind(componentStatus, now, componentId)
      .run();
  }

  return {
    id: incidentId,
    title: data.title,
    slug,
    status: data.initialStatus,
    impact: data.impact,
    type: data.type,
    started_at: now,
  };
}

// Add update to incident
export async function addIncidentUpdate(
  db: D1Database,
  incidentId: string,
  status: string,
  message: string,
): Promise<Update> {
  const updateId = `upd_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const now = new Date().toISOString();

  await db
    .prepare(
      `
      INSERT INTO status_updates (id, incident_id, status, message, created_at)
      VALUES (?, ?, ?, ?, ?)
    `,
    )
    .bind(updateId, incidentId, status, message, now)
    .run();

  // Update incident status
  await db
    .prepare(
      "UPDATE status_incidents SET status = ?, updated_at = ? WHERE id = ?",
    )
    .bind(status, now, incidentId)
    .run();

  return {
    id: updateId,
    incident_id: incidentId,
    status,
    message,
    created_at: now,
  };
}

// Update incident (mainly for resolving)
export async function updateIncident(
  db: D1Database,
  id: string,
  data: { status?: string; resolved?: string | null },
): Promise<Incident> {
  const now = new Date().toISOString();

  if (data.status) {
    await db
      .prepare(
        "UPDATE status_incidents SET status = ?, updated_at = ? WHERE id = ?",
      )
      .bind(data.status, now, id)
      .run();
  }

  if (data.resolved !== undefined) {
    await db
      .prepare(
        "UPDATE status_incidents SET resolved_at = ?, updated_at = ? WHERE id = ?",
      )
      .bind(data.resolved, now, id)
      .run();

    // Reset component statuses to operational
    if (data.resolved) {
      await db
        .prepare(
          `
          UPDATE status_components
          SET current_status = 'operational', updated_at = ?
          WHERE id IN (
            SELECT component_id FROM status_incident_components WHERE incident_id = ?
          )
        `,
        )
        .bind(now, id)
        .run();
    }
  }

  const incident = await db
    .prepare("SELECT * FROM status_incidents WHERE id = ?")
    .bind(id)
    .first<Incident>();

  return incident!;
}

// Get all components
export async function getAllComponents(db: D1Database): Promise<Component[]> {
  const result = await db
    .prepare("SELECT * FROM status_components ORDER BY display_order")
    .all<Component>();

  return result.results;
}

// Update component status (manual override)
export async function updateComponentStatus(
  db: D1Database,
  slug: string,
  status: string,
): Promise<Component> {
  const now = new Date().toISOString();

  await db
    .prepare(
      "UPDATE status_components SET current_status = ?, updated_at = ? WHERE slug = ?",
    )
    .bind(status, now, slug)
    .run();

  const component = await db
    .prepare("SELECT * FROM status_components WHERE slug = ?")
    .bind(slug)
    .first<Component>();

  return component!;
}

// Get scheduled maintenance
export async function getScheduledMaintenance(
  db: D1Database,
): Promise<ScheduledMaintenance[]> {
  const result = await db
    .prepare(
      `
      SELECT * FROM status_scheduled
      WHERE scheduled_start > datetime('now', '-7 days')
      ORDER BY scheduled_start
    `,
    )
    .all<ScheduledMaintenance>();

  return result.results;
}

// Create scheduled maintenance
export async function createScheduledMaintenance(
  db: D1Database,
  data: {
    title: string;
    description?: string;
    scheduledStart: string;
    scheduledEnd: string;
    components: string[];
  },
): Promise<ScheduledMaintenance> {
  const id = `sch_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const now = new Date().toISOString();

  await db
    .prepare(
      `
      INSERT INTO status_scheduled (id, title, description, scheduled_start, scheduled_end, components, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?)
    `,
    )
    .bind(
      id,
      data.title,
      data.description || null,
      data.scheduledStart,
      data.scheduledEnd,
      JSON.stringify(data.components),
      now,
    )
    .run();

  return {
    id,
    title: data.title,
    scheduled_start: data.scheduledStart,
    scheduled_end: data.scheduledEnd,
    status: "scheduled",
  };
}
