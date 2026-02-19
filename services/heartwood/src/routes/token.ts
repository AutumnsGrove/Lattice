/**
 * Token Routes - Token exchange, refresh, and revocation
 */

import { Hono, type Context } from "hono";
import type { Env, TokenResponse } from "../types.js";
import {
  getClientByClientId,
  consumeAuthCode,
  getUserById,
  createRefreshToken,
  getRefreshTokenByHash,
  revokeRefreshToken,
  getDeviceCodeByHash,
  updateDevicePollCount,
  incrementDeviceInterval,
  deleteDeviceCode,
  createAuditLog,
} from "../db/queries.js";
import { createDbSession } from "../db/session.js";
import { parseFormData } from "../utils/validation.js";
import {
  generateRefreshToken,
  hashSecret,
  verifySecret,
  verifyCodeChallenge,
} from "../utils/crypto.js";
import { createAccessToken } from "../services/jwt.js";
import {
  logTokenExchange,
  logTokenRefresh,
  logTokenRevoke,
} from "../services/user.js";
import { getClientIP, getUserAgent } from "../middleware/security.js";
import { checkRouteRateLimit } from "../middleware/rateLimit.js";
import {
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY,
  RATE_LIMIT_TOKEN_PER_CLIENT,
  DEVICE_CODE_SLOW_DOWN_INCREMENT,
} from "../utils/constants.js";

const token = new Hono<{ Bindings: Env }>();

/**
 * POST /token - Exchange authorization code for tokens
 */
token.post("/", async (c) => {
  const db = createDbSession(c.env);

  // Parse form data
  const bodyText = await c.req.text();
  const params = parseFormData(bodyText);

  const grantType = params.grant_type;

  // Route to appropriate handler based on grant type
  if (grantType === "authorization_code") {
    return handleAuthorizationCodeGrant(c, params, db);
  } else if (grantType === "refresh_token") {
    return handleRefreshTokenGrant(c, params, db);
  } else if (grantType === "urn:ietf:params:oauth:grant-type:device_code") {
    return handleDeviceCodeGrant(c, params, db);
  } else {
    return c.json(
      {
        error: "unsupported_grant_type",
        error_description: "Grant type not supported",
      },
      400,
    );
  }
});

/**
 * POST /token/refresh - Refresh access token (alias for grant_type=refresh_token)
 */
token.post("/refresh", async (c) => {
  const db = createDbSession(c.env);

  const bodyText = await c.req.text();
  const params = parseFormData(bodyText);
  params.grant_type = "refresh_token";
  return handleRefreshTokenGrant(c, params, db);
});

/**
 * POST /token/revoke - Revoke a refresh token
 */
token.post("/revoke", async (c) => {
  const db = createDbSession(c.env);

  const bodyText = await c.req.text();
  const params = parseFormData(bodyText);

  const { token: tokenValue, client_id, client_secret } = params;

  if (!tokenValue || !client_id || !client_secret) {
    return c.json(
      {
        error: "invalid_request",
        error_description: "Missing required parameters",
      },
      400,
    );
  }

  // Validate client credentials
  const client = await getClientByClientId(db, client_id);
  if (!client) {
    return c.json(
      { error: "invalid_client", error_description: "Client not found" },
      401,
    );
  }

  const secretValid = await verifySecret(
    client_secret,
    client.client_secret_hash,
  );
  if (!secretValid) {
    return c.json(
      {
        error: "invalid_client",
        error_description: "Invalid client credentials",
      },
      401,
    );
  }

  // Revoke the token
  const tokenHash = await hashSecret(tokenValue);
  const existingToken = await getRefreshTokenByHash(db, tokenHash);

  if (existingToken) {
    await revokeRefreshToken(db, tokenHash);

    // Log the revocation
    await logTokenRevoke(db, existingToken.user_id, {
      client_id,
      ip_address: getClientIP(c.req.raw),
      user_agent: getUserAgent(c.req.raw),
    });
  }

  // Always return success per RFC 7009
  return c.json({ success: true });
});

/**
 * Handle authorization_code grant type
 */
