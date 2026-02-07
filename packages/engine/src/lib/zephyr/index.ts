/**
 * Zephyr Email Gateway & Social Broadcasting
 *
 * Client for the unified email and social cross-posting service.
 */

export { ZephyrClient, zephyr } from "./client";
export { createZephyrClient } from "./factory";
export type {
  ZephyrRequest,
  ZephyrResponse,
  ZephyrConfig,
  EmailType,
  ZephyrErrorCode,
  BroadcastRequest,
  BroadcastResponse,
  SocialDelivery,
  SocialPlatform,
} from "./types";
