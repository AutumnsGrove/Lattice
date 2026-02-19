/**
 * Tests for Pulse Worker — HMAC Signature Verification
 *
 * Verifies that GitHub webhook signatures are correctly validated,
 * including constant-time comparison and edge cases.
 */

import { describe, it, expect } from "vitest";
import { verifySignature } from "../src/verify";

// Helper: generate a valid HMAC-SHA256 signature for a payload+secret
async function signPayload(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `sha256=${hex}`;
}

describe("verifySignature", () => {
  const secret = "whsec_test_secret_abc123";
  const payload = '{"action":"push","ref":"refs/heads/main"}';

  it("accepts a valid signature", async () => {
    const signature = await signPayload(payload, secret);
    const valid = await verifySignature(payload, signature, secret);
    expect(valid).toBe(true);
  });

  it("rejects null signature", async () => {
    const valid = await verifySignature(payload, null, secret);
    expect(valid).toBe(false);
  });

  it("rejects empty string signature", async () => {
    const valid = await verifySignature(payload, "", secret);
    expect(valid).toBe(false);
  });

  it("rejects signature without sha256= prefix", async () => {
    const signature = await signPayload(payload, secret);
    const withoutPrefix = signature.replace("sha256=", "");
    const valid = await verifySignature(payload, withoutPrefix, secret);
    expect(valid).toBe(false);
  });

  it("rejects wrong signature", async () => {
    const wrongSig = await signPayload(payload, "wrong_secret");
    const valid = await verifySignature(payload, wrongSig, secret);
    expect(valid).toBe(false);
  });

  it("rejects tampered payload", async () => {
    const signature = await signPayload(payload, secret);
    const tampered = payload + " tampered";
    const valid = await verifySignature(tampered, signature, secret);
    expect(valid).toBe(false);
  });

  it("rejects signature with wrong length", async () => {
    const valid = await verifySignature(payload, "sha256=abc", secret);
    expect(valid).toBe(false);
  });

  it("works with empty payload", async () => {
    const signature = await signPayload("", secret);
    const valid = await verifySignature("", signature, secret);
    expect(valid).toBe(true);
  });

  it("works with unicode payload", async () => {
    const unicodePayload = '{"message":"Hello 🌲"}';
    const signature = await signPayload(unicodePayload, secret);
    const valid = await verifySignature(unicodePayload, signature, secret);
    expect(valid).toBe(true);
  });
});
