/**
 * Ambient Sounds Curio
 *
 * Optional background audio for an immersive grove experience.
 * NEVER autoplay — always requires explicit user click.
 *
 * Features:
 * - Curated sound sets (forest rain, morning birds, creek, etc.)
 * - Volume control with localStorage persistence
 * - Seamless looping
 * - Seasonal auto-selection
 * - Custom upload support (Oak+)
 */

// =============================================================================
// Types
// =============================================================================

export type SoundSet =
  | "forest-rain"
  | "morning-birds"
  | "creek"
  | "night"
  | "lo-fi"
  | "fireplace"
  | "seasonal";

export interface AmbientConfigRecord {
  tenantId: string;
  soundSet: SoundSet;
  volume: number;
  enabled: boolean;
  customUrl: string | null;
  updatedAt: string;
}

export interface AmbientConfigDisplay {
  soundSet: SoundSet;
  volume: number;
  enabled: boolean;
  customUrl: string | null;
}

// =============================================================================
// Constants
// =============================================================================

export const SOUND_SET_OPTIONS: {
  value: SoundSet;
  label: string;
  description: string;
}[] = [
  {
    value: "forest-rain",
    label: "Forest Rain",
    description: "Gentle rainfall and distant thunder",
  },
  {
    value: "morning-birds",
    label: "Morning Birds",
    description: "Dawn chorus in the grove",
  },
  {
    value: "creek",
    label: "Creek",
    description: "Flowing water and gentle currents",
  },
  {
    value: "night",
    label: "Night",
    description: "Crickets, owls, and soft wind",
  },
  { value: "lo-fi", label: "Lo-fi", description: "Royalty-free ambient beats" },
  {
    value: "fireplace",
    label: "Fireplace",
    description: "Crackling fire warmth",
  },
  {
    value: "seasonal",
    label: "Seasonal",
    description: "Auto-selects by Grove season",
  },
];

export const VALID_SOUND_SETS = new Set<string>(
  SOUND_SET_OPTIONS.map((s) => s.value),
);

export const MIN_VOLUME = 0;
export const MAX_VOLUME = 100;
export const DEFAULT_VOLUME = 30;

// =============================================================================
// Utility Functions
// =============================================================================

export function isValidSoundSet(set: string): set is SoundSet {
  return VALID_SOUND_SETS.has(set);
}

export function isValidVolume(volume: number): boolean {
  return (
    Number.isInteger(volume) && volume >= MIN_VOLUME && volume <= MAX_VOLUME
  );
}

export function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export function toDisplayAmbientConfig(
  record: AmbientConfigRecord,
): AmbientConfigDisplay {
  return {
    soundSet: record.soundSet,
    volume: record.volume,
    enabled: record.enabled,
    customUrl: record.customUrl,
  };
}
