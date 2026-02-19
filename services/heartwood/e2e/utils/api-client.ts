/**
 * Direct API Client for E2E Tests
 *
 * Provides typed methods for calling GroveAuth API endpoints directly,
 * bypassing the UI. Useful for:
 * - Test setup (creating preconditions)
 * - Verification (checking state after UI actions)
 * - Device flow testing (CLI simulation)
 */

import type { APIRequestContext } from "@playwright/test";

/** API base URL */
const API_BASE_URL = process.env.E2E_API_URL || "http://localhost:8787";

/**
 * Device code flow response (RFC 8628)
 */
export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  expires_in: number;
  interval: number;
}

/**
 * Token response
 */
export interface TokenResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

/**
 * Device code poll error
 */
export interface DeviceCodeError {
  error:
    | "authorization_pending"
    | "slow_down"
    | "access_denied"
    | "expired_token";
  error_description?: string;
}

/**
 * Create an API client for E2E tests
 */
export function createApiClient(request: APIRequestContext) {
  return {
    /**
     * Initiate device code flow (simulates CLI starting auth)
     */
    async initiateDeviceCode(clientId: string): Promise<DeviceCodeResponse> {
      const response = await request.post(`${API_BASE_URL}/auth/device-code`, {
        form: { client_id: clientId },
      });

      if (!response.ok()) {
        const error = await response.text();
        throw new Error(`Failed to initiate device code: ${error}`);
      }

      return response.json();
    },

    /**
     * Poll for device code authorization (simulates CLI polling)
     */
    async pollDeviceCode(
      deviceCode: string,
      clientId: string,
    ): Promise<TokenResponse | DeviceCodeError> {
      const response = await request.post(`${API_BASE_URL}/token`, {
        form: {
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
          device_code: deviceCode,
          client_id: clientId,
        },
      });

      const data = await response.json();

      if (!response.ok()) {
        return data as DeviceCodeError;
      }

      return data as TokenResponse;
    },

    /**
     * Get current session info
     */
    async getSession(): Promise<{ user: any; session: any } | null> {
      const response = await request.get(`${API_BASE_URL}/api/auth/session`);

      if (!response.ok()) {
        return null;
      }

      const data = await response.json();
      return data.session ? data : null;
    },

    /**
     * Verify an access token
     */
    async verifyToken(
      token: string,
    ): Promise<{ active: boolean; sub?: string; email?: string }> {
      const response = await request.get(`${API_BASE_URL}/verify`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.json();
    },

    /**
     * Get user info from access token
     */
    async getUserInfo(
      token: string,
    ): Promise<{ sub: string; email: string; name: string | null }> {
      const response = await request.get(`${API_BASE_URL}/userinfo`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok()) {
        throw new Error(`Failed to get user info: ${response.status()}`);
      }

      return response.json();
    },

    /**
     * Check API health
     */
    async healthCheck(): Promise<{ status: string }> {
      const response = await request.get(`${API_BASE_URL}/health`);
      return response.json();
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
