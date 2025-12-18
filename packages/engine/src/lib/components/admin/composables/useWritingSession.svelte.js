/**
 * Writing Session Composable
 * Manages campfire sessions and writing goals
 */

/**
 * @typedef {Object} CampfireState
 * @property {boolean} active
 * @property {number|null} startTime
 * @property {number} targetMinutes
 * @property {number} startWordCount
 */

/**
 * @typedef {Object} GoalState
 * @property {boolean} enabled
 * @property {number} targetWords
 * @property {number} sessionWords
 */

/**
 * @typedef {Object} WritingSessionOptions
 * @property {() => number} [getWordCount] - Function to get current word count
 */

/**
 * @typedef {Object} WritingSessionManager
 * @property {CampfireState} campfire
 * @property {GoalState} goal
 * @property {boolean} isCampfireActive
 * @property {boolean} isGoalEnabled
 * @property {() => string} getCampfireElapsed
 * @property {(currentWordCount: number) => number} getGoalProgress
 * @property {(currentWordCount: number) => number} getCampfireWords
 * @property {() => void} startCampfire
 * @property {() => void} endCampfire
 * @property {() => void} promptWritingGoal
 * @property {() => void} disableGoal
 */

/**
 * Creates a writing session manager with Svelte 5 runes
 * @param {WritingSessionOptions} options - Configuration options
 * @returns {WritingSessionManager} Session state and controls
 */
export function useWritingSession(options = /** @type {WritingSessionOptions} */ ({})) {
  const { getWordCount } = options;

  // Campfire session state
  let campfire = $state({
    active: false,
    /** @type {number | null} */
    startTime: /** @type {number | null} */ (null),
    targetMinutes: 25,
    startWordCount: 0,
  });

  // Writing goals state
  let goal = $state({
    enabled: false,
    targetWords: 500,
    sessionWords: 0,
  });

  // Campfire elapsed time (needs to be computed with current time)
  function getCampfireElapsed() {
    if (!campfire.active || !campfire.startTime) return "0:00";
    const now = Date.now();
    const elapsed = Math.floor((now - campfire.startTime) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  // Writing goal progress
  /** @param {number} currentWordCount */
  function getGoalProgress(currentWordCount) {
    if (!goal.enabled) return 0;
    const wordsWritten = currentWordCount - goal.sessionWords;
    return Math.min(100, Math.round((wordsWritten / goal.targetWords) * 100));
  }

  // Words written in campfire session
  /** @param {number} currentWordCount */
  function getCampfireWords(currentWordCount) {
    return currentWordCount - campfire.startWordCount;
  }

  function startCampfire() {
    const currentWords = getWordCount ? getWordCount() : 0;
    campfire.active = true;
    campfire.startTime = Date.now();
    campfire.startWordCount = currentWords;
  }

  function endCampfire() {
    // Could show a summary modal here in the future
    campfire.active = false;
    campfire.startTime = null;
  }

  function promptWritingGoal() {
    const target = prompt("Set your word goal for this session:", "500");
    if (target && !isNaN(parseInt(target))) {
      const currentWords = getWordCount ? getWordCount() : 0;
      goal.enabled = true;
      goal.targetWords = parseInt(target);
      goal.sessionWords = currentWords;
    }
  }

  function disableGoal() {
    goal.enabled = false;
  }

  return {
    get campfire() {
      return campfire;
    },
    get goal() {
      return goal;
    },
    get isCampfireActive() {
      return campfire.active;
    },
    get isGoalEnabled() {
      return goal.enabled;
    },
    getCampfireElapsed,
    getGoalProgress,
    getCampfireWords,
    startCampfire,
    endCampfire,
    promptWritingGoal,
    disableGoal,
  };
}