async function handleAuthorizationCodeGrant(
  c: Context<{ Bindings: Env }>,
  params: Record<string, string>,
  db: ReturnType<D1Database["withSession"]>,
) {
  const { code, redirect_uri, client_id, client_secret, code_verifier } =
    params;

  if (!code || !redirect_uri || !client_id || !client_secret) {
    return c.json(
      {
        error: "invalid_request",
        error_description: "Missing required parameters",
      },
      400,
    );
  }

  // Rate limit check - use IP + client_id to prevent bypass via different client IDs
  const clientIP = getClientIP(c.req.raw) || "unknown";
  const rateLimitKey = `${clientIP}:${client_id}`;
  const rateLimit = await checkRouteRateLimit(
    db,
    "token",
    rateLimitKey,
    RATE_LIMIT_TOKEN_PER_CLIENT,
  );
  if (!rateLimit.allowed) {
    return c.json(
      {
        error: "rate_limit",
        error_description: "Too many requests",
        retry_after: rateLimit.retryAfter,
      },
      429,
    );
  }

  // Validate client credentials
  const client = await getClientByClientId(db, client_id);
  if (!client) {
    return c.json(
      { error: "invalid_client", error_description: "Client not found" },
      401,
    );
  }

  const secretValid = await verifySecret(
    client_secret,
    client.client_secret_hash,
  );
  if (!secretValid) {
    return c.json(
      {
        error: "invalid_client",
        error_description: "Invalid client credentials",
      },
      401,
    );
  }

  // Atomically consume auth code - validates and marks as used in a single operation
  // This prevents race conditions where concurrent requests could both pass validation
  const authCode = await consumeAuthCode(db, code, client_id);

  if (!authCode) {
    return c.json(
      {
        error: "invalid_grant",
        error_description:
          "Authorization code invalid, expired, or already used",
      },
      400,
    );
  }

  // Validate redirect_uri matches (not checked in atomic query for security - must match exactly)
  if (authCode.redirect_uri !== redirect_uri) {
    return c.json(
      { error: "invalid_grant", error_description: "Redirect URI mismatch" },
      400,
    );
  }

  // PKCE is mandatory per OAuth 2.1 spec to prevent authorization code interception
  if (!authCode.code_challenge) {
    return c.json(
      {
        error: "invalid_request",
        error_description: "PKCE code_challenge is required for all clients",
      },
      400,
    );
  }

  if (!authCode.code_challenge_method) {
    return c.json(
      {
        error: "invalid_request",
        error_description:
          "code_challenge_method required when code_challenge is present",
      },
      400,
    );
  }

  if (!code_verifier) {
    return c.json(
      { error: "invalid_grant", error_description: "Code verifier required" },
      400,
    );
  }

  const valid = await verifyCodeChallenge(
    code_verifier,
    authCode.code_challenge,
    authCode.code_challenge_method,
  );

  if (!valid) {
    return c.json(
      { error: "invalid_grant", error_description: "PKCE verification failed" },
      400,
    );
  }

  // Get user
  const user = await getUserById(db, authCode.user_id);
  if (!user) {
    return c.json(
      { error: "invalid_grant", error_description: "User not found" },
      400,
    );
  }

  // Generate tokens
  const accessToken = await createAccessToken(c.env, user, client_id);
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = await hashSecret(refreshToken);
  const refreshExpiresAt = new Date(
    Date.now() + REFRESH_TOKEN_EXPIRY * 1000,
  ).toISOString();

  await createRefreshToken(db, {
    token_hash: refreshTokenHash,
    user_id: user.id,
    client_id: client_id,
    expires_at: refreshExpiresAt,
  });

  // Log the exchange
  await logTokenExchange(db, user.id, {
    client_id,
    ip_address: getClientIP(c.req.raw),
    user_agent: getUserAgent(c.req.raw),
  });

  const response: TokenResponse = {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_EXPIRY,
    refresh_token: refreshToken,
    scope: "openid email profile",
  };

  return c.json(response);
}

/**
 * Handle refresh_token grant type
 */
