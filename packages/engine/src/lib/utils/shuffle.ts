/**
 * Seeded shuffle for consistent daily ordering
 * Uses a simple LCG (Linear Congruential Generator) seeded with the date
 *
 * This is used by the Canopy directory to provide consistent daily ordering
 * while ensuring fair rotation of listings.
 *
 * @example
 * const today = new Date().toISOString().slice(0, 10);
 * const shuffled = seededShuffle(wanderers, today);
 *
 * @param array - The array to shuffle
 * @param seed - A string seed for deterministic ordering
 * @returns A new shuffled array
 */
export function seededShuffle<T>(array: T[], seed: string): T[] {
  // Create a numeric seed from the date string
  let seedNum = 0;
  for (let i = 0; i < seed.length; i++) {
    seedNum = (seedNum << 5) - seedNum + seed.charCodeAt(i);
    seedNum |= 0; // Convert to 32bit integer
  }

  // LCG parameters
  const a = 1664525;
  const c = 1013904223;
  const m = 2 ** 32;

  // Fisher-Yates shuffle with seeded random
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    seedNum = (a * seedNum + c) % m;
    const j = Math.abs(seedNum) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}
