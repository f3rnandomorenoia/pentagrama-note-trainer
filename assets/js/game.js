import { LEVELS, MODE_CONFIG } from "./levels.js";
import { describeNotePosition, parseNote, renderStaff } from "./staff.js";

const NOTE_LABELS = {
  C: { title: "Do", subtitle: "C" },
  "C#": { title: "Do sostenido", subtitle: "C#" },
  Db: { title: "Re bemol", subtitle: "Db" },
  D: { title: "Re", subtitle: "D" },
  Eb: { title: "Mi bemol", subtitle: "Eb" },
  E: { title: "Mi", subtitle: "E" },
  F: { title: "Fa", subtitle: "F" },
  "F#": { title: "Fa sostenido", subtitle: "F#" },
  Gb: { title: "Sol bemol", subtitle: "Gb" },
  G: { title: "Sol", subtitle: "G" },
  Ab: { title: "La bemol", subtitle: "Ab" },
  A: { title: "La", subtitle: "A" },
  Bb: { title: "Si bemol", subtitle: "Bb" },
  B: { title: "Si", subtitle: "B" },
};

const emptyBest = () => ({
  bestScore: 0,
  bestRun: null,
});

function sample(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function resolveNotePool(level, clef) {
  return Array.isArray(level.notePool) ? level.notePool : level.notePool[clef];
}

function answerKeyFromNote(noteId) {
  const { letter, accidental } = parseNote(noteId);
  return `${letter}${accidental || ""}`;
}

function buildRound(level) {
  const clef = sample(level.clefs);
  const noteId = sample(resolveNotePool(level, clef));
  return {
    clef,
    noteId,
    answerKey: answerKeyFromNote(noteId),
  };
}

function modeResponseWindow(modeId, level) {
  if (modeId !== "challenge") {
    return null;
  }
  return level.responseWindowMs ?? Math.round(level.lineDurationMs * 0.8);
}

export class StaffTrainerGame {
  constructor({ ui, storage }) {
    this.ui = ui;
    this.storage = storage;
    this.level = LEVELS[0];
    this.mode = MODE_CONFIG.practice;
    this.session = this.createEmptySession();
    this.round = null;
    this.roundState = "idle";
    this.lineAnimationId = null;
    this.answerTimeoutId = null;
    this.nextRoundTimeoutId = null;
    this.bestBook = storage.loadScores();
    this.isSessionActive = false;
  }

  init(settings) {
    this.setMode(settings.mode || "practice");
    this.setLevel(settings.levelId || LEVELS[0].id);
    this.ui.renderLevelOptions(LEVELS, this.level.id);
    this.ui.renderMode(this.mode);
    this.ui.renderStats(this.session);
    this.ui.renderBest(this.getLevelBest());
    this.ui.renderAnswerButtons(this.level.answerSet, null, true);
    this.ui.setSessionActive(false);
    this.ui.updateStatus("Pulsa empezar para arrancar una sesión continua.");
    this.ui.updateRoundHeading("Listo para empezar", this.level.name, "Clave: -");
    this.ui.renderFeedback({
      tone: "neutral",
      title: "Sesión preparada",
      body: "Las notas irán encadenadas. Responde abajo y la siguiente aparecerá sola.",
    });
    renderStaff(this.ui.staffSvg, { noteId: "E4", clef: "treble", lineProgress: 0 });
  }

  createEmptySession() {
    return {
      score: 0,
      hits: 0,
      misses: 0,
      streak: 0,
      rounds: 0,
      bestStreak: 0,
    };
  }

  getLevelBest() {
    return this.bestBook.levels?.[this.level.id] ?? emptyBest();
  }

  setMode(modeId) {
    this.mode = MODE_CONFIG[modeId] || MODE_CONFIG.practice;
    this.storage.saveSettings({ mode: this.mode.id, levelId: this.level.id });
    this.resetRoundFlow();
    this.ui.renderMode(this.mode);
    this.ui.updateStatus(this.mode.description);
  }

  setLevel(levelId) {
    this.level = LEVELS.find((level) => level.id === levelId) || LEVELS[0];
    this.storage.saveSettings({ mode: this.mode.id, levelId: this.level.id });
    this.resetRoundFlow();
    this.ui.renderLevelOptions(LEVELS, this.level.id);
    this.ui.renderLevelLinks(LEVELS, this.level.id);
    this.ui.renderAnswerButtons(this.level.answerSet, null, true);
    this.ui.renderBest(this.getLevelBest());
    this.ui.updateBestLabel(this.level.name);
    this.ui.updateRoundHeading("Listo para empezar", this.level.name, "Clave: -");
    this.ui.renderFeedback({
      tone: "neutral",
      title: this.level.name,
      body: this.level.description,
    });
  }

  startSession() {
    this.session = this.createEmptySession();
    this.isSessionActive = true;
    this.ui.setSessionActive(true);
    this.ui.renderStats(this.session);
    this.ui.updateStatus("Sesión en marcha. Las notas seguirán entrando sin pausas.");
    this.nextRound();
  }

  stopSession() {
    const hadProgress = this.session.rounds > 0 || this.session.score !== 0;
    this.resetRoundFlow();
    this.round = null;
    this.isSessionActive = false;
    this.ui.setSessionActive(false);
    this.ui.renderAnswerButtons(this.level.answerSet, null, true);
    this.ui.updateRoundHeading("Listo para empezar", this.level.name, "Clave: -");
    this.ui.updateStatus(
      hadProgress
        ? "Sesión cerrada. Pulsa empezar para volver al modo juego."
        : "Pulsa empezar para arrancar una sesión continua.",
    );
    this.ui.renderFeedback({
      tone: "neutral",
      title: hadProgress ? "Sesión cerrada" : "Sesión preparada",
      body: hadProgress
        ? "Has salido del modo juego. Puedes reiniciar cuando quieras."
        : "Al empezar, la página se centrará en la partida y dejará solo el HUD esencial.",
    });
    renderStaff(this.ui.staffSvg, { noteId: "E4", clef: "treble", lineProgress: 0 });
  }

  nextRound() {
    this.resetRoundFlow();
    this.round = buildRound(this.level);
    this.roundState = "flying";
    this.ui.renderAnswerButtons(this.level.answerSet, null, true);
    this.ui.updateRoundHeading(
      `${this.mode.label} en marcha`,
      this.level.name,
      `Clave: ${this.round.clef === "treble" ? "Sol" : "Fa"}`,
    );
    this.ui.updateStatus("La línea avanza. Prepárate para tocar la respuesta correcta.");
    this.animateLine();
  }

  animateLine() {
    const duration = this.level.lineDurationMs;
    const startTime = performance.now();
    const loop = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      renderStaff(this.ui.staffSvg, {
        noteId: this.round.noteId,
        clef: this.round.clef,
        lineProgress: progress,
      });

      if (progress < 1) {
        this.lineAnimationId = requestAnimationFrame(loop);
        return;
      }

      this.onLineArrived();
    };

    this.lineAnimationId = requestAnimationFrame(loop);
  }

  onLineArrived() {
    this.roundState = "answering";
    this.ui.renderAnswerButtons(this.level.answerSet, null, false);
    this.ui.updateStatus("Ahora: pulsa la nota correcta.");

    const responseWindow = modeResponseWindow(this.mode.id, this.level);
    if (responseWindow) {
      this.answerTimeoutId = window.setTimeout(() => {
        this.registerMiss("Tiempo agotado");
      }, responseWindow);
    }
  }

  handleAnswer(answer) {
    if (!this.round || this.roundState !== "answering") {
      return;
    }

    window.clearTimeout(this.answerTimeoutId);
    const correct = answer === this.round.answerKey;
    if (correct) {
      this.session.score += 10;
      this.session.hits += 1;
      this.session.streak += 1;
      this.session.rounds += 1;
      this.session.bestStreak = Math.max(this.session.bestStreak, this.session.streak);
      this.roundState = "resolved";
      this.ui.renderAnswerButtons(this.level.answerSet, answer, true, this.round.answerKey);
      this.emitFeedback(true, answer);
      this.afterResolvedRound();
      return;
    }

    this.session.score -= 5;
    this.session.misses += 1;
    this.session.rounds += 1;
    this.session.streak = 0;
    this.roundState = "resolved";
    this.ui.renderAnswerButtons(this.level.answerSet, answer, true, this.round.answerKey);
    this.emitFeedback(false, answer);
    this.afterResolvedRound();
  }

  registerMiss(reason) {
    if (!this.round || this.roundState !== "answering") {
      return;
    }

    this.session.score -= 5;
    this.session.misses += 1;
    this.session.rounds += 1;
    this.session.streak = 0;
    this.roundState = "resolved";
    this.ui.renderAnswerButtons(this.level.answerSet, null, true, this.round.answerKey);
    this.emitFeedback(false, null, reason);
    this.afterResolvedRound();
  }

  emitFeedback(correct, selectedAnswer, timeoutReason = "") {
    const position = describeNotePosition(this.round.noteId, this.round.clef);
    const correctLabel = NOTE_LABELS[this.round.answerKey];
    const selectedLabel = selectedAnswer ? NOTE_LABELS[selectedAnswer] : null;

    if (correct) {
      this.ui.renderFeedback({
        tone: "success",
        title: `Correcto: ${correctLabel.title}`,
        body: `${position.label} en clave de ${position.clefLabel.toLowerCase()}. Está en ${position.positionText}.`,
      });
      this.ui.updateStatus("Acierto. La siguiente nota ya viene.");
      return;
    }

    const failureLead = timeoutReason
      ? `${timeoutReason}.`
      : `Has marcado ${selectedLabel?.title ?? "una respuesta incorrecta"}.`;
    this.ui.renderFeedback({
      tone: "error",
      title: `Era ${correctLabel.title}`,
      body: `${failureLead} Esta nota corresponde a ${position.label} en clave de ${position.clefLabel.toLowerCase()} y se ubica en ${position.positionText}.`,
    });
    this.ui.updateStatus("Fallo. Revisa el feedback mientras entra la siguiente.");
  }

  afterResolvedRound() {
    this.syncBestScores();
    this.ui.renderStats(this.session);
    this.ui.renderBest(this.getLevelBest());
    this.queueNextRound();
  }

  queueNextRound() {
    const delay = this.mode.id === "challenge" ? 800 : 1250;
    this.nextRoundTimeoutId = window.setTimeout(() => {
      if (this.roundState === "resolved") {
        this.nextRound();
      }
    }, delay);
  }

  syncBestScores() {
    const currentBest = this.getLevelBest();
    const shouldReplace = this.session.score > currentBest.bestScore;
    const shouldCreate = !currentBest.bestRun && this.session.rounds > 0;

    if (!shouldReplace && !shouldCreate) {
      return;
    }

    this.bestBook.levels = this.bestBook.levels || {};
    this.bestBook.levels[this.level.id] = {
      bestScore: Math.max(this.session.score, currentBest.bestScore ?? 0),
      bestRun: {
        date: new Date().toLocaleDateString("es-ES"),
        score: this.session.score,
        rounds: this.session.rounds,
        hits: this.session.hits,
        bestStreak: this.session.bestStreak,
      },
    };
    this.storage.saveScores(this.bestBook);
  }

  resetRoundFlow() {
    cancelAnimationFrame(this.lineAnimationId);
    window.clearTimeout(this.answerTimeoutId);
    window.clearTimeout(this.nextRoundTimeoutId);
    this.roundState = "idle";
    this.lineAnimationId = null;
    this.answerTimeoutId = null;
    this.nextRoundTimeoutId = null;
  }
}
