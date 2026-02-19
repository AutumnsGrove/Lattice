/**
 * Email Sending Utility
 *
 * Uses Zephyr email gateway for transactional emails.
 */

import { ZephyrClient } from "@autumnsgrove/lattice/zephyr";

const DEFAULT_ZEPHYR_URL = "https://grove-zephyr.m7jv4v7npb.workers.dev";

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
  zephyrUrl?: string;
  zephyrApiKey: string;
}): Promise<{ success: boolean; error?: string }> {
  const zephyr = new ZephyrClient({
    baseUrl: params.zephyrUrl || DEFAULT_ZEPHYR_URL,
    apiKey: params.zephyrApiKey,
  });

  const result = await zephyr.sendRaw({
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
    type: "verification",
  });

  if (!result.success) {
    console.error("[Zephyr] Error:", result.errorMessage);
    return { success: false, error: result.errorMessage };
  }

  return { success: true };
}
