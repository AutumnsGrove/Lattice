/**
 * Test Stripe Connection
 *
 * Run this to verify your Stripe API key and price IDs are correct.
 * Usage: node --loader tsx plant/scripts/test-stripe.ts
 */

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const PRICE_ID = "price_1ShXzXRpJ6WVdxl3dwuzZX90"; // Seedling monthly

if (!STRIPE_SECRET_KEY) {
  console.error("❌ STRIPE_SECRET_KEY not set");
  console.error("Set it with: export STRIPE_SECRET_KEY=sk_test_...");
  process.exit(1);
}

console.log("🔍 Testing Stripe connection...\n");

// Test 1: Verify API key works
console.log("Test 1: Verifying API key...");
const accountResponse = await fetch("https://api.stripe.com/v1/account", {
  headers: {
    Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
  },
});

if (!accountResponse.ok) {
  console.error("❌ API key invalid or unauthorized");
  console.error(await accountResponse.text());
  process.exit(1);
}

const account = await accountResponse.json();
console.log(`✅ Connected to Stripe account: ${account.email}`);
console.log(
  `   Mode: ${STRIPE_SECRET_KEY.startsWith("sk_test") ? "TEST" : "LIVE"}`,
);
console.log(`   Account ID: ${account.id}\n`);

// Test 2: Check if price ID exists
console.log(`Test 2: Verifying price ID ${PRICE_ID}...`);
const priceResponse = await fetch(
  `https://api.stripe.com/v1/prices/${PRICE_ID}`,
  {
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
    },
  },
);

if (!priceResponse.ok) {
  console.error("❌ Price ID not found in this Stripe account");
  console.error(await priceResponse.text());
  console.log(
    "\n💡 This means your STRIPE_SECRET_KEY is from a different account",
  );
  console.log("   than where the price IDs were created.");
  console.log("\n   Solutions:");
  console.log("   1. Run 'pnpm sst:dev' to create prices in your test account");
  console.log(
    "   2. Or update plant/src/lib/server/stripe.ts with your actual price IDs",
  );
  process.exit(1);
}

const price = await priceResponse.json();
console.log(`✅ Price found: ${price.nickname || price.id}`);
console.log(
  `   Amount: $${price.unit_amount / 100} ${price.currency.toUpperCase()}`,
);
console.log(`   Recurring: ${price.recurring?.interval || "N/A"}\n`);

console.log("✅ All tests passed! Stripe is configured correctly.");
