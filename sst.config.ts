/// <reference path="./.sst/platform/config.d.ts" />
/**
 * SST Configuration for GroveEngine
 *
 * PURPOSE: Stripe integration + shared resource management
 * - Stripe products/prices as code (Phase 2)
 * - D1/KV/R2 resource definitions (documentation + staging isolation)
 *
 * NOT FOR: App deployment (SST lacks cloudflare.SvelteKit)
 * Apps deploy via wrangler.toml + GitHub Actions
 *
 * Run: pnpm sst:dev   (creates isolated dev resources)
 * Run: pnpm sst:prod  (imports existing production resources)
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
const UUID_REGEX =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const HEX_ID_REGEX = /^[a-f0-9]{32}$/;
const BUCKET_NAME_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
if (!UUID_REGEX.test(PROD_RESOURCES.D1_DATABASE_ID)) {
  throw new Error(
    `Invalid D1_DATABASE_ID format: expected UUID, got "${PROD_RESOURCES.D1_DATABASE_ID}"`,
  );
}
if (!HEX_ID_REGEX.test(PROD_RESOURCES.KV_NAMESPACE_ID)) {
  throw new Error(
    `Invalid KV_NAMESPACE_ID format: expected 32-char hex, got "${PROD_RESOURCES.KV_NAMESPACE_ID}"`,
  );
}
if (!BUCKET_NAME_REGEX.test(PROD_RESOURCES.R2_MEDIA_BUCKET)) {
  throw new Error(
    `Invalid R2_MEDIA_BUCKET name: "${PROD_RESOURCES.R2_MEDIA_BUCKET}"`,
  );
}
if (!BUCKET_NAME_REGEX.test(PROD_RESOURCES.R2_CDN_BUCKET)) {
  throw new Error(
    `Invalid R2_CDN_BUCKET name: "${PROD_RESOURCES.R2_CDN_BUCKET}"`,
  );
}
export default $config({
  app(input) {
    return {
      name: "grove",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "cloudflare",
      providers: {
        cloudflare: true,
        stripe: {
          version: "0.0.24",
          apiKey: input?.stage === "production"
            ? process.env.STRIPE_SECRET_KEY
            : process.env.STRIPE_TEST_SECRET_KEY,
        },
      },
    };
  },
  async run() {
    const stage = $app.stage;
    const isProd = stage === "production";
    // =========================================================================
    // SHARED RESOURCES
    // =========================================================================
    // Note: .get() imports existing resources, new creates fresh ones.
    // D1 and Kv have .get() methods; Bucket may need different handling for imports.
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
    // Note: For production, we'll need to handle existing bucket import separately
    // The Bucket.get() pattern may differ from D1/Kv - testing with dev stage first
    const media = new sst.cloudflare.Bucket("GroveMedia");
    // grove-cdn: landing site assets, static files (landing, grove-router)
    const cdn = new sst.cloudflare.Bucket("GroveCDN");
    // =========================================================================
    // STRIPE PRODUCTS & PRICES
    // =========================================================================
    // Creates real products/prices in Stripe:
    // - Dev stage: Creates in Stripe TEST mode (sk_test_...)
    // - Production: Creates in Stripe LIVE mode (sk_live_...)

    const seedling = new stripe.Product("Seedling", {
      name: isProd ? "Seedling Plan" : `[${stage}] Seedling Plan`,
      description: "Perfect for personal blogs - 1GB storage, 3 themes",
    });

    const sapling = new stripe.Product("Sapling", {
      name: isProd ? "Sapling Plan" : `[${stage}] Sapling Plan`,
      description: "For growing communities - 5GB storage, 10 themes",
    });

    const oak = new stripe.Product("Oak", {
      name: isProd ? "Oak Plan" : `[${stage}] Oak Plan`,
      description: "Professional publishing - 20GB storage, customizer, custom domain",
    });

    const evergreen = new stripe.Product("Evergreen", {
      name: isProd ? "Evergreen Plan" : `[${stage}] Evergreen Plan`,
      description: "Enterprise features - 100GB storage, custom fonts, priority support",
    });

    // Prices: Monthly and Yearly (15% discount)
    const prices = {
      seedling: {
        monthly: new stripe.Price("SeedlingMonthly", {
          product: seedling.id,
          currency: "usd",
          unitAmount: 800, // $8.00
          recurring: { interval: "month", intervalCount: 1 },
        }),
        yearly: new stripe.Price("SeedlingYearly", {
          product: seedling.id,
          currency: "usd",
          unitAmount: 8160, // $81.60 (15% off)
          recurring: { interval: "year", intervalCount: 1 },
        }),
      },
      sapling: {
        monthly: new stripe.Price("SaplingMonthly", {
          product: sapling.id,
          currency: "usd",
          unitAmount: 1200, // $12.00
          recurring: { interval: "month", intervalCount: 1 },
        }),
        yearly: new stripe.Price("SaplingYearly", {
          product: sapling.id,
          currency: "usd",
          unitAmount: 12240, // $122.40 (15% off)
          recurring: { interval: "year", intervalCount: 1 },
        }),
      },
      oak: {
        monthly: new stripe.Price("OakMonthly", {
          product: oak.id,
          currency: "usd",
          unitAmount: 2500, // $25.00
          recurring: { interval: "month", intervalCount: 1 },
        }),
        yearly: new stripe.Price("OakYearly", {
          product: oak.id,
          currency: "usd",
          unitAmount: 25500, // $255.00 (15% off)
          recurring: { interval: "year", intervalCount: 1 },
        }),
      },
      evergreen: {
        monthly: new stripe.Price("EvergreenMonthly", {
          product: evergreen.id,
          currency: "usd",
          unitAmount: 3500, // $35.00
          recurring: { interval: "month", intervalCount: 1 },
        }),
        yearly: new stripe.Price("EvergreenYearly", {
          product: evergreen.id,
          currency: "usd",
          unitAmount: 35700, // $357.00 (15% off)
          recurring: { interval: "year", intervalCount: 1 },
        }),
      },
    };
    // =========================================================================
    // SVELTEKIT APPS - PHASE 3 (Deferred)
    // =========================================================================
    // SST doesn't have a sst.cloudflare.SvelteKit component. Options for Phase 3:
    // 1. Use sst.cloudflare.Worker with adapter-cloudflare-workers output
    // 2. Continue using wrangler for app deployments, SST for resources only
    //
    // For now, apps continue to deploy via wrangler.toml files.
    // SST manages shared resources (D1, KV, R2) which apps reference by ID.
    // =========================================================================
    // OUTPUTS
    // =========================================================================
    return {
      // Stage info
      stage,

      // Cloudflare Resource IDs
      dbId: db.id,
      cacheId: cache.id,
      mediaName: media.name,
      cdnName: cdn.name,

      // Stripe Price IDs - use these in plant app for checkout
      stripePrices: {
        seedlingMonthly: prices.seedling.monthly.id,
        seedlingYearly: prices.seedling.yearly.id,
        saplingMonthly: prices.sapling.monthly.id,
        saplingYearly: prices.sapling.yearly.id,
        oakMonthly: prices.oak.monthly.id,
        oakYearly: prices.oak.yearly.id,
        evergreenMonthly: prices.evergreen.monthly.id,
        evergreenYearly: prices.evergreen.yearly.id,
      },
    };
  },
});
