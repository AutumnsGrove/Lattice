# Curio: Now Playing

> *We're listening to music together right now.*

**Priority:** Tier 2 — Build Next
**Complexity:** Medium-High
**Category:** Integration
**Placement:** Left-vine, right-vine, footer-vine, floating

---

## What

Display what you're currently listening to — Spotify, Last.fm, or manual entry. Real-time album art, song title, artist, and optional progress bar. The digital equivalent of music playing in the background of a cozy shop.

## Why

This is the #1 thing people add to Discord profiles, Notion pages, and personal sites. It's a real-time signal that says "a human is here, living their life." It transforms a static site into something alive. The "oh, they're listening to the same stuff I like" moment creates instant connection.

---

## Database Schema

### Migration: `{next}_nowplaying_curio.sql`

```sql
CREATE TABLE IF NOT EXISTS nowplaying_config (
  tenant_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'manual',
  access_token_encrypted TEXT DEFAULT NULL,
  refresh_token_encrypted TEXT DEFAULT NULL,
  display_style TEXT NOT NULL DEFAULT 'compact',
  show_album_art INTEGER NOT NULL DEFAULT 1,
  show_progress INTEGER NOT NULL DEFAULT 0,
  fallback_text TEXT DEFAULT NULL,
  last_fm_username TEXT DEFAULT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS nowplaying_history (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  track_name TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT DEFAULT NULL,
  album_art_url TEXT DEFAULT NULL,
  played_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_nowplaying_history_tenant ON nowplaying_history(tenant_id, played_at);
```

---

## Providers

### Spotify (OAuth2 PKCE)
- Full OAuth flow through Heartwood
- Endpoints: `/v1/me/player/currently-playing`
- Refresh token stored encrypted (AES-256-GCM, reuse existing pattern)
- Client-side polling every 30s (not server cron)

### Last.fm (API Key)
- Simpler: just needs a username + API key
- Endpoint: `user.getRecentTracks`
- Less real-time than Spotify but lower complexity

### Manual
- Set "currently vibing to" text + optional album art URL
- No external integration needed
- Available at all tiers

---

## Components

| Component | Purpose |
|-----------|---------|
| `NowPlaying.svelte` | Main display — style switching |
| `NowPlayingCompact.svelte` | One-line: "Now Playing: Song — Artist" |
| `NowPlayingCard.svelte` | Album art + song + artist + progress bar |
| `NowPlayingVinyl.svelte` | Spinning record animation with track info |
| `NowPlayingMinimal.svelte` | Just the song name, subtle |
| `NowPlayingHistory.svelte` | Recent listens log |
| `NowPlayingAdmin.svelte` | Connect provider, configure display |

---

## API Endpoints

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| `GET` | `/api/curios/nowplaying` | Get current track | Public |
| `GET` | `/api/curios/nowplaying/history` | Get recent tracks | Public |
| `GET` | `/api/curios/nowplaying/config` | Get config | Admin |
| `POST` | `/api/curios/nowplaying/config` | Update config | Admin |
| `GET` | `/api/curios/nowplaying/callback` | OAuth callback | System |
| `POST` | `/api/curios/nowplaying/manual` | Set manual track | Admin |

---

## Key Implementation Details

- **Client-side polling:** Visitor's browser polls `/api/curios/nowplaying` every 30s. API checks provider and returns current track. Avoids server-side cron costs.
- **Token encryption:** Reuse AES-256-GCM from `encryption.ts` (proven pattern from Timeline/Journey)
- **Token refresh:** Spotify tokens expire in 1hr. Refresh on API call if expired.
- **Album art proxy:** Fetch art, cache in KV for 24hr to avoid hotlinking Spotify CDN
- **Fallback text:** When nothing playing, show custom text (default: "the forest rests")
- **History:** Store last 50 tracks, auto-prune on insert
- **Vine-native:** Compact and Card styles designed for vine slots
- **Vinyl animation:** CSS `@keyframes rotate` on a circle element, respects reduced-motion

---

## Tier Logic

| Tier | Provider | Styles | History |
|------|----------|--------|---------|
| Seedling | Manual only | Compact | No |
| Sapling | Spotify OR Last.fm | Compact, Card | Last 10 |
| Oak+ | All providers | All styles | Last 50 |

---

## Implementation Steps

1. Migration + types in `index.ts`
2. Manual provider (set text/art directly)
3. Compact and Card display components
4. Last.fm integration (simpler, API key only)
5. Spotify OAuth flow + token management
6. Vinyl display component
7. History tracking + display
8. KV caching for album art proxy
9. Admin page (provider connection + style config)
10. Register in curio registry
11. Tests

---

*Someone's listening. The music fills the grove.*