async function handleRefreshTokenGrant(
  c: Context<{ Bindings: Env }>,
  params: Record<string, string>,
  db: ReturnType<D1Database["withSession"]>,
) {
  const { refresh_token, client_id, client_secret } = params;

  if (!refresh_token || !client_id || !client_secret) {
    return c.json(
      {
        error: "invalid_request",
        error_description: "Missing required parameters",
      },
      400,
    );
  }

  // Rate limit check - use IP + client_id to prevent bypass via different client IDs
  const clientIP = getClientIP(c.req.raw) || "unknown";
  const rateLimitKey = `${clientIP}:${client_id}`;
  const rateLimit = await checkRouteRateLimit(
    db,
    "token",
    rateLimitKey,
    RATE_LIMIT_TOKEN_PER_CLIENT,
  );
  if (!rateLimit.allowed) {
    return c.json(
      {
        error: "rate_limit",
        error_description: "Too many requests",
        retry_after: rateLimit.retryAfter,
      },
      429,
    );
  }

  // Validate client credentials
  const client = await getClientByClientId(db, client_id);
  if (!client) {
    return c.json(
      { error: "invalid_client", error_description: "Client not found" },
      401,
    );
  }

  const secretValid = await verifySecret(
    client_secret,
    client.client_secret_hash,
  );
  if (!secretValid) {
    return c.json(
      {
        error: "invalid_client",
        error_description: "Invalid client credentials",
      },
      401,
    );
  }

  // Validate refresh token
  const tokenHash = await hashSecret(refresh_token);
  const existingToken = await getRefreshTokenByHash(db, tokenHash);

  if (!existingToken) {
    return c.json(
      { error: "invalid_grant", error_description: "Invalid refresh token" },
      400,
    );
  }

  if (existingToken.client_id !== client_id) {
    return c.json(
      { error: "invalid_grant", error_description: "Client mismatch" },
      400,
    );
  }

  if (new Date(existingToken.expires_at) < new Date()) {
    return c.json(
      { error: "invalid_grant", error_description: "Refresh token expired" },
      400,
    );
  }

  // Revoke old refresh token (rotation)
  await revokeRefreshToken(db, tokenHash);

  // Get user
  const user = await getUserById(db, existingToken.user_id);
  if (!user) {
    return c.json(
      { error: "invalid_grant", error_description: "User not found" },
      400,
    );
  }

  // Generate new tokens
  const accessToken = await createAccessToken(c.env, user, client_id);
  const newRefreshToken = generateRefreshToken();
  const newRefreshTokenHash = await hashSecret(newRefreshToken);
  const refreshExpiresAt = new Date(
    Date.now() + REFRESH_TOKEN_EXPIRY * 1000,
  ).toISOString();

  await createRefreshToken(db, {
    token_hash: newRefreshTokenHash,
    user_id: user.id,
    client_id: client_id,
    expires_at: refreshExpiresAt,
  });

  // Log the refresh
  await logTokenRefresh(db, user.id, {
    client_id,
    ip_address: getClientIP(c.req.raw),
    user_agent: getUserAgent(c.req.raw),
  });

  const response: TokenResponse = {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_EXPIRY,
    refresh_token: newRefreshToken,
    scope: "openid email profile",
  };

  return c.json(response);
}

/**
 * Handle urn:ietf:params:oauth:grant-type:device_code grant type (RFC 8628)
 *
 * This is called by the CLI to poll for authorization status.
 * Returns tokens when user approves, or appropriate error codes otherwise.
 */
