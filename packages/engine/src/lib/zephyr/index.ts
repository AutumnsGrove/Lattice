/**
 * Zephyr Email Gateway
 *
 * Client for the unified email service.
 */

export { ZephyrClient, zephyr } from "./client";
export { createZephyrClient } from "./factory";
export type {
  ZephyrRequest,
  ZephyrResponse,
  ZephyrConfig,
  EmailType,
  ZephyrErrorCode,
} from "./types";
