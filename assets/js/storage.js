const STORAGE_KEYS = {
  scores: "pentagrama-trainer:scores",
  settings: "pentagrama-trainer:settings",
};

const safeParse = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

export function loadScores() {
  return safeParse(localStorage.getItem(STORAGE_KEYS.scores), {
    levels: {},
  });
}

export function saveScores(scoreState) {
  localStorage.setItem(STORAGE_KEYS.scores, JSON.stringify(scoreState));
}

export function loadSettings() {
  return safeParse(localStorage.getItem(STORAGE_KEYS.settings), {
    mode: "practice",
    levelId: "nivel-1",
  });
}

export function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
}
