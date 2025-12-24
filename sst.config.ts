/// <reference path="./.sst/platform/config.d.ts" />

/**
 * SST Configuration for GroveEngine
 *
 * Unifies all Cloudflare resources previously spread across 6 wrangler.toml files:
 * - packages/engine/wrangler.toml
 * - landing/wrangler.toml
 * - plant/wrangler.toml
 * - domains/wrangler.toml
 * - packages/grove-router/wrangler.toml
 * - packages/example-site/wrangler.toml
 *
 * Run: npx sst dev (local development)
 * Run: npx sst deploy --stage production (deploy to prod)
 */

// =============================================================================
// PRODUCTION RESOURCE IDS
// =============================================================================
// These are the IDs of existing Cloudflare resources created before SST.
// We import them in production to preserve data; in dev/PR stages, SST creates new ones.
//
// To update: Change the ID here, then run `npx sst deploy --stage production`
// To find IDs: Cloudflare Dashboard → Workers & Pages → D1/KV/R2 → Copy ID
const PROD_RESOURCES = {
  D1_DATABASE_ID: "a6394da2-b7a6-48ce-b7fe-b1eb3e730e68",
  KV_NAMESPACE_ID: "514e91e81cc44d128a82ec6f668303e4",
  R2_MEDIA_BUCKET: "grove-media",
  R2_CDN_BUCKET: "grove-cdn",
} as const;

// Validate resource ID formats at config load time (fails fast if misconfigured)
const UUID_REGEX = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const HEX_ID_REGEX = /^[a-f0-9]{32}$/;
const BUCKET_NAME_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

if (!UUID_REGEX.test(PROD_RESOURCES.D1_DATABASE_ID)) {
  throw new Error(`Invalid D1_DATABASE_ID format: expected UUID, got "${PROD_RESOURCES.D1_DATABASE_ID}"`);
}
if (!HEX_ID_REGEX.test(PROD_RESOURCES.KV_NAMESPACE_ID)) {
  throw new Error(`Invalid KV_NAMESPACE_ID format: expected 32-char hex, got "${PROD_RESOURCES.KV_NAMESPACE_ID}"`);
}
if (!BUCKET_NAME_REGEX.test(PROD_RESOURCES.R2_MEDIA_BUCKET)) {
  throw new Error(`Invalid R2_MEDIA_BUCKET name: "${PROD_RESOURCES.R2_MEDIA_BUCKET}"`);
}
if (!BUCKET_NAME_REGEX.test(PROD_RESOURCES.R2_CDN_BUCKET)) {
  throw new Error(`Invalid R2_CDN_BUCKET name: "${PROD_RESOURCES.R2_CDN_BUCKET}"`);
}

