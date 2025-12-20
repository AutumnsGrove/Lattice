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

    // Import existing D1 database
    const db = sst.cloudflare.D1.get(
      "GroveDB",
      "a6394da2-b7a6-48ce-b7fe-b1eb3e730e68"
    );

    // Import existing KV namespace
    const cache = sst.cloudflare.Kv.get(
      "GroveCache",
      "514e91e81cc44d128a82ec6f668303e4"
    );

    // Import existing R2 bucket
    const media = sst.cloudflare.R2.get("GroveMedia", "grove-media");

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
    // PHASE 3 (LATER): SvelteKit Apps
    // =========================================================================
    // Will add: Engine, Landing, Plant, Domains workers here

    // =========================================================================
    // Outputs for debugging
    // =========================================================================
    return {
      dbId: db.id,
      cacheId: cache.id,
      mediaName: media.name,
      // Stripe price IDs (for plant/engine to reference)
      prices: {
        seedling: { monthly: seedlingMonthly.id, yearly: seedlingYearly.id },
        sapling: { monthly: saplingMonthly.id, yearly: saplingYearly.id },
        oak: { monthly: oakMonthly.id, yearly: oakYearly.id },
        evergreen: { monthly: evergreenMonthly.id, yearly: evergreenYearly.id },
      },
    };
  },
});