async function handleDeviceCodeGrant(
  c: Context<{ Bindings: Env }>,
  params: Record<string, string>,
  db: ReturnType<D1Database["withSession"]>,
) {
  const { device_code, client_id } = params;

  if (!device_code || !client_id) {
    return c.json(
      {
        error: "invalid_request",
        error_description: "Missing required parameters",
      },
      400,
    );
  }

  // Validate client exists (no secret required for device flow per RFC 8628)
  const client = await getClientByClientId(db, client_id);
  if (!client) {
    return c.json(
      { error: "invalid_client", error_description: "Client not found" },
      401,
    );
  }

  // Hash the device code to look it up
  const deviceCodeHash = await hashSecret(device_code);
  const deviceCodeRecord = await getDeviceCodeByHash(db, deviceCodeHash);

  if (!deviceCodeRecord) {
    return c.json(
      { error: "invalid_grant", error_description: "Invalid device code" },
      400,
    );
  }

  // Verify client_id matches
  if (deviceCodeRecord.client_id !== client_id) {
    return c.json(
      { error: "invalid_grant", error_description: "Client mismatch" },
      400,
    );
  }

  const now = Math.floor(Date.now() / 1000);

  // Check if code has expired
  if (deviceCodeRecord.expires_at < now) {
    return c.json(
      { error: "expired_token", error_description: "Device code has expired" },
      400,
    );
  }

  // Check polling rate (slow_down detection)
  // If last_poll_at exists and was too recent, return slow_down and increase interval
  if (deviceCodeRecord.last_poll_at) {
    const timeSinceLastPoll = now - deviceCodeRecord.last_poll_at;
    if (timeSinceLastPoll < deviceCodeRecord.interval) {
      // Polling too fast - increment the required interval
      await incrementDeviceInterval(
        db,
        deviceCodeRecord.id,
        DEVICE_CODE_SLOW_DOWN_INCREMENT,
      );
      return c.json(
        {
          error: "slow_down",
          error_description: `Poll interval increased to ${deviceCodeRecord.interval + DEVICE_CODE_SLOW_DOWN_INCREMENT} seconds`,
          interval: deviceCodeRecord.interval + DEVICE_CODE_SLOW_DOWN_INCREMENT,
        },
        400,
      );
    }
  }

  // Update poll count and last_poll_at
  await updateDevicePollCount(db, deviceCodeRecord.id);

  // Check authorization status
  switch (deviceCodeRecord.status) {
    case "pending":
      return c.json(
        {
          error: "authorization_pending",
          error_description: "User has not yet authorized",
        },
        400,
      );

    case "denied":
      // Delete the device code record
      await deleteDeviceCode(db, deviceCodeRecord.id);
      return c.json(
        {
          error: "access_denied",
          error_description: "User denied the authorization request",
        },
        400,
      );

    case "expired":
      return c.json(
        {
          error: "expired_token",
          error_description: "Device code has expired",
        },
        400,
      );

    case "authorized":
      // User approved - issue tokens
      break;

    default:
      return c.json(
        {
          error: "server_error",
          error_description: "Invalid device code status",
        },
        500,
      );
  }

  // Get the user who authorized
  if (!deviceCodeRecord.user_id) {
    return c.json(
      { error: "server_error", error_description: "Authorization incomplete" },
      500,
    );
  }

  const user = await getUserById(db, deviceCodeRecord.user_id);
  if (!user) {
    return c.json(
      { error: "invalid_grant", error_description: "User not found" },
      400,
    );
  }

  // Generate tokens
  const accessToken = await createAccessToken(c.env, user, client_id);
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = await hashSecret(refreshToken);
  const refreshExpiresAt = new Date(
    Date.now() + REFRESH_TOKEN_EXPIRY * 1000,
  ).toISOString();

  await createRefreshToken(db, {
    token_hash: refreshTokenHash,
    user_id: user.id,
    client_id: client_id,
    expires_at: refreshExpiresAt,
  });

  // Log the device code token exchange
  await createAuditLog(db, {
    event_type: "device_code_polled",
    user_id: user.id,
    client_id,
    ip_address: getClientIP(c.req.raw),
    user_agent: getUserAgent(c.req.raw),
    details: { action: "token_issued", user_code: deviceCodeRecord.user_code },
  });

  // Delete the device code record (one-time use)
  await deleteDeviceCode(db, deviceCodeRecord.id);

  const response: TokenResponse = {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_EXPIRY,
    refresh_token: refreshToken,
    scope: deviceCodeRecord.scope || "openid email profile",
  };

  return c.json(response);
}

export default token;
