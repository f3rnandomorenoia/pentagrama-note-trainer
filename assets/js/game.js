import { LEVELS, MODE_CONFIG } from "./levels.js";
import { TARGET_NOTE_PROGRESS, describeNotePosition, parseNote, renderStaff } from "./staff.js";

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

function noteProgressFromElapsed(elapsed, duration) {
  return duration <= 0 ? 1 : Math.max(0, Math.min(1, elapsed / duration));
}

function flyingNoteProgress(elapsed, duration) {
  return TARGET_NOTE_PROGRESS * noteProgressFromElapsed(elapsed, duration);
}

function answeringNoteProgress(elapsed, duration) {
  const progress = noteProgressFromElapsed(elapsed, duration);
  return TARGET_NOTE_PROGRESS + (1 - TARGET_NOTE_PROGRESS) * progress;
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
    this.ui.updateStatus("Pulsa empezar para lanzar notas hacia la barra central.");
    this.ui.updateRoundHeading("Listo para empezar", this.level.name, "Clave: -");
    this.ui.renderFeedback({
      tone: "neutral",
      title: "Sesión preparada",
      body: "Las notas cruzarán el pentagrama de derecha a izquierda. Responde cuando pasen por la barra central.",
    });
    this.ui.renderLastNote({
      tone: "neutral",
      label: "Sin notas resueltas",
      detail: "Aquí verás la última nota acertada o fallada.",
    });
    renderStaff(this.ui.staffSvg, { noteId: "E4", clef: "treble", noteProgress: 0.22, phase: "idle" });
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
    if (!this.isSessionActive) {
      this.ui.renderLastNote({
        tone: "neutral",
        label: "Sin notas resueltas",
        detail: "La última respuesta aparecerá destacada aquí.",
      });
      renderStaff(this.ui.staffSvg, { noteId: "E4", clef: "treble", noteProgress: 0.22, phase: "idle" });
    }
  }

  startSession() {
    this.session = this.createEmptySession();
    this.isSessionActive = true;
    this.ui.setSessionActive(true);
    this.ui.renderStats(this.session);
    this.ui.updateStatus("Sesión en marcha. Las notas seguirán entrando sin pausas.");
    this.ui.renderLastNote({
      tone: "neutral",
      label: "Esperando la primera respuesta",
      detail: "La última nota resuelta aparecerá aquí en verde o rojo.",
    });
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
        : "Pulsa empezar para lanzar notas hacia la barra central.",
    );
    this.ui.renderFeedback({
      tone: "neutral",
      title: hadProgress ? "Sesión cerrada" : "Sesión preparada",
      body: hadProgress
        ? "Has salido del modo juego. Puedes reiniciar cuando quieras."
        : "Al empezar, la página se centrará en la partida y dejará solo el HUD esencial.",
    });
    this.ui.renderLastNote({
      tone: "neutral",
      label: "Sin notas resueltas",
      detail: "La última respuesta aparecerá destacada aquí.",
    });
    renderStaff(this.ui.staffSvg, { noteId: "E4", clef: "treble", noteProgress: 0.22, phase: "idle" });
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
    this.ui.updateStatus("La nota entra por la derecha. Toca cuando cruce la barra central.");
    this.animateLine();
  }

  animateLine() {
    const flightDuration = this.level.lineDurationMs;
    const responseWindow = modeResponseWindow(this.mode.id, this.level) ?? Math.round(flightDuration * 0.5);
    const startTime = performance.now();
    const loop = (now) => {
      const elapsed = now - startTime;
      const stillFlying = elapsed < flightDuration;
      renderStaff(this.ui.staffSvg, {
        noteId: this.round.noteId,
        clef: this.round.clef,
        noteProgress: flyingNoteProgress(elapsed, flightDuration),
        phase: "flying",
        tone: "neutral",
        showTargetGlow: false,
      });

      if (stillFlying) {
        this.lineAnimationId = requestAnimationFrame(loop);
        return;
      }

      this.onLineArrived(responseWindow, startTime + flightDuration);
    };

    this.lineAnimationId = requestAnimationFrame(loop);
  }

  onLineArrived(responseWindow, answerStartTime) {
    this.roundState = "answering";
    this.ui.renderAnswerButtons(this.level.answerSet, null, false);
    this.ui.updateStatus("Ahora: la nota ya está en la barra. Responde antes de que se escape.");

    const loop = (now) => {
      const elapsed = now - answerStartTime;
      const progress = answeringNoteProgress(elapsed, responseWindow);
      renderStaff(this.ui.staffSvg, {
        noteId: this.round.noteId,
        clef: this.round.clef,
        noteProgress: progress,
        phase: "answering",
        tone: "active",
        showTargetGlow: true,
      });

      if (progress < 1 && this.roundState === "answering") {
        this.lineAnimationId = requestAnimationFrame(loop);
        return;
      }

      if (this.roundState === "answering") {
        this.registerMiss("Tiempo agotado");
      }
    };

    this.lineAnimationId = requestAnimationFrame(loop);
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
      this.renderResolvedNote(true);
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
    this.renderResolvedNote(false);
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
    this.renderResolvedNote(false);
    this.afterResolvedRound();
  }

  emitFeedback(correct, selectedAnswer, timeoutReason = "") {
    const position = describeNotePosition(this.round.noteId, this.round.clef);
    const correctLabel = NOTE_LABELS[this.round.answerKey];
    const selectedLabel = selectedAnswer ? NOTE_LABELS[selectedAnswer] : null;

    if (correct) {
      this.ui.renderFeedback({
        tone: "success",
        title: `Acierto +10 · ${correctLabel.title}`,
        body: `${position.label} en clave de ${position.clefLabel.toLowerCase()}. Ha cruzado la barra en ${position.positionText}.`,
      });
      this.ui.renderLastNote({
        tone: "success",
        label: `Última nota correcta: ${correctLabel.title}`,
        detail: `${position.label} · clave de ${position.clefLabel.toLowerCase()} · ${position.positionText}`,
      });
      this.ui.updateStatus("Acierto. La siguiente nota ya está entrando.");
      return;
    }

    const failureLead = timeoutReason
      ? `${timeoutReason}.`
      : `Has marcado ${selectedLabel?.title ?? "una respuesta incorrecta"}.`;
    this.ui.renderFeedback({
      tone: "error",
      title: `Fallo -5 · era ${correctLabel.title}`,
      body: `${failureLead} Esta nota corresponde a ${position.label} en clave de ${position.clefLabel.toLowerCase()} y se ubica en ${position.positionText}.`,
    });
    this.ui.renderLastNote({
      tone: "error",
      label: `Última nota fallada: ${correctLabel.title}`,
      detail: `${position.label} · clave de ${position.clefLabel.toLowerCase()} · ${position.positionText}`,
    });
    this.ui.updateStatus("Fallo. Mira la nota correcta mientras entra la siguiente.");
  }

  renderResolvedNote(correct) {
    window.clearTimeout(this.answerTimeoutId);
    cancelAnimationFrame(this.lineAnimationId);
    renderStaff(this.ui.staffSvg, {
      noteId: this.round.noteId,
      clef: this.round.clef,
      noteProgress: TARGET_NOTE_PROGRESS,
      phase: "resolved",
      tone: correct ? "success" : "error",
      showTargetGlow: true,
    });
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
