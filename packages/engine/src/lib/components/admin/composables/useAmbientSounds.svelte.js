/**
 * Ambient Sounds Composable
 * Manages background audio for the editor (forest, rain, fire, etc.)
 */

const SOUNDS_STORAGE_KEY = "grove-editor-sounds";

// Sound definitions with ambient loops
export const soundLibrary = {
  forest: {
    name: "forest",
    key: "f",
    url: "/sounds/forest-ambience.mp3",
    description: "birds, wind",
  },
  rain: {
    name: "rain",
    key: "r",
    url: "/sounds/rain-ambience.mp3",
    description: "gentle rainfall",
  },
  campfire: {
    name: "fire",
    key: "i",
    url: "/sounds/campfire-ambience.mp3",
    description: "crackling embers",
  },
  night: {
    name: "night",
    key: "n",
    url: "/sounds/night-ambience.mp3",
    description: "crickets, breeze",
  },
  cafe: {
    name: "cafe",
    key: "a",
    url: "/sounds/cafe-ambience.mp3",
    description: "soft murmurs",
  },
};

/**
 * Creates an ambient sounds manager with Svelte 5 runes
 * @returns {object} Ambient sounds state and controls
 */
export function useAmbientSounds() {
  let state = $state({
    enabled: false,
    currentSound: "forest",
    volume: 0.3,
    showPanel: false,
  });

  let audioElement = $state(null);

  function loadSettings() {
    try {
      const stored = localStorage.getItem(SOUNDS_STORAGE_KEY);
      if (stored) {
        const settings = JSON.parse(stored);
        state.currentSound = settings.currentSound || "forest";
        state.volume = settings.volume ?? 0.3;
        // Don't auto-enable on load - user must click to start
      }
    } catch (e) {
      console.warn("Failed to load sound settings:", e);
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(
        SOUNDS_STORAGE_KEY,
        JSON.stringify({
          currentSound: state.currentSound,
          volume: state.volume,
        })
      );
    } catch (e) {
      console.warn("Failed to save sound settings:", e);
    }
  }

  function toggle() {
    if (state.enabled) {
      stop();
    } else {
      play(state.currentSound);
    }
  }

  function play(soundKey) {
    const sound = soundLibrary[soundKey];
    if (!sound) return;

    // Stop current sound if playing
    if (audioElement) {
      audioElement.pause();
      audioElement = null;
    }

    // Create new audio element
    audioElement = new Audio(sound.url);
    audioElement.loop = true;
    audioElement.volume = state.volume;

    // Handle playback errors gracefully
    audioElement.onerror = () => {
      console.warn(`Sound file not found: ${sound.url}`);
      state.enabled = false;
    };

    audioElement
      .play()
      .then(() => {
        state.enabled = true;
        state.currentSound = soundKey;
        saveSettings();
      })
      .catch((e) => {
        console.warn("Failed to play sound:", e);
        state.enabled = false;
      });
  }

  function stop() {
    if (audioElement) {
      audioElement.pause();
      audioElement = null;
    }
    state.enabled = false;
  }

  function setVolume(newVolume) {
    state.volume = newVolume;
    if (audioElement) {
      audioElement.volume = newVolume;
    }
    saveSettings();
  }

  function selectSound(soundKey) {
    if (state.enabled) {
      play(soundKey);
    } else {
      state.currentSound = soundKey;
      saveSettings();
    }
  }

  function togglePanel() {
    state.showPanel = !state.showPanel;
  }

  function closePanel() {
    state.showPanel = false;
  }

  function cleanup() {
    if (audioElement) {
      audioElement.pause();
      audioElement = null;
    }
  }

  return {
    get state() {
      return state;
    },
    get enabled() {
      return state.enabled;
    },
    get currentSound() {
      return state.currentSound;
    },
    get volume() {
      return state.volume;
    },
    get showPanel() {
      return state.showPanel;
    },
    loadSettings,
    toggle,
    play,
    stop,
    setVolume,
    selectSound,
    togglePanel,
    closePanel,
    cleanup,
  };
}
