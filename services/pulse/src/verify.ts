/**
 * Pulse Worker — HMAC-SHA256 Signature Verification
 *
 * Verifies GitHub webhook signatures using the Web Crypto API.
 * Uses constant-time comparison to prevent timing attacks.
 */

/**
 * Verify GitHub X-Hub-Signature-256 header against the payload.
 * Returns true if the signature is valid.
 */
export async function verifySignature(
  payload: string,
  signature: string | null,
  secret: string,
): Promise<boolean> {
  if (!signature?.startsWith("sha256=")) return false;

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

  const expected =
    "sha256=" +
    Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

  // Constant-time comparison: compare all characters regardless of mismatch position
  if (signature.length !== expected.length) return false;

  let mismatch = 0;
  for (let i = 0; i < signature.length; i++) {
    mismatch |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  }

  return mismatch === 0;
}
