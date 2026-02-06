/**
 * Input validation utilities using Zod
 */

import { z } from "zod";

// Token request validation
export const tokenRequestSchema = z
  .object({
    grant_type: z.enum(["authorization_code", "refresh_token"]),
    code: z.string().optional(),
    redirect_uri: z.string().url().optional(),
    client_id: z.string().min(1, "client_id is required"),
    client_secret: z.string().min(1, "client_secret is required"),
    code_verifier: z.string().optional(),
    refresh_token: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.grant_type === "authorization_code") {
        return !!data.code && !!data.redirect_uri;
      }
      if (data.grant_type === "refresh_token") {
        return !!data.refresh_token;
      }
      return false;
    },
    {
      message: "Missing required parameters for grant type",
    },
  );

// Token revoke request validation
export const tokenRevokeSchema = z.object({
  token: z.string().min(1, "token is required"),
  token_type_hint: z.enum(["refresh_token", "access_token"]).optional(),
  client_id: z.string().min(1, "client_id is required"),
  client_secret: z.string().min(1, "client_secret is required"),
});

// Email validation helper
export function isValidEmail(email: string): boolean {
  const result = z.string().email().safeParse(email);
  return result.success;
}

// URL validation helper
export function isValidUrl(url: string): boolean {
  const result = z.string().url().safeParse(url);
  return result.success;
}

// Parse URL-encoded form data
export function parseFormData(body: string): Record<string, string> {
  const params = new URLSearchParams(body);
  const result: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  return result;
}

// Device code initiation request validation (RFC 8628)
export const deviceCodeInitSchema = z.object({
  client_id: z.string().min(1, "client_id is required"),
  scope: z.string().optional(),
});

// Device code authorization request validation (user approving/denying)
export const deviceAuthorizeSchema = z.object({
  user_code: z.string().min(1, "user_code is required"),
  action: z.enum(["approve", "deny"]),
});
