/**
 * Subscription Routes - User subscription management and post limits
 */

import { Hono } from "hono";
import type { Env, SubscriptionTier } from "../types.js";
import {
  getUserSubscription,
  getOrCreateUserSubscription,
  canUserCreatePost,
  incrementPostCount,
  decrementPostCount,
  setPostCount,
  updateSubscriptionTier,
  getSubscriptionStatus,
} from "../db/queries.js";
import { verifyAccessToken } from "../services/jwt.js";
import { createDbSession } from "../db/session.js";

const subscription = new Hono<{ Bindings: Env }>();

/**
 * Helper to extract and verify Bearer token
 */
async function verifyBearerToken(c: {
  req: { header: (name: string) => string | undefined };
  env: Env;
}) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.substring(7);
  return verifyAccessToken(c.env, token);
}

/**
 * GET /subscription - Get current user's subscription (requires Bearer token)
 */
subscription.get("/", async (c) => {
  const payload = await verifyBearerToken(c);
  if (!payload) {
    return c.json(
      { error: "unauthorized", error_description: "Missing or invalid token" },
      401,
    );
  }

  const db = createDbSession(c.env);
  const sub = await getOrCreateUserSubscription(db, payload.sub);
  const status = getSubscriptionStatus(sub);

  return c.json({
    subscription: sub,
    status,
  });
});

/**
 * GET /subscription/:userId - Get specific user's subscription
 */
subscription.get("/:userId", async (c) => {
  const payload = await verifyBearerToken(c);
  if (!payload) {
    return c.json(
      { error: "unauthorized", error_description: "Missing or invalid token" },
      401,
    );
  }

  const requestedUserId = c.req.param("userId");
  if (payload.sub !== requestedUserId) {
    return c.json(
      {
        error: "forbidden",
        error_description: "Cannot access other user data",
      },
      403,
    );
  }

  const db = createDbSession(c.env);
  const userId = c.req.param("userId");
  const sub = await getUserSubscription(db, userId);

  if (!sub) {
    return c.json(
      { error: "not_found", error_description: "Subscription not found" },
      404,
    );
  }

  const status = getSubscriptionStatus(sub);

  return c.json({
    subscription: sub,
    status,
  });
});

/**
 * GET /subscription/:userId/can-post - Check if user can create a post
 */
subscription.get("/:userId/can-post", async (c) => {
  const payload = await verifyBearerToken(c);
  if (!payload) {
    return c.json(
      { error: "unauthorized", error_description: "Missing or invalid token" },
      401,
    );
  }

  const requestedUserId = c.req.param("userId");
  if (payload.sub !== requestedUserId) {
    return c.json(
      {
        error: "forbidden",
        error_description: "Cannot access other user data",
      },
      403,
    );
  }

  const db = createDbSession(c.env);
  const userId = c.req.param("userId");
  const result = await canUserCreatePost(db, userId);

  return c.json(result);
});

/**
 * POST /subscription/:userId/post-count - Update post count
 * Body: { action: 'increment' | 'decrement' } or { count: number }
 */
subscription.post("/:userId/post-count", async (c) => {
  const payload = await verifyBearerToken(c);
  if (!payload) {
    return c.json(
      { error: "unauthorized", error_description: "Missing or invalid token" },
      401,
    );
  }

  const requestedUserId = c.req.param("userId");
  if (payload.sub !== requestedUserId) {
    return c.json(
      {
        error: "forbidden",
        error_description: "Cannot access other user data",
      },
      403,
    );
  }

  const db = createDbSession(c.env);
  const userId = c.req.param("userId");

  let body: { action?: "increment" | "decrement"; count?: number };
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      { error: "invalid_request", error_description: "Invalid JSON body" },
      400,
    );
  }

  let updatedSub;

  if (body.action === "increment") {
    updatedSub = await incrementPostCount(db, userId);
  } else if (body.action === "decrement") {
    updatedSub = await decrementPostCount(db, userId);
  } else if (typeof body.count === "number") {
    updatedSub = await setPostCount(db, userId, body.count);
  } else {
    return c.json(
      {
        error: "invalid_request",
        error_description:
          'Body must contain either { action: "increment" | "decrement" } or { count: number }',
      },
      400,
    );
  }

  if (!updatedSub) {
    return c.json(
      { error: "not_found", error_description: "Subscription not found" },
      404,
    );
  }

  const status = getSubscriptionStatus(updatedSub);

  return c.json({
    subscription: updatedSub,
    status,
  });
});

/**
 * PUT /subscription/:userId/tier - Update subscription tier
 * Body: { tier: 'seedling' | 'sapling' | 'evergreen' | 'canopy' | 'platform' }
 */
subscription.put("/:userId/tier", async (c) => {
  const payload = await verifyBearerToken(c);
  if (!payload) {
    return c.json(
      { error: "unauthorized", error_description: "Missing or invalid token" },
      401,
    );
  }

  const requestedUserId = c.req.param("userId");
  if (payload.sub !== requestedUserId) {
    return c.json(
      {
        error: "forbidden",
        error_description: "Cannot access other user data",
      },
      403,
    );
  }

  const db = createDbSession(c.env);
  const userId = c.req.param("userId");

  let body: { tier?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      { error: "invalid_request", error_description: "Invalid JSON body" },
      400,
    );
  }

  const validTiers: SubscriptionTier[] = [
    "seedling",
    "sapling",
    "evergreen",
    "canopy",
    "platform",
  ];
  if (!body.tier || !validTiers.includes(body.tier as SubscriptionTier)) {
    return c.json(
      {
        error: "invalid_request",
        error_description:
          'Body must contain { tier: "seedling" | "sapling" | "evergreen" | "canopy" | "platform" }',
      },
      400,
    );
  }

  // Ensure subscription exists first
  await getOrCreateUserSubscription(db, userId);

  const updatedSub = await updateSubscriptionTier(
    db,
    userId,
    body.tier as SubscriptionTier,
  );

  if (!updatedSub) {
    return c.json(
      { error: "not_found", error_description: "Subscription not found" },
      404,
    );
  }

  const status = getSubscriptionStatus(updatedSub);

  return c.json({
    subscription: updatedSub,
    status,
  });
});

export default subscription;
