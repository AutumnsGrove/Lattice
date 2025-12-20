/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "grove",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "cloudflare",
      providers: {
        cloudflare: true,
        stripe: {
          // Test keys for dev/PR, live keys for production
          apiKey:
            input?.stage === "production"
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
    // PHASE 1: Import existing Cloudflare resources (NO data loss!)
    // =========================================================================
    // Resource IDs can be overridden via env vars if preferred

    // Import existing D1 database
    const db = sst.cloudflare.D1.get(
      "GroveDB",
      process.env.CLOUDFLARE_D1_ID || "a6394da2-b7a6-48ce-b7fe-b1eb3e730e68"
    );

    // Import existing KV namespace
    const cache = sst.cloudflare.Kv.get(
      "GroveCache",
      process.env.CLOUDFLARE_KV_ID || "514e91e81cc44d128a82ec6f668303e4"
    );

    // Import existing R2 buckets
    const media = sst.cloudflare.R2.get("GroveMedia", "grove-media");
    const cdn = sst.cloudflare.R2.get("GroveCDN", "grove-cdn");

    // =========================================================================
    // PHASE 2: Stripe Products & Prices (greenfield)
    // =========================================================================

    // --- Products ---
    const seedlingProduct = new stripe.Product("Seedling", {
      name: "Seedling Plan",
      description: "Perfect for personal blogs. 50 posts, 1GB storage.",
    });

    const saplingProduct = new stripe.Product("Sapling", {
      name: "Sapling Plan",
      description: "For growing communities. 250 posts, 5GB storage.",
    });

    const oakProduct = new stripe.Product("Oak", {
      name: "Oak Plan",
      description: "Professional publishing. Unlimited posts, 20GB, BYOD.",
    });

    const evergreenProduct = new stripe.Product("Evergreen", {
      name: "Evergreen Plan",
      description: "Full-service. Unlimited posts, 100GB, domain included.",
    });

    // --- Prices (monthly + yearly at 15% off) ---
    const seedlingMonthly = new stripe.Price("SeedlingMonthly", {
      product: seedlingProduct.id,
      currency: "usd",
      unitAmount: 800, // $8/month
      recurring: { interval: "month" },
    });

    const seedlingYearly = new stripe.Price("SeedlingYearly", {
      product: seedlingProduct.id,
      currency: "usd",
      unitAmount: 8200, // $82/year
      recurring: { interval: "year" },
    });

    const saplingMonthly = new stripe.Price("SaplingMonthly", {
      product: saplingProduct.id,
      currency: "usd",
      unitAmount: 1200, // $12/month
      recurring: { interval: "month" },
    });

    const saplingYearly = new stripe.Price("SaplingYearly", {
      product: saplingProduct.id,
      currency: "usd",
      unitAmount: 12200, // $122/year
      recurring: { interval: "year" },
    });

    const oakMonthly = new stripe.Price("OakMonthly", {
      product: oakProduct.id,
      currency: "usd",
      unitAmount: 2500, // $25/month
      recurring: { interval: "month" },
    });

    const oakYearly = new stripe.Price("OakYearly", {
      product: oakProduct.id,
      currency: "usd",
      unitAmount: 25500, // $255/year
      recurring: { interval: "year" },
    });

    const evergreenMonthly = new stripe.Price("EvergreenMonthly", {
      product: evergreenProduct.id,
      currency: "usd",
      unitAmount: 3500, // $35/month
      recurring: { interval: "month" },
    });

    const evergreenYearly = new stripe.Price("EvergreenYearly", {
      product: evergreenProduct.id,
      currency: "usd",
      unitAmount: 35700, // $357/year
      recurring: { interval: "year" },
    });

    // =========================================================================
    // PHASE 3: SvelteKit Apps
    // =========================================================================

    // 3.1 Example Site (lowest risk - demo site, good for testing SST)
    const example = new sst.cloudflare.SvelteKit("Example", {
      path: "packages/example-site",
      link: [db, cache, media],
      domain: isProd ? "example.grove.place" : undefined,
      environment: {
        SITE_NAME: "The Midnight Bloom",
        CACHE_TTL_SECONDS: "3600",
      },
    });

    // 3.2 Domains App (domain search tool)
    // TODO: Uncomment when ready to migrate
    // const domains = new sst.cloudflare.SvelteKit("Domains", {
    //   path: "domains",
    //   link: [db],
    //   domain: isProd ? "domains.grove.place" : undefined,
    //   environment: {
    //     GROVEAUTH_URL: "https://auth.grove.place",
    //   },
    // });

    // 3.3 Plant App (tenant onboarding with Stripe)
    // TODO: Uncomment when ready to migrate
    // const plant = new sst.cloudflare.SvelteKit("Plant", {
    //   path: "plant",
    //   link: [db, seedlingMonthly, seedlingYearly, saplingMonthly, saplingYearly,
    //          oakMonthly, oakYearly, evergreenMonthly, evergreenYearly],
    //   domain: isProd ? "plant.grove.place" : undefined,
    //   environment: {
    //     GROVEAUTH_URL: "https://auth.grove.place",
    //   },
    // });

    // 3.4 Landing (main grove.place site)
    // TODO: Uncomment when ready to migrate
    // const landing = new sst.cloudflare.SvelteKit("Landing", {
    //   path: "landing",
    //   link: [db, cdn],
    //   domain: isProd ? "grove.place" : undefined,
    // });

    // 3.5 Engine (wildcard *.grove.place - the big one)
    // TODO: Uncomment when ready to migrate
    // const engine = new sst.cloudflare.SvelteKit("Engine", {
    //   path: "packages/engine",
    //   link: [db, cache, media],
    //   domain: isProd ? { name: "*.grove.place", zone: "grove.place" } : undefined,
    //   environment: {
    //     GROVEAUTH_URL: "https://auth.grove.place",
    //   },
    // });

    // =========================================================================
    // Outputs for debugging
    // =========================================================================
    return {
      // Cloudflare resources
      dbId: db.id,
      cacheId: cache.id,
      mediaName: media.name,
      cdnName: cdn.name,

      // Stripe price IDs (for plant/engine to reference)
      prices: {
        seedling: { monthly: seedlingMonthly.id, yearly: seedlingYearly.id },
        sapling: { monthly: saplingMonthly.id, yearly: saplingYearly.id },
        oak: { monthly: oakMonthly.id, yearly: oakYearly.id },
        evergreen: { monthly: evergreenMonthly.id, yearly: evergreenYearly.id },
      },

      // App URLs (Phase 3)
      exampleUrl: example.url,
    };
  },
});
