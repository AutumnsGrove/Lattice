# Grove Platform — Technical Diagrams

Modern architecture diagrams for the Grove platform, reflecting the current monorepo structure, Cloudflare infrastructure, and multi-tenant design.

> **Generated:** February 2026 | **Rendered with:** [MermaidVisualizer](https://github.com/AutumnsGrove/MermaidVisualizer)

---

## Table of Contents

### Architecture

1. [Monorepo Package Map](#1-monorepo-package-map)
2. [Request Routing](#2-request-routing)
3. [Cloudflare Infrastructure](#3-cloudflare-infrastructure)
4. [Service Binding Communication](#4-service-binding-communication)

### Authentication & Security

5. [Heartwood Authentication Flow](#5-heartwood-authentication-flow)
6. [Multi-Tenant Data Isolation](#6-multi-tenant-data-isolation)

### Data

7. [Core Database Schema](#7-core-database-schema)
8. [Heartwood Database Schema](#8-heartwood-database-schema)

### Systems

9. [Durable Objects — Loom Pattern](#9-durable-objects--loom-pattern)
10. [Email Infrastructure — Zephyr](#10-email-infrastructure--zephyr)
11. [Engine Export Map](#11-engine-export-map)
12. [Curios & Grafts](#12-curios--grafts)

### Operations

13. [CI/CD & Deployment](#13-cicd--deployment)
14. [Storage & Media Pipeline](#14-storage--media-pipeline)

---

## Architecture

### 1. Monorepo Package Map

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#e8f5e9', 'primaryTextColor': '#1a1a1a', 'primaryBorderColor': '#2d5a2d', 'lineColor': '#2d5a2d', 'secondaryColor': '#f0f7f0', 'background': '#ffffff'}}}%%
flowchart TB
    subgraph apps["Apps — SvelteKit on Cloudflare Pages"]
        ENGINE["Engine<br/><i>username.grove.place</i><br/>Multi-tenant blog"]
        LANDING["Landing<br/><i>grove.place</i><br/>Marketing site"]
        PLANT["Plant<br/><i>grove.place/shop</i><br/>Billing & shop"]
        MEADOW["Meadow<br/><i>grove.place/feed</i><br/>Community feed"]
        CLEARING["Clearing<br/><i>status.grove.place</i><br/>Status page"]
        LOGIN["Login<br/><i>grove.place/login</i><br/>Auth UI"]
        DOMAINS["Domains<br/>Domain management"]
    end

    subgraph workers["Workers — Cloudflare Workers"]
        ROUTER["grove-router<br/>Subdomain proxy"]
        HEARTWOOD["Heartwood<br/>OAuth + sessions"]
        ZEPHYR["Zephyr<br/>Email gateway"]
        DO["Durable Objects<br/>State coordination"]
        OG["OG Worker<br/>Meta tag generation"]
        EMAILR["email-render<br/>React Email"]
        EMAILC["email-catchup<br/>Weekly digest cron"]
        MONITOR["clearing-monitor<br/>Health checks"]
        TIMELINE["timeline-sync<br/>Nightly summaries"]
        CLEANUP["webhook-cleanup<br/>Daily purge"]
    end

    subgraph libs["Libraries & Tools"]
        VINEYARD["Vineyard<br/>Component docs"]
        TERRARIUM["Terrarium<br/>Showcase"]
        ZIG["zig-core<br/>WASM validation"]
        MIGRATOR["post-migrator<br/>Data migration"]
    end

    subgraph tools["CLI Tools — Python/UV"]
        GW["gw<br/>Grove Wrap CLI"]
        GF["gf<br/>Codebase search"]
        GLIMPSE["glimpse<br/>Monitoring"]
    end

    ENGINE --> HEARTWOOD
    ENGINE --> ZEPHYR
    ENGINE --> DO
    PLANT --> HEARTWOOD
    PLANT --> ZEPHYR
    ROUTER --> ENGINE
    ROUTER --> LANDING
    ROUTER --> PLANT
    ROUTER --> MEADOW

    style apps fill:#e8f5e9,stroke:#2d5a2d,stroke-width:2px
    style workers fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style libs fill:#fff3e0,stroke:#e65100,stroke-width:2px
    style tools fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
```

---

### 2. Request Routing

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#e3f2fd', 'primaryTextColor': '#1a1a1a', 'primaryBorderColor': '#1565c0', 'lineColor': '#1565c0', 'background': '#ffffff'}}}%%
flowchart LR
    REQ["Wanderer<br/>Request"] --> CF["Cloudflare<br/>DNS + CDN"]
    CF --> ROUTER["grove-router<br/>Worker"]

    ROUTER --> CHECK{Subdomain?}

    CHECK -->|"alice.grove.place"| ENGINE["Engine<br/>Tenant: alice"]
    CHECK -->|"bob.grove.place"| ENGINE2["Engine<br/>Tenant: bob"]
    CHECK -->|"grove.place"| LANDING["Landing"]
    CHECK -->|"grove.place/feed"| MEADOW["Meadow"]
    CHECK -->|"status.grove.place"| CLEARING["Clearing"]

    ENGINE --> AUTH{"Session<br/>valid?"}
    AUTH -->|"Check"| HW["Heartwood<br/>Service Binding"]
    HW -->|"Valid"| RENDER["Render page"]
    HW -->|"Invalid"| LOGIN["Redirect<br/>to login"]

    style REQ fill:#fff3e0,stroke:#e65100,stroke-width:2px
    style ROUTER fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style HW fill:#fce4ec,stroke:#c2185b,stroke-width:2px
```

---

### 3. Cloudflare Infrastructure

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#f3e5f5', 'primaryTextColor': '#1a1a1a', 'primaryBorderColor': '#7b1fa2', 'lineColor': '#7b1fa2', 'background': '#ffffff'}}}%%
flowchart TB
    subgraph d1["D1 — SQLite Databases"]
        DB1[("grove-engine-db<br/><i>Shared multi-tenant</i>")]
        DB2[("groveauth<br/><i>Sessions & OAuth</i>")]
        DB3[("zephyr-db<br/><i>Email logs</i>")]
    end

    subgraph kv["KV — Key-Value Stores"]
        KV1["CACHE_KV<br/>Content & session cache"]
        KV2["FLAGS_KV<br/>Feature flags"]
        KV3["SESSION_KV<br/>Better Auth sessions"]
    end

    subgraph r2["R2 — Object Storage"]
        R1["grove-media<br/>Wanderer uploads"]
        R2["grove-exports<br/>Temporary zips"]
        R3["grove-cdn<br/>CDN assets"]
    end

    subgraph durobj["Durable Objects"]
        DO1["TenantDO<br/>Config & analytics"]
        DO2["PostMetaDO<br/>Reactions & views"]
        DO3["PostContentDO<br/>Content cache"]
        DO4["SentinelDO<br/>Stress testing"]
        DO5["ExportDO<br/>Zip assembly"]
    end

    subgraph ai["AI & Security"]
        AI1["Workers AI<br/>Llama 4 Scout<br/><i>Petal moderation</i>"]
        AI2["AI Gateway<br/>Per-tenant quotas"]
        TN["Turnstile<br/><i>Shade CAPTCHA</i>"]
    end

    subgraph cron["Cron Triggers"]
        CR1["Heartwood<br/>Every minute + daily"]
        CR2["email-catchup<br/>Weekly digest"]
        CR3["webhook-cleanup<br/>Daily 3 AM UTC"]
        CR4["timeline-sync<br/>Nightly"]
    end

    style d1 fill:#e8f5e9,stroke:#2d5a2d,stroke-width:2px
    style kv fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style r2 fill:#fff3e0,stroke:#e65100,stroke-width:2px
    style durobj fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style ai fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    style cron fill:#fffde7,stroke:#f9a825,stroke-width:2px
```

---

### 4. Service Binding Communication

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#e0f2f1', 'primaryTextColor': '#1a1a1a', 'primaryBorderColor': '#00695c', 'lineColor': '#00695c', 'background': '#ffffff'}}}%%
sequenceDiagram
    participant W as Wanderer
    participant R as grove-router
    participant E as Engine Worker
    participant H as Heartwood (AUTH)
    participant Z as Zephyr (ZEPHYR)
    participant DO as Durable Objects

    W->>R: GET alice.grove.place/admin
    R->>E: Proxy request (tenant: alice)

    E->>H: Validate session (service binding)
    H-->>E: Session valid + user data

    E->>DO: TenantDO.get(alice) — cached config
    DO-->>E: Tenant settings + feature flags

    E-->>W: Render admin dashboard

    Note over W,DO: Publishing a post

    W->>E: POST /api/posts (publish)
    E->>DO: PostMetaDO.init(post_id)
    E->>Z: Send notification email (service binding)
    Z-->>E: Email queued
    E-->>W: Post published
```

---

## Authentication & Security

### 5. Heartwood Authentication Flow

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#e8f4e8', 'primaryTextColor': '#1a1a1a', 'primaryBorderColor': '#2d5a2d', 'lineColor': '#2d5a2d', 'background': '#ffffff'}}}%%
flowchart TD
    subgraph methods["Auth Methods"]
        G["Google OAuth 2.0<br/>+ PKCE"]
        P["Passkey<br/>WebAuthn"]
        M["Magic Link<br/>Email code"]
    end

    subgraph heartwood["Heartwood Worker"]
        BA["Better Auth<br/>Session manager"]
        D1[("groveauth D1<br/>Users, sessions,<br/>OAuth clients")]
        KV["SESSION_KV<br/>Fast lookups"]
    end

    subgraph validation["Session Validation"]
        SB["Service Binding<br/>Engine → AUTH"]
        CHECK{"Cookie<br/>valid?"}
        REFRESH["Refresh<br/>token"]
        DENY["Redirect<br/>to login"]
    end

    G --> BA
    P --> BA
    M --> BA
    BA --> D1
    BA --> KV

    SB --> CHECK
    CHECK -->|"Valid"| OK["Allow request"]
    CHECK -->|"Expired"| REFRESH
    CHECK -->|"Invalid"| DENY
    REFRESH -->|"Success"| OK
    REFRESH -->|"Failed"| DENY

    style methods fill:#e8f4e8,stroke:#2d5a2d,stroke-width:2px
    style heartwood fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style validation fill:#fff3e0,stroke:#e65100,stroke-width:2px
```

---

### 6. Multi-Tenant Data Isolation

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#ffebee', 'primaryTextColor': '#1a1a1a', 'primaryBorderColor': '#c62828', 'lineColor': '#c62828', 'background': '#ffffff'}}}%%
flowchart TB
    subgraph request["Incoming Request"]
        REQ["alice.grove.place/api/posts"]
        TENANT["tenant_id = alice"]
    end

    subgraph db_layer["Database Layer"]
        TDB["TenantDb Proxy<br/><i>Auto-injects tenant_id</i>"]
        QUERY["SELECT * FROM posts<br/>WHERE tenant_id = 'alice'"]
    end

    subgraph isolation["Isolation Boundaries"]
        direction LR
        subgraph alice["Tenant: alice"]
            A_POSTS["alice's posts"]
            A_MEDIA["alice's R2 media"]
            A_SECRETS["alice's DEK<br/><i>Envelope encryption</i>"]
        end
        subgraph bob["Tenant: bob"]
            B_POSTS["bob's posts"]
            B_MEDIA["bob's R2 media"]
            B_SECRETS["bob's DEK"]
        end
    end

    subgraph controls["Security Controls"]
        CSRF["CSRF<br/>trustedOrigins: *.grove.place"]
        RATE["Rate Limiting"]
        SIGNPOST["Signpost Errors<br/>GROVE-API-XXX"]
        SHADE["Shade / Turnstile<br/>Bot protection"]
    end

    REQ --> TENANT --> TDB --> QUERY
    QUERY --> alice
    alice -.-|"ISOLATED"| bob

    style request fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style db_layer fill:#e8f5e9,stroke:#2d5a2d,stroke-width:2px
    style alice fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style bob fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    style controls fill:#fffde7,stroke:#f9a825,stroke-width:2px
```

---

## Data

### 7. Core Database Schema

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#e8f5e9', 'primaryTextColor': '#1a1a1a', 'primaryBorderColor': '#2e7d32', 'lineColor': '#2e7d32', 'background': '#ffffff'}}}%%
erDiagram
    tenants {
        text id PK
        text subdomain UK
        text custom_domain
        text plan
        text status
        int created_at
    }

    users {
        text id PK
        text tenant_id FK
        text email
        text name
        text role
        int created_at
    }

    posts {
        text id PK
        text tenant_id FK
        text slug
        text title
        text content
        text html
        text status
        text author_id FK
        int published_at
        int word_count
        text featured_image
    }

    pages {
        text id PK
        text tenant_id FK
        text slug
        text title
        text content
        int sort_order
    }

    comments {
        text id PK
        text tenant_id FK
        text post_id FK
        text author_name
        text content
        text status
        text parent_id FK
    }

    reactions {
        text id PK
        text post_id FK
        text user_id FK
        text emoji
    }

    site_settings {
        text tenant_id PK
        text theme
        text accent_color
        text config_json
    }

    subscriptions {
        text id PK
        text tenant_id FK
        text stripe_id
        text plan
        text status
        int current_period_end
    }

    tenants ||--o{ users : "has"
    tenants ||--o{ posts : "contains"
    tenants ||--o{ pages : "contains"
    tenants ||--|| site_settings : "configured by"
    tenants ||--o{ subscriptions : "billed via"
    posts ||--o{ comments : "has"
    posts ||--o{ reactions : "receives"
    users ||--o{ posts : "authors"
```

---

### 8. Heartwood Database Schema

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#e3f2fd', 'primaryTextColor': '#1a1a1a', 'primaryBorderColor': '#1976d2', 'lineColor': '#1976d2', 'background': '#ffffff'}}}%%
erDiagram
    users {
        text id PK
        text email UK
        text name
        text image
        bool emailVerified
        int createdAt
    }

    sessions {
        text id PK
        text userId FK
        text token UK
        int expiresAt
        text ipAddress
        text userAgent
    }

    accounts {
        text id PK
        text userId FK
        text providerId
        text accountId
        text accessToken
        text refreshToken
        int expiresAt
    }

    oauth_clients {
        text id PK
        text client_id UK
        text client_secret
        text redirect_uri
        text scope
    }

    passkeys {
        text id PK
        text userId FK
        text credentialId UK
        text publicKey
        text name
        int counter
    }

    rate_limits {
        text key PK
        int count
        int window_start
    }

    users ||--o{ sessions : "has"
    users ||--o{ accounts : "linked to"
    users ||--o{ passkeys : "registered"
```

---

## Systems

### 9. Durable Objects — Loom Pattern

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#f3e5f5', 'primaryTextColor': '#1a1a1a', 'primaryBorderColor': '#7b1fa2', 'lineColor': '#7b1fa2', 'background': '#ffffff'}}}%%
flowchart TB
    subgraph engine["Engine Worker"]
        REQ["Incoming request"]
    end

    subgraph loom["Loom — Durable Objects"]
        subgraph tenant_do["TenantDO <i>(per tenant)</i>"]
            TC["Config caching"]
            TD["Draft sync"]
            TA["Analytics buffering"]
        end

        subgraph post_meta["PostMetaDO <i>(per post)</i>"]
            PM1["Reaction counts"]
            PM2["View tracking"]
            PM3["Real-time presence"]
        end

        subgraph post_content["PostContentDO <i>(per post)</i>"]
            PC1["Rendered HTML cache"]
            PC2["Warm content"]
        end

        subgraph sentinel["SentinelDO"]
            SE1["WebSocket updates"]
            SE2["Stress test coordination"]
        end

        subgraph export["ExportDO <i>(per export)</i>"]
            EX1["Zip assembly"]
            EX2["Alarm-based scheduling"]
        end
    end

    subgraph backing["Backing Storage"]
        D1[("grove-engine-db")]
        R2["grove-exports (R2)"]
    end

    REQ --> tenant_do
    REQ --> post_meta
    REQ --> post_content

    TA -->|"Flush buffer"| D1
    PM1 -->|"Persist"| D1
    EX1 -->|"Write zip"| R2

    style engine fill:#e8f5e9,stroke:#2d5a2d,stroke-width:2px
    style tenant_do fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style post_meta fill:#fff3e0,stroke:#e65100,stroke-width:2px
    style post_content fill:#fffde7,stroke:#f9a825,stroke-width:2px
    style sentinel fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    style export fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style backing fill:#e0f2f1,stroke:#00695c,stroke-width:2px
```

---

### 10. Email Infrastructure — Zephyr

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#e1f5fe', 'primaryTextColor': '#1a1a1a', 'primaryBorderColor': '#0277bd', 'lineColor': '#0277bd', 'background': '#ffffff'}}}%%
flowchart LR
    subgraph triggers["Triggers"]
        T1["Post published"]
        T2["Wanderer signs up"]
        T3["Password reset"]
        T4["Weekly digest cron"]
        T5["Social broadcast"]
    end

    subgraph zephyr["Zephyr Worker (Hono)"]
        GW["Gateway router"]
        RL["Rate limiter"]
        LOG[("zephyr-db<br/>Event logs")]
    end

    subgraph render["email-render Worker"]
        RE["React Email<br/>Templates"]
        HTML["Rendered HTML"]
    end

    subgraph delivery["Delivery"]
        RESEND["Resend API"]
        INBOX["Wanderer inbox"]
    end

    subgraph social["Social Publishing"]
        AT["Atproto API"]
        BS["Bluesky post"]
    end

    T1 & T2 & T3 & T4 --> GW
    GW --> RL --> RE
    RE --> HTML --> RESEND --> INBOX
    GW --> LOG

    T5 --> GW
    GW --> AT --> BS

    style triggers fill:#e8f5e9,stroke:#2d5a2d,stroke-width:2px
    style zephyr fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style render fill:#fff3e0,stroke:#e65100,stroke-width:2px
    style delivery fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style social fill:#fce4ec,stroke:#c2185b,stroke-width:2px
```

---

### 11. Engine Export Map

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#e8f5e9', 'primaryTextColor': '#1a1a1a', 'primaryBorderColor': '#2e7d32', 'lineColor': '#2e7d32', 'background': '#ffffff'}}}%%
mindmap
    root(("@autumnsgrove/<br/>groveengine"))
        UI Components
            Chrome
                Header
                Footer
                Logo
            Glass
                GlassCard
                GlassButton
            Forms
                Input fields
                Validation
            Nature
                Trees
                Creatures
                Petals & Snow
            Typography
            Charts
            Gallery
            Feedback
                Toast
                Alerts
        Stores
            seasonStore
            themeStore
        Server Services
            database.ts
                queryOne / queryMany
                TenantDb proxy
            cache.ts
            storage.ts
            rate-limits
        Auth
            Heartwood client
            Session helpers
        Payments
            Stripe utilities
            Lemonsqueezy
        Email
            Zephyr client
            React Email templates
            Email sequences
        Curios
            Timeline
            Gallery
            Journey
            Reeds
            Fireside
        Grafts
            Pricing page
            Login/Signup
            Upgrades
            Photo gallery
            Uploads
        Errors
            Signpost codes
            API / Auth / Site catalogs
        Utilities
            cn helper
            CSRF
            Sanitize
            Markdown
```

---

### 12. Curios & Grafts

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#fff3e0', 'primaryTextColor': '#1a1a1a', 'primaryBorderColor': '#e65100', 'lineColor': '#e65100', 'background': '#ffffff'}}}%%
flowchart TB
    subgraph curios["Curios — Site Feature Modules"]
        direction LR
        TL["Timeline<br/><i>Blog + gutter annotations<br/>+ daily summaries</i>"]
        GL["Gallery<br/><i>Photo & media<br/>showcase</i>"]
        JR["Journey<br/><i>Step-by-step<br/>guides</i>"]
        RD["Reeds<br/><i>Comment system<br/>nested replies</i>"]
        FS["Fireside<br/><i>Community<br/>conversations</i>"]
        WP["Wisp<br/><i>Dark mode +<br/>settings panel</i>"]
        GH["Greenhouse<br/><i>Content<br/>drafting space</i>"]
        TR["Terrarium<br/><i>Component<br/>showcase</i>"]
    end

    subgraph grafts["Grafts — Reusable Feature Packages"]
        direction LR
        GP["Pricing<br/>page"]
        GN["Login /<br/>Signup"]
        GU["Upgrades /<br/>Billing"]
        GPH["Photo<br/>gallery"]
        GUP["Uploads<br/>manager"]
    end

    subgraph engine["Engine Core"]
        DB[("grove-engine-db")]
        STORE["Svelte stores"]
        COMP["UI components"]
    end

    TL & GL & JR & RD & FS --> DB
    TL & GL & JR --> STORE
    GP & GN & GU & GPH & GUP --> COMP

    style curios fill:#e8f5e9,stroke:#2d5a2d,stroke-width:2px
    style grafts fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style engine fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
```

---

## Operations

### 13. CI/CD & Deployment

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#e8eaf6', 'primaryTextColor': '#1a1a1a', 'primaryBorderColor': '#3f51b5', 'lineColor': '#3f51b5', 'background': '#ffffff'}}}%%
flowchart LR
    subgraph dev["Development"]
        CODE["Code change"]
        GW["gw git ship<br/>--write -a"]
    end

    subgraph ci["GitHub Actions"]
        LINT["Lint & Format"]
        TYPE["Type check"]
        TEST["Tests"]
        CODEQL["CodeQL<br/>Security scan"]
    end

    subgraph deploy["Deploy Targets"]
        direction TB
        DP1["deploy-engine"]
        DP2["deploy-landing"]
        DP3["deploy-plant"]
        DP4["deploy-heartwood"]
        DP5["deploy-login"]
        DP6["deploy-clearing"]
        DP7["deploy-durable-objects"]
        DP8["deploy-zephyr"]
    end

    subgraph cf["Cloudflare"]
        PAGES["Pages<br/><i>SvelteKit apps</i>"]
        WORKERS["Workers<br/><i>Services</i>"]
    end

    CODE --> GW -->|"Push to main"| ci
    LINT --> TYPE --> TEST
    TEST -->|"Pass"| deploy
    CODEQL -->|"No issues"| deploy

    DP1 & DP2 & DP3 & DP5 & DP6 --> PAGES
    DP4 & DP7 & DP8 --> WORKERS

    style dev fill:#e8f5e9,stroke:#2d5a2d,stroke-width:2px
    style ci fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style deploy fill:#fff3e0,stroke:#e65100,stroke-width:2px
    style cf fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
```

---

### 14. Storage & Media Pipeline

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#fff3e0', 'primaryTextColor': '#1a1a1a', 'primaryBorderColor': '#e65100', 'lineColor': '#e65100', 'background': '#ffffff'}}}%%
flowchart TD
    subgraph upload["Upload Flow"]
        WAN["Wanderer<br/>uploads image"]
        SHADE["Shade / Turnstile<br/>Bot check"]
        PETAL["Petal Moderation<br/>Workers AI<br/><i>Llama 4 Scout</i>"]
    end

    subgraph process["Processing"]
        OPT["Auto-optimize"]
        FMT["Format conversion<br/>JPEG → WebP / JXL"]
        HASH["IPFS content hash"]
        RESIZE["Responsive sizes"]
    end

    subgraph storage["Storage"]
        R2["grove-media (R2)"]
        DB[("image_hashes<br/>in D1")]
        CDN["Cloudflare CDN"]
    end

    subgraph tiers["Storage Tiers"]
        direction LR
        FREE["Wanderer<br/>100 MB"]
        SEED["Seedling<br/>500 MB"]
        SAP["Sapling<br/>2 GB"]
        OAK["Oak<br/>10 GB"]
        EVER["Evergreen<br/>50 GB"]
    end

    WAN --> SHADE -->|"Pass"| PETAL
    PETAL -->|"Safe"| OPT
    PETAL -->|"Flagged"| REJECT["Rejected"]
    OPT --> FMT --> HASH --> RESIZE
    RESIZE --> R2
    HASH --> DB
    R2 --> CDN

    style upload fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    style process fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style storage fill:#e8f5e9,stroke:#2d5a2d,stroke-width:2px
    style tiers fill:#fffde7,stroke:#f9a825,stroke-width:2px
```

---

_Generated for Grove Platform — February 2026_
