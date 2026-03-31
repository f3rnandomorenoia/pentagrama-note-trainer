import { StaffTrainerGame } from "./game.js";
import { LEVELS } from "./levels.js";
import * as storage from "./storage.js";

const PAGE_FILE_BY_LEVEL = Object.fromEntries(LEVELS.map((level) => [level.id, `./${level.id}.html`]));
const pageLevelId = document.body.dataset.levelId || null;

const ui = {
  staffSvg: document.querySelector("#staff-svg"),
  startButton: document.querySelector("#start-button"),
  modeSelect: document.querySelector("#mode-select"),
  levelSelect: document.querySelector("#level-select"),
  levelLinks: document.querySelector("#level-links"),
  answerButtons: document.querySelector("#answer-buttons"),
  statusText: document.querySelector("#status-text"),
  roundTitle: document.querySelector("#round-title"),
  levelChip: document.querySelector("#level-chip"),
  clefChip: document.querySelector("#clef-chip"),
  feedbackCard: document.querySelector("#feedback-card"),
  feedbackTitle: document.querySelector("#feedback-title"),
  feedbackBody: document.querySelector("#feedback-body"),
  scoreValue: document.querySelector("#score-value"),
  hitsValue: document.querySelector("#hits-value"),
  missesValue: document.querySelector("#misses-value"),
  streakValue: document.querySelector("#streak-value"),
  bestScore: document.querySelector("#best-score"),
  bestRun: document.querySelector("#best-run"),
  bestScoreLabel: document.querySelector("#best-score-label"),
};

ui.renderLevelOptions = (levels, selectedId) => {
  if (!ui.levelSelect) {
    return;
  }

  ui.levelSelect.innerHTML = levels
    .map(
      (level) =>
        `<option value="${level.id}" ${level.id === selectedId ? "selected" : ""}>${level.name}</option>`,
    )
    .join("");
};

ui.renderLevelLinks = (levels, currentId) => {
  if (!ui.levelLinks) {
    return;
  }

  ui.levelLinks.innerHTML = levels
    .map(
      (level) => `
        <a class="level-link${level.id === currentId ? " active" : ""}" href="${PAGE_FILE_BY_LEVEL[level.id]}">
          <span>${level.name}</span>
        </a>
      `,
    )
    .join("");
};

ui.renderMode = (modeId) => {
  if (ui.modeSelect) {
    ui.modeSelect.value = modeId;
  }
};

ui.renderStats = (session) => {
  if (ui.scoreValue) ui.scoreValue.textContent = session.score;
  if (ui.hitsValue) ui.hitsValue.textContent = session.hits;
  if (ui.missesValue) ui.missesValue.textContent = session.misses;
  if (ui.streakValue) ui.streakValue.textContent = session.streak;
};

ui.renderBest = (best) => {
  if (ui.bestScore) {
    ui.bestScore.textContent = best.bestScore ?? 0;
  }
  if (!ui.bestRun) {
    return;
  }
  if (!best.bestRun) {
    ui.bestRun.textContent = "Sin sesiones guardadas";
    return;
  }

  ui.bestRun.textContent = `${best.bestRun.date} · ${best.bestRun.hits}/${best.bestRun.rounds} · racha ${best.bestRun.bestStreak}`;
};

ui.updateBestLabel = (levelName) => {
  if (ui.bestScoreLabel) {
    ui.bestScoreLabel.textContent = `Mejor puntuación · ${levelName}`;
  }
};

const answerMeta = {
  C: { title: "Do", subtitle: "Letra C" },
  "C#": { title: "Do sostenido", subtitle: "C#" },
  Db: { title: "Re bemol", subtitle: "Db" },
  D: { title: "Re", subtitle: "Letra D" },
  Eb: { title: "Mi bemol", subtitle: "Eb" },
  E: { title: "Mi", subtitle: "Letra E" },
  F: { title: "Fa", subtitle: "Letra F" },
  "F#": { title: "Fa sostenido", subtitle: "F#" },
  Gb: { title: "Sol bemol", subtitle: "Gb" },
  G: { title: "Sol", subtitle: "Letra G" },
  Ab: { title: "La bemol", subtitle: "Ab" },
  A: { title: "La", subtitle: "Letra A" },
  Bb: { title: "Si bemol", subtitle: "Bb" },
  B: { title: "Si", subtitle: "Letra B" },
};

ui.renderAnswerButtons = (answers, selectedAnswer, disabled = false, correctAnswer = null) => {
  if (!ui.answerButtons) {
    return;
  }

  ui.answerButtons.innerHTML = "";
  answers.forEach((answer) => {
    const button = document.createElement("button");
    const isCorrect = correctAnswer && answer === correctAnswer;
    const isWrong = selectedAnswer && selectedAnswer === answer && selectedAnswer !== correctAnswer;
    button.className = `answer-button${isCorrect ? " correct" : ""}${isWrong ? " wrong" : ""}`;
    button.type = "button";
    button.disabled = disabled;
    button.dataset.answer = answer;
    button.innerHTML = `<strong>${answerMeta[answer].title}</strong><span>${answerMeta[answer].subtitle}</span>`;
    ui.answerButtons.append(button);
  });
};

ui.updateStatus = (text) => {
  if (ui.statusText) {
    ui.statusText.textContent = text;
  }
};

ui.updateRoundHeading = (title, levelText, clefText) => {
  if (ui.roundTitle) ui.roundTitle.textContent = title;
  if (ui.levelChip) ui.levelChip.textContent = levelText;
  if (ui.clefChip) ui.clefChip.textContent = clefText;
};

ui.renderFeedback = ({ tone, title, body }) => {
  if (!ui.feedbackCard) {
    return;
  }
  ui.feedbackCard.className = `feedback-card ${tone}`;
  if (ui.feedbackTitle) ui.feedbackTitle.textContent = title;
  if (ui.feedbackBody) ui.feedbackBody.textContent = body;
};

ui.renderLevelLinks(LEVELS, pageLevelId);

const game = new StaffTrainerGame({ ui, storage });
const storedSettings = storage.loadSettings();
const initialSettings = {
  ...storedSettings,
  levelId: pageLevelId || storedSettings.levelId || "nivel-1",
};

game.init(initialSettings);

if (ui.startButton) {
  ui.startButton.addEventListener("click", () => {
    game.startSession();
  });
}

if (ui.modeSelect) {
  ui.modeSelect.addEventListener("change", (event) => {
    game.setMode(event.target.value);
  });
}

if (ui.levelSelect) {
  ui.levelSelect.addEventListener("change", (event) => {
    if (pageLevelId) {
      const target = PAGE_FILE_BY_LEVEL[event.target.value];
      if (target) {
        window.location.href = target;
      }
      return;
    }

    game.setLevel(event.target.value);
  });
}

if (ui.answerButtons) {
  ui.answerButtons.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-answer]");
    if (!button) {
      return;
    }

    game.handleAnswer(button.dataset.answer);
  });
}