export default $config({
  app(input) {
    return {
      name: "grove",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "cloudflare",
      providers: {
        cloudflare: true,
        // Stripe provider will be added in Phase 2
        // stripe: {
        //   apiKey: input?.stage === "production"
        //     ? process.env.STRIPE_SECRET_KEY
        //     : process.env.STRIPE_TEST_SECRET_KEY,
        // },
      },
    };
  },

  async run() {
    const stage = $app.stage;
    const isProd = stage === "production";

    // =========================================================================
    // SHARED RESOURCES
    // =========================================================================
    // Note: Both .get() and new D1/Kv/R2() return the same $Resource type in SST.
    // The difference is .get() imports existing resources, new creates fresh ones.

    // D1 Database - shared by all apps
    // In production, import existing database to avoid data loss
    const db = isProd
      ? sst.cloudflare.D1.get("GroveDB", PROD_RESOURCES.D1_DATABASE_ID)
      : new sst.cloudflare.D1("GroveDB");

    // KV Namespace - for caching and rate limiting
    // Used by: engine, example-site
    const cache = isProd
      ? sst.cloudflare.Kv.get("GroveCache", PROD_RESOURCES.KV_NAMESPACE_ID)
      : new sst.cloudflare.Kv("GroveCache");

    // R2 Buckets
    // grove-media: blog images, user uploads (engine, example-site)
    const media = isProd
      ? sst.cloudflare.R2.get("GroveMedia", PROD_RESOURCES.R2_MEDIA_BUCKET)
      : new sst.cloudflare.R2("GroveMedia");

    // grove-cdn: landing site assets, static files (landing, grove-router)
    const cdn = isProd
      ? sst.cloudflare.R2.get("GroveCDN", PROD_RESOURCES.R2_CDN_BUCKET)
      : new sst.cloudflare.R2("GroveCDN");

    // =========================================================================
    // STRIPE PRODUCTS (Phase 2 - uncomment when ready)
    // =========================================================================
    // Since we have no existing Stripe products, SST will create them fresh.
    //
    // WEBHOOK SETUP (after uncommenting):
    // 1. SST auto-registers webhook endpoint at: https://plant.grove.place/api/webhooks/stripe
    // 2. Webhook secret is auto-generated and linked to Plant app
    // 3. Events to subscribe: checkout.session.completed, customer.subscription.*
    //
    // SECRETS MANAGEMENT:
    // - Production: Set STRIPE_SECRET_KEY via `npx sst secret set STRIPE_SECRET_KEY sk_live_...`
    // - Dev/PR stages: Set STRIPE_TEST_SECRET_KEY for Stripe test mode
    // - Webhook secrets are managed by SST (no manual setup needed)
    //
    // PASSING PRICE IDS TO APPS:
    // After uncommenting, add to Plant's environment:
    //   environment: {
    //     STRIPE_PRICE_SEEDLING_MONTHLY: prices.seedling.monthly.id,
    //     STRIPE_PRICE_SEEDLING_YEARLY: prices.seedling.yearly.id,
    //     // ... etc for all 8 prices
    //   }
    //
    // const seedling = new stripe.Product("Seedling", {
    //   name: isProd ? "Seedling Plan" : `[${stage}] Seedling Plan`,
    //   description: "Perfect for personal blogs - 1GB storage, 3 themes",
    // });
    //
    // const sapling = new stripe.Product("Sapling", {
    //   name: isProd ? "Sapling Plan" : `[${stage}] Sapling Plan`,
    //   description: "For growing communities - 5GB storage, 10 themes",
    // });
    //
    // const oak = new stripe.Product("Oak", {
    //   name: isProd ? "Oak Plan" : `[${stage}] Oak Plan`,
    //   description: "Professional publishing - 20GB storage, customizer, custom domain",
    // });
    //
    // const evergreen = new stripe.Product("Evergreen", {
    //   name: isProd ? "Evergreen Plan" : `[${stage}] Evergreen Plan`,
    //   description: "Enterprise features - 100GB storage, custom fonts, priority support",
    // });
    //
    // // Prices (monthly)
    // const prices = {
    //   seedling: {
    //     monthly: new stripe.Price("SeedlingMonthly", {
    //       product: seedling.id,
    //       currency: "usd",
    //       unitAmount: 800, // $8.00
    //       recurring: { interval: "month" },
    //     }),
    //     yearly: new stripe.Price("SeedlingYearly", {
    //       product: seedling.id,
    //       currency: "usd",
    //       unitAmount: 8160, // $81.60 (15% off)
    //       recurring: { interval: "year" },
    //     }),
    //   },
    //   sapling: {
    //     monthly: new stripe.Price("SaplingMonthly", {
    //       product: sapling.id,
    //       currency: "usd",
    //       unitAmount: 1200, // $12.00
    //       recurring: { interval: "month" },
    //     }),
    //     yearly: new stripe.Price("SaplingYearly", {
    //       product: sapling.id,
    //       currency: "usd",
    //       unitAmount: 12240, // $122.40 (15% off)
    //       recurring: { interval: "year" },
    //     }),
    //   },
    //   oak: {
    //     monthly: new stripe.Price("OakMonthly", {
    //       product: oak.id,
    //       currency: "usd",
    //       unitAmount: 2500, // $25.00
    //       recurring: { interval: "month" },
    //     }),
    //     yearly: new stripe.Price("OakYearly", {
    //       product: oak.id,
    //       currency: "usd",
    //       unitAmount: 25500, // $255.00 (15% off)
    //       recurring: { interval: "year" },
    //     }),
    //   },
    //   evergreen: {
    //     monthly: new stripe.Price("EvergreenMonthly", {
    //       product: evergreen.id,
    //       currency: "usd",
    //       unitAmount: 3500, // $35.00
    //       recurring: { interval: "month" },
    //     }),
    //     yearly: new stripe.Price("EvergreenYearly", {
    //       product: evergreen.id,
    //       currency: "usd",
    //       unitAmount: 35700, // $357.00 (15% off)
    //       recurring: { interval: "year" },
    //     }),
    //   },
    // };

    // =========================================================================
    // SVELTEKIT APPS
    // =========================================================================
    //
    // DNS PREREQUISITES:
    // Before deploying, ensure these DNS records exist in Cloudflare:
    // - A/AAAA records for each explicit subdomain (plant, domains, example)
    // - CNAME for *.grove.place wildcard (for tenant blogs)
    // - For dev/PR stages: *.dev.grove.place and *.pr-XXX.grove.place wildcards
    //
    // SST will fail deployment if domains aren't properly configured in Cloudflare.

    /**
     * Helper for stage-based domain names
     * @param subdomain - lowercase alphanumeric with hyphens only (e.g., "plant", "pr-123")
     * @returns Full domain like "plant.grove.place" or "plant.dev.grove.place"
     */
    const getDomain = (subdomain: string): string => {
      // Validate subdomain format: 1+ chars, lowercase alphanumeric, hyphens in middle only
      if (subdomain && !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(subdomain)) {
        throw new Error(
          `Invalid subdomain "${subdomain}": must be lowercase alphanumeric, ` +
          `hyphens allowed in middle only`
        );
      }

      // Production: subdomain.grove.place or grove.place (root)
      if (isProd) return subdomain ? `${subdomain}.grove.place` : "grove.place";

      // Dev/PR stages need a subdomain - can't serve grove.place root
      if (!subdomain) {
        throw new Error(`Subdomain required for non-production stage "${stage}"`);
      }

      // Dev stage: subdomain.dev.grove.place
      if (stage === "dev") return `${subdomain}.dev.grove.place`;

      // PR previews: subdomain.pr-123.grove.place
      return `${subdomain}.${stage}.grove.place`;
    };

    // -------------------------------------------------------------------------
    // Grove Landing (grove.place)
    // Marketing site, knowledge base, pricing
    // -------------------------------------------------------------------------
    const landing = new sst.cloudflare.SvelteKit("Landing", {
      path: "landing",
      link: [db, cdn],
      environment: {
        CDN_URL: isProd ? "https://cdn.grove.place" : "http://localhost:5173/cdn",
      },
      domain: isProd ? "grove.place" : undefined,
    });

    // -------------------------------------------------------------------------
    // Grove Plant (plant.grove.place)
    // Tenant onboarding, signup flow, payment
    // -------------------------------------------------------------------------
    const plant = new sst.cloudflare.SvelteKit("Plant", {
      path: "plant",
      link: [db],
      environment: {
        GROVEAUTH_URL: "https://auth.grove.place",
        // Stripe keys will be added as secrets
      },
      domain: getDomain("plant"),
    });

    // -------------------------------------------------------------------------
    // Grove Domains (domains.grove.place)
    // Domain search and registration (Forage)
    // -------------------------------------------------------------------------
    const domains = new sst.cloudflare.SvelteKit("Domains", {
      path: "domains",
      link: [db],
      environment: {
        SITE_NAME: "Forage",
        SITE_URL: isProd ? "https://domains.grove.place" : "http://localhost:5174",
        GROVEAUTH_URL: "https://auth.grove.place",
      },
      domain: getDomain("domains"),
    });

    // -------------------------------------------------------------------------
    // GroveEngine (*.grove.place - tenant blogs)
    // Main blog engine serving all tenant subdomains
    // -------------------------------------------------------------------------
    const engine = new sst.cloudflare.SvelteKit("Engine", {
      path: "packages/engine",
      link: [db, cache, media],
      environment: {
        CACHE_TTL_SECONDS: "3600",
        GROVEAUTH_URL: "https://auth.grove.place",
      },
      // Wildcard domain for all tenant subdomains
      domain: isProd
        ? { name: "*.grove.place", zone: "grove.place" }
        : undefined,
    });

    // -------------------------------------------------------------------------
    // Example Site (example.grove.place)
    // Demo site showcasing GroveEngine features - "The Midnight Bloom"
    // -------------------------------------------------------------------------
    const exampleSite = new sst.cloudflare.SvelteKit("ExampleSite", {
      path: "packages/example-site",
      link: [db, cache, media],
      environment: {
        CACHE_TTL_SECONDS: "3600",
        SITE_NAME: "The Midnight Bloom",
        SITE_URL: isProd ? "https://example.grove.place" : "http://localhost:5175",
      },
      domain: getDomain("example"),
    });

    // =========================================================================
    // WORKERS
    // =========================================================================

    // -------------------------------------------------------------------------
    // Grove Router - DECISION: Keeping for now, may remove in Phase 5
    // -------------------------------------------------------------------------
    // The grove-router (packages/grove-router) handles *.grove.place routing.
    //
    // WITH SST (this config):
    // - Each app gets explicit domains (plant.grove.place, domains.grove.place, etc.)
    // - Engine gets wildcard (*.grove.place) for tenant blogs
    // - Router role is reduced since SST handles domain → app mapping
    //
    // ROUTER STILL NEEDED FOR:
    // 1. CDN proxying (cdn.grove.place → R2 bucket) - R2 custom domains may replace this
    // 2. Special subdomain routing (auth, admin, login → groveauth-frontend)
    // 3. www → root redirect
    // 4. Fallback for any gaps in SST wildcard coverage
    //
    // PHASE 5 DECISION:
    // After SST is fully deployed, test if all routing works without the router.
    // If yes, delete packages/grove-router entirely.
    // If no, uncomment below and document which edge cases it handles.
    //
    // const router = new sst.cloudflare.Worker("Router", {
    //   handler: "packages/grove-router/src/index.ts",
    //   link: [cdn],
    //   url: true,
    // });

    // =========================================================================
    // OUTPUTS
    // =========================================================================

    return {
      // URLs for each app
      landing: landing.url,
      plant: plant.url,
      domains: domains.url,
      engine: engine.url,
      exampleSite: exampleSite.url,

      // Resource IDs (useful for debugging)
      dbId: db.id,
      cacheId: cache.id,
      mediaId: media.id,
      cdnId: cdn.id,
    };
  },
});
