-- Grove Clearing: Status Page Database Schema
-- Migration: 0001_status_tables.sql
--
-- This migration creates the tables needed for the public status page.
-- Tables are prefixed with 'status_' to avoid conflicts with other Grove tables.

-- ═══════════════════════════════════════════════════════════════
-- COMPONENTS TABLE
-- Trackable platform components (Blog Engine, CDN, Auth, etc.)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS status_components (
    id TEXT PRIMARY KEY,                          -- UUID
    name TEXT NOT NULL,                           -- "Blog Engine", "CDN", etc.
    slug TEXT UNIQUE NOT NULL,                    -- "blog-engine", "cdn"
    description TEXT,                             -- What this component does
    display_order INTEGER DEFAULT 0,              -- Sort order on status page
    current_status TEXT DEFAULT 'operational',    -- operational, degraded, partial_outage, major_outage, maintenance
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════
-- INCIDENTS TABLE
-- Incidents (outages, maintenance, etc.)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS status_incidents (
    id TEXT PRIMARY KEY,                          -- UUID
    title TEXT NOT NULL,                          -- "CDN Degraded Performance"
    slug TEXT UNIQUE NOT NULL,                    -- URL-friendly identifier
    status TEXT NOT NULL,                         -- investigating, identified, monitoring, resolved
    impact TEXT NOT NULL,                         -- none, minor, major, critical
    type TEXT NOT NULL,                           -- outage, degraded, maintenance, security
    started_at TEXT NOT NULL,                     -- When incident began
    resolved_at TEXT,                             -- When resolved (null if ongoing)
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════
-- UPDATES TABLE
-- Updates posted to incidents (timeline)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS status_updates (
    id TEXT PRIMARY KEY,                          -- UUID
    incident_id TEXT NOT NULL,                    -- Foreign key to incidents
    status TEXT NOT NULL,                         -- Status at time of update
    message TEXT NOT NULL,                        -- Update content (markdown supported)
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (incident_id) REFERENCES status_incidents(id) ON DELETE CASCADE
);

-- ═══════════════════════════════════════════════════════════════
-- INCIDENT-COMPONENTS JUNCTION TABLE
-- Which components are affected by which incidents
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS status_incident_components (
    incident_id TEXT NOT NULL,
    component_id TEXT NOT NULL,
    PRIMARY KEY (incident_id, component_id),
    FOREIGN KEY (incident_id) REFERENCES status_incidents(id) ON DELETE CASCADE,
    FOREIGN KEY (component_id) REFERENCES status_components(id) ON DELETE CASCADE
);

-- ═══════════════════════════════════════════════════════════════
-- SCHEDULED MAINTENANCE TABLE
-- Scheduled maintenance announcements
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS status_scheduled (
    id TEXT PRIMARY KEY,                          -- UUID
    title TEXT NOT NULL,                          -- "Database Migration"
    description TEXT,                             -- Details about the maintenance
    scheduled_start TEXT NOT NULL,                -- When maintenance begins
    scheduled_end TEXT NOT NULL,                  -- Expected end time
    components TEXT NOT NULL,                     -- JSON array of component IDs
    status TEXT DEFAULT 'scheduled',              -- scheduled, in_progress, completed
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════
-- DAILY STATUS HISTORY TABLE
-- Historical daily status for uptime visualization (90-day history)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS status_daily_history (
    id TEXT PRIMARY KEY,                          -- UUID
    component_id TEXT NOT NULL,                   -- Foreign key to components
    date TEXT NOT NULL,                           -- YYYY-MM-DD
    status TEXT NOT NULL,                         -- worst status of the day
    incident_count INTEGER DEFAULT 0,             -- number of incidents that day
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (component_id) REFERENCES status_components(id) ON DELETE CASCADE,
    UNIQUE(component_id, date)                    -- One record per component per day
);

-- ═══════════════════════════════════════════════════════════════
-- INDEXES
-- Optimize common queries
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_incidents_started ON status_incidents(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON status_incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_resolved ON status_incidents(resolved_at);
CREATE INDEX IF NOT EXISTS idx_updates_incident ON status_updates(incident_id);
CREATE INDEX IF NOT EXISTS idx_updates_created ON status_updates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scheduled_start ON status_scheduled(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_scheduled_status ON status_scheduled(status);
CREATE INDEX IF NOT EXISTS idx_daily_history_component ON status_daily_history(component_id);
CREATE INDEX IF NOT EXISTS idx_daily_history_date ON status_daily_history(date DESC);

-- ═══════════════════════════════════════════════════════════════
-- INITIAL DATA
-- Seed the components table with Grove's platform components
-- ═══════════════════════════════════════════════════════════════

INSERT OR IGNORE INTO status_components (id, name, slug, description, display_order, current_status) VALUES
    ('comp_blog', 'Blog Engine', 'blog-engine', 'Core blogging functionality — publishing, reading, editing', 1, 'operational'),
    ('comp_cdn', 'CDN', 'cdn', 'Image and media delivery via R2/Cloudflare', 2, 'operational'),
    ('comp_auth', 'Authentication', 'authentication', 'Heartwood login and session management', 3, 'operational'),
    ('comp_meadow', 'Meadow', 'meadow', 'Community feed and social features', 4, 'operational'),
    ('comp_payments', 'Payments', 'payments', 'Stripe integration for subscriptions', 5, 'operational'),
    ('comp_api', 'API', 'api', 'Backend API endpoints', 6, 'operational');
