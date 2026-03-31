const SVG_NS = "http://www.w3.org/2000/svg";

const LETTER_INDEX = {
  C: 0,
  D: 1,
  E: 2,
  F: 3,
  G: 4,
  A: 5,
  B: 6,
};

const CLEF_META = {
  treble: {
    label: "Sol",
    symbol: "\uD834\uDD1E",
    bottomLine: "E4",
  },
  bass: {
    label: "Fa",
    symbol: "\uD834\uDD22",
    bottomLine: "G2",
  },
};

export function parseNote(noteId) {
  const match = /^([A-G])(#{1}|b{1}|n)?(\d)$/.exec(noteId);
  if (!match) {
    throw new Error(`Nota no reconocida: ${noteId}`);
  }

  return {
    letter: match[1],
    accidental: match[2] || "",
    octave: Number(match[3]),
  };
}

function diatonicNumber(note) {
  return note.octave * 7 + LETTER_INDEX[note.letter];
}

function stepFromBottomLine(noteId, clef) {
  const note = parseNote(noteId);
  const bottomLine = parseNote(CLEF_META[clef].bottomLine);
  return diatonicNumber(note) - diatonicNumber(bottomLine);
}

function createSvgElement(name, attrs = {}) {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attrs).forEach(([key, value]) => {
    element.setAttribute(key, String(value));
  });
  return element;
}

function noteDisplayName(note) {
  const accidentalMap = {
    "#": "sostenido",
    b: "bemol",
    n: "becuadro",
    "": "",
  };
  const syllableMap = {
    C: "Do",
    D: "Re",
    E: "Mi",
    F: "Fa",
    G: "Sol",
    A: "La",
    B: "Si",
  };
  return `${syllableMap[note.letter]}${note.accidental ? ` ${accidentalMap[note.accidental]}` : ""}`.trim();
}

function getPositionDescription(step) {
  if (step >= 0 && step <= 8) {
    const lineLabels = ["la 1.ª línea", "la 2.ª línea", "la 3.ª línea", "la 4.ª línea", "la 5.ª línea"];
    const spaceLabels = ["el 1.º espacio", "el 2.º espacio", "el 3.º espacio", "el 4.º espacio"];
    return step % 2 === 0 ? lineLabels[step / 2] : spaceLabels[(step - 1) / 2];
  }

  const offset = step < 0 ? Math.abs(step) : step - 8;
  const count = Math.floor((offset + 1) / 2);
  const zone = step < 0 ? "debajo" : "encima";
  if (offset % 2 === 0) {
    return `${count}.ª línea adicional ${zone} del pentagrama`;
  }
  return `${count}.º espacio adicional ${zone} del pentagrama`;
}

export function describeNotePosition(noteId, clef) {
  const step = stepFromBottomLine(noteId, clef);
  const parsed = parseNote(noteId);
  return {
    label: noteDisplayName(parsed),
    step,
    clefLabel: CLEF_META[clef].label,
    positionText: getPositionDescription(step),
  };
}

export function renderStaff(svg, roundState) {
  const { noteId, clef, lineProgress = 0 } = roundState;
  const note = parseNote(noteId);
  const staffLeft = 108;
  const staffRight = 680;
  const noteX = 564;
  const bottomY = 178;
  const stepHeight = 14;
  const noteStep = stepFromBottomLine(noteId, clef);
  const noteY = bottomY - noteStep * stepHeight;
  const timingX = staffLeft + Math.max(0, Math.min(1, lineProgress)) * (noteX - staffLeft);

  svg.innerHTML = "";

  const defs = createSvgElement("defs");
  const filter = createSvgElement("filter", { id: "softShadow", x: "-20%", y: "-20%", width: "160%", height: "160%" });
  filter.append(
    createSvgElement("feDropShadow", {
      dx: "0",
      dy: "8",
      stdDeviation: "8",
      "flood-color": "rgba(61,48,37,0.22)",
    }),
  );
  defs.append(filter);
  svg.append(defs);

  const bg = createSvgElement("rect", {
    x: 28,
    y: 26,
    width: 704,
    height: 208,
    rx: 24,
    fill: "#fffdfa",
  });
  svg.append(bg);

  for (let i = 0; i < 5; i += 1) {
    const y = bottomY - i * stepHeight * 2;
    svg.append(
      createSvgElement("line", {
        x1: staffLeft,
        y1: y,
        x2: staffRight,
        y2: y,
        stroke: "#3d3025",
        "stroke-width": 2,
        "stroke-linecap": "round",
      }),
    );
  }

  const clefText = createSvgElement("text", {
    x: 134,
    y: clef === "treble" ? 138 : 150,
    "font-size": clef === "treble" ? 96 : 88,
    fill: "#2d2118",
    "font-family": "serif",
  });
  clefText.textContent = CLEF_META[clef].symbol;
  svg.append(clefText);

  const clefLabel = createSvgElement("text", {
    x: 122,
    y: 62,
    "font-size": 16,
    fill: "#6b5d51",
    "font-family": "sans-serif",
    "font-weight": 700,
    "letter-spacing": "0.08em",
  });
  clefLabel.textContent = clef === "treble" ? "SOL" : "FA";
  svg.append(clefLabel);

  svg.append(
    createSvgElement("line", {
      x1: timingX,
      y1: 66,
      x2: timingX,
      y2: 194,
      stroke: "#b5522d",
      "stroke-width": 4,
      opacity: 0.9,
    }),
  );

  const ledgerSteps = [];
  if (noteStep < 0) {
    for (let step = noteStep; step <= -2; step += 2) {
      ledgerSteps.push(step);
    }
  } else if (noteStep > 8) {
    for (let step = 10; step <= noteStep; step += 2) {
      ledgerSteps.push(step);
    }
  }

  ledgerSteps.forEach((step) => {
    const y = bottomY - step * stepHeight;
    svg.append(
      createSvgElement("line", {
        x1: noteX - 26,
        y1: y,
        x2: noteX + 26,
        y2: y,
        stroke: "#3d3025",
        "stroke-width": 2,
      }),
    );
  });

  if (note.accidental) {
    const accidental = createSvgElement("text", {
      x: noteX - 44,
      y: noteY + 10,
      "font-size": 36,
      fill: "#2d2118",
      "font-family": "serif",
    });
    accidental.textContent = note.accidental === "n" ? "\u266E" : note.accidental === "#" ? "\u266F" : "\u266D";
    svg.append(accidental);
  }

  const noteGroup = createSvgElement("g", { filter: "url(#softShadow)" });
  const noteHead = createSvgElement("ellipse", {
    cx: noteX,
    cy: noteY,
    rx: 16,
    ry: 11,
    transform: `rotate(-18 ${noteX} ${noteY})`,
    fill: "#1d1713",
  });
  noteGroup.append(noteHead);

  const stemDirection = noteStep >= 4 ? -1 : 1;
  noteGroup.append(
    createSvgElement("line", {
      x1: stemDirection === 1 ? noteX + 12 : noteX - 12,
      y1: noteY,
      x2: stemDirection === 1 ? noteX + 12 : noteX - 12,
      y2: noteY - stemDirection * 54,
      stroke: "#1d1713",
      "stroke-width": 3,
      "stroke-linecap": "round",
    }),
  );
  svg.append(noteGroup);
}
