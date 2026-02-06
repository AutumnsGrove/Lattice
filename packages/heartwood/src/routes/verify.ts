/**
 * Verify Routes - Token verification and user info
 */

import { Hono } from "hono";
import type { Env, TokenInfo, UserInfo } from "../types.js";
import { getUserById, revokeAllUserTokens } from "../db/queries.js";
import { verifyAccessToken } from "../services/jwt.js";
import { logLogout } from "../services/user.js";
import { getClientIP, getUserAgent } from "../middleware/security.js";
import { createDbSession } from "../db/session.js";

const verify = new Hono<{ Bindings: Env }>();

/**
 * GET /verify - Verify an access token (OAuth 2.0 Token Introspection)
 */
verify.get("/", async (c) => {
  // Note: This route only verifies JWTs, no database access needed
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // Per OAuth 2.0 introspection spec, return inactive for invalid tokens
    const response: TokenInfo = { active: false };
    return c.json(response);
  }

  const token = authHeader.substring(7);
  const payload = await verifyAccessToken(c.env, token);

  if (!payload) {
    const response: TokenInfo = { active: false };
    return c.json(response);
  }

  // Token is valid
  // Note: email and name intentionally excluded - clients should use /userinfo endpoint
  const response: TokenInfo = {
    active: true,
    sub: payload.sub,
    exp: payload.exp,
    iat: payload.iat,
    client_id: payload.client_id,
  };

  return c.json(response);
});

/**
 * GET /userinfo - Get current user information
 */
verify.get("/userinfo", async (c) => {
  const db = createDbSession(c.env);
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json(
      { error: "invalid_token", error_description: "Missing or invalid token" },
      401,
    );
  }

  const token = authHeader.substring(7);
  const payload = await verifyAccessToken(c.env, token);

  if (!payload) {
    return c.json(
      {
        error: "invalid_token",
        error_description: "Token is invalid or expired",
      },
      401,
    );
  }

  // Get full user info from database
  const user = await getUserById(db, payload.sub);

  if (!user) {
    // SECURITY: Return same error as invalid token to prevent user enumeration
    // (attacker with token for deleted user shouldn't learn user was deleted)
    return c.json(
      {
        error: "invalid_token",
        error_description: "Token is invalid or expired",
      },
      401,
    );
  }

  const response: UserInfo = {
    sub: user.id,
    email: user.email,
    name: user.name,
    picture: user.avatar_url,
    provider: user.provider,
  };

  return c.json(response);
});

/**
 * POST /logout - Logout user and revoke all tokens
 */
verify.post("/logout", async (c) => {
  const db = createDbSession(c.env);
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json(
      { error: "invalid_token", error_description: "Missing or invalid token" },
      401,
    );
  }

  const token = authHeader.substring(7);
  const payload = await verifyAccessToken(c.env, token);

  if (!payload) {
    return c.json(
      {
        error: "invalid_token",
        error_description: "Token is invalid or expired",
      },
      401,
    );
  }

  // Revoke all refresh tokens for this user
  await revokeAllUserTokens(db, payload.sub);

  // Log the logout
  await logLogout(db, payload.sub, {
    client_id: payload.client_id,
    ip_address: getClientIP(c.req.raw),
    user_agent: getUserAgent(c.req.raw),
  });

  // Parse optional redirect URI from body
  let redirectUri: string | undefined;
  try {
    const body = await c.req.json<{ redirect_uri?: string }>();
    redirectUri = body.redirect_uri;
  } catch {
    // No body or invalid JSON, that's fine
  }

  return c.json({
    success: true,
    redirect_uri: redirectUri,
  });
});

export default verify;
