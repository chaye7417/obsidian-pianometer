/*
PianoMeter for Obsidian
Based on NiceChord's PianoMeter: https://github.com/wiwikuan/pianometer
*/

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all4) => {
  for (var name2 in all4)
    __defProp(target, name2, { get: all4[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod2) => __copyProps(__defProp({}, "__esModule", { value: true }), mod2);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => PianoMeterPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");

// node_modules/@tonaljs/pitch/dist/index.mjs
function isNamedPitch(src) {
  return src !== null && typeof src === "object" && "name" in src && typeof src.name === "string" ? true : false;
}
function isPitch(pitch2) {
  return pitch2 !== null && typeof pitch2 === "object" && "step" in pitch2 && typeof pitch2.step === "number" && "alt" in pitch2 && typeof pitch2.alt === "number" && !isNaN(pitch2.step) && !isNaN(pitch2.alt) ? true : false;
}
var FIFTHS = [0, 2, 4, -1, 1, 3, 5];
var STEPS_TO_OCTS = FIFTHS.map(
  (fifths) => Math.floor(fifths * 7 / 12)
);
function coordinates(pitch2) {
  const { step, alt, oct, dir = 1 } = pitch2;
  const f = FIFTHS[step] + 7 * alt;
  if (oct === void 0) {
    return [dir * f];
  }
  const o = oct - STEPS_TO_OCTS[step] - 4 * alt;
  return [dir * f, dir * o];
}
var FIFTHS_TO_STEPS = [3, 0, 4, 1, 5, 2, 6];
function pitch(coord) {
  const [f, o, dir] = coord;
  const step = FIFTHS_TO_STEPS[unaltered(f)];
  const alt = Math.floor((f + 1) / 7);
  if (o === void 0) {
    return { step, alt, dir };
  }
  const oct = o + 4 * alt + STEPS_TO_OCTS[step];
  return { step, alt, oct, dir };
}
function unaltered(f) {
  const i = (f + 1) % 7;
  return i < 0 ? 7 + i : i;
}

// node_modules/@tonaljs/pitch-interval/dist/index.mjs
var fillStr = (s, n) => Array(Math.abs(n) + 1).join(s);
var NoInterval = Object.freeze({
  empty: true,
  name: "",
  num: NaN,
  q: "",
  type: "",
  step: NaN,
  alt: NaN,
  dir: NaN,
  simple: NaN,
  semitones: NaN,
  chroma: NaN,
  coord: [],
  oct: NaN
});
var INTERVAL_TONAL_REGEX = "([-+]?\\d+)(d{1,4}|m|M|P|A{1,4})";
var INTERVAL_SHORTHAND_REGEX = "(AA|A|P|M|m|d|dd)([-+]?\\d+)";
var REGEX = new RegExp(
  "^" + INTERVAL_TONAL_REGEX + "|" + INTERVAL_SHORTHAND_REGEX + "$"
);
function tokenizeInterval(str) {
  const m = REGEX.exec(`${str}`);
  if (m === null) {
    return ["", ""];
  }
  return m[1] ? [m[1], m[2]] : [m[4], m[3]];
}
var cache = {};
function interval(src) {
  return typeof src === "string" ? cache[src] || (cache[src] = parse(src)) : isPitch(src) ? interval(pitchName(src)) : isNamedPitch(src) ? interval(src.name) : NoInterval;
}
var SIZES = [0, 2, 4, 5, 7, 9, 11];
var TYPES = "PMMPPMM";
function parse(str) {
  const tokens = tokenizeInterval(str);
  if (tokens[0] === "") {
    return NoInterval;
  }
  const num = +tokens[0];
  const q = tokens[1];
  const step = (Math.abs(num) - 1) % 7;
  const t = TYPES[step];
  if (t === "M" && q === "P") {
    return NoInterval;
  }
  const type = t === "M" ? "majorable" : "perfectable";
  const name2 = "" + num + q;
  const dir = num < 0 ? -1 : 1;
  const simple = num === 8 || num === -8 ? num : dir * (step + 1);
  const alt = qToAlt(type, q);
  const oct = Math.floor((Math.abs(num) - 1) / 7);
  const semitones = dir * (SIZES[step] + alt + 12 * oct);
  const chroma3 = (dir * (SIZES[step] + alt) % 12 + 12) % 12;
  const coord = coordinates({ step, alt, oct, dir });
  return {
    empty: false,
    name: name2,
    num,
    q,
    step,
    alt,
    dir,
    type,
    simple,
    semitones,
    chroma: chroma3,
    coord,
    oct
  };
}
function coordToInterval(coord, forceDescending) {
  const [f, o = 0] = coord;
  const isDescending = f * 7 + o * 12 < 0;
  const ivl = forceDescending || isDescending ? [-f, -o, -1] : [f, o, 1];
  return interval(pitch(ivl));
}
function qToAlt(type, q) {
  return q === "M" && type === "majorable" || q === "P" && type === "perfectable" ? 0 : q === "m" && type === "majorable" ? -1 : /^A+$/.test(q) ? q.length : /^d+$/.test(q) ? -1 * (type === "perfectable" ? q.length : q.length + 1) : 0;
}
function pitchName(props) {
  const { step, alt, oct = 0, dir } = props;
  if (!dir) {
    return "";
  }
  const calcNum = step + 1 + 7 * oct;
  const num = calcNum === 0 ? step + 1 : calcNum;
  const d = dir < 0 ? "-" : "";
  const type = TYPES[step] === "M" ? "majorable" : "perfectable";
  const name2 = d + num + altToQ(type, alt);
  return name2;
}
function altToQ(type, alt) {
  if (alt === 0) {
    return type === "majorable" ? "M" : "P";
  } else if (alt === -1 && type === "majorable") {
    return "m";
  } else if (alt > 0) {
    return fillStr("A", alt);
  } else {
    return fillStr("d", type === "perfectable" ? alt : alt + 1);
  }
}

// node_modules/@tonaljs/pitch-note/dist/index.mjs
var fillStr2 = (s, n) => Array(Math.abs(n) + 1).join(s);
var NoNote = Object.freeze({
  empty: true,
  name: "",
  letter: "",
  acc: "",
  pc: "",
  step: NaN,
  alt: NaN,
  chroma: NaN,
  height: NaN,
  coord: [],
  midi: null,
  freq: null
});
var cache2 = /* @__PURE__ */ new Map();
var stepToLetter = (step) => "CDEFGAB".charAt(step);
var altToAcc = (alt) => alt < 0 ? fillStr2("b", -alt) : fillStr2("#", alt);
var accToAlt = (acc) => acc[0] === "b" ? -acc.length : acc.length;
function note(src) {
  const stringSrc = JSON.stringify(src);
  const cached = cache2.get(stringSrc);
  if (cached) {
    return cached;
  }
  const value = typeof src === "string" ? parse2(src) : isPitch(src) ? note(pitchName2(src)) : isNamedPitch(src) ? note(src.name) : NoNote;
  cache2.set(stringSrc, value);
  return value;
}
var REGEX2 = /^([a-gA-G]?)(#{1,}|b{1,}|x{1,}|)(-?\d*)\s*(.*)$/;
function tokenizeNote(str) {
  const m = REGEX2.exec(str);
  return m ? [m[1].toUpperCase(), m[2].replace(/x/g, "##"), m[3], m[4]] : ["", "", "", ""];
}
function coordToNote(noteCoord) {
  return note(pitch(noteCoord));
}
var mod = (n, m) => (n % m + m) % m;
var SEMI = [0, 2, 4, 5, 7, 9, 11];
function parse2(noteName) {
  const tokens = tokenizeNote(noteName);
  if (tokens[0] === "" || tokens[3] !== "") {
    return NoNote;
  }
  const letter = tokens[0];
  const acc = tokens[1];
  const octStr = tokens[2];
  const step = (letter.charCodeAt(0) + 3) % 7;
  const alt = accToAlt(acc);
  const oct = octStr.length ? +octStr : void 0;
  const coord = coordinates({ step, alt, oct });
  const name2 = letter + acc + octStr;
  const pc = letter + acc;
  const chroma3 = (SEMI[step] + alt + 120) % 12;
  const height = oct === void 0 ? mod(SEMI[step] + alt, 12) - 12 * 99 : SEMI[step] + alt + 12 * (oct + 1);
  const midi2 = height >= 0 && height <= 127 ? height : null;
  const freq2 = oct === void 0 ? null : Math.pow(2, (height - 69) / 12) * 440;
  return {
    empty: false,
    acc,
    alt,
    chroma: chroma3,
    coord,
    freq: freq2,
    height,
    letter,
    midi: midi2,
    name: name2,
    oct,
    pc,
    step
  };
}
function pitchName2(props) {
  const { step, alt, oct } = props;
  const letter = stepToLetter(step);
  if (!letter) {
    return "";
  }
  const pc = letter + altToAcc(alt);
  return oct || oct === 0 ? pc + oct : pc;
}

// node_modules/@tonaljs/pitch-distance/dist/index.mjs
function transpose(noteName, intervalName) {
  const note2 = note(noteName);
  const intervalCoord = Array.isArray(intervalName) ? intervalName : interval(intervalName).coord;
  if (note2.empty || !intervalCoord || intervalCoord.length < 2) {
    return "";
  }
  const noteCoord = note2.coord;
  const tr2 = noteCoord.length === 1 ? [noteCoord[0] + intervalCoord[0]] : [noteCoord[0] + intervalCoord[0], noteCoord[1] + intervalCoord[1]];
  return coordToNote(tr2).name;
}
function tonicIntervalsTransposer(intervals, tonic) {
  const len = intervals.length;
  return (normalized) => {
    if (!tonic)
      return "";
    const index4 = normalized < 0 ? (len - -normalized % len) % len : normalized % len;
    const octaves = Math.floor(normalized / len);
    const root = transpose(tonic, [0, octaves]);
    return transpose(root, intervals[index4]);
  };
}
function distance(fromNote, toNote) {
  const from = note(fromNote);
  const to = note(toNote);
  if (from.empty || to.empty) {
    return "";
  }
  const fcoord = from.coord;
  const tcoord = to.coord;
  const fifths = tcoord[0] - fcoord[0];
  const octs = fcoord.length === 2 && tcoord.length === 2 ? tcoord[1] - fcoord[1] : -Math.floor(fifths * 7 / 12);
  const forceDescending = to.height === from.height && to.midi !== null && from.oct === to.oct && from.step > to.step;
  return coordToInterval([fifths, octs], forceDescending).name;
}

// node_modules/@tonaljs/chord/dist/index.mjs
var dist_exports = {};
__export(dist_exports, {
  chord: () => chord,
  chordScales: () => chordScales,
  default: () => index_default,
  degrees: () => degrees,
  detect: () => detect,
  extended: () => extended,
  get: () => get4,
  getChord: () => getChord,
  notes: () => notes,
  reduced: () => reduced,
  steps: () => steps,
  tokenize: () => tokenize,
  transpose: () => transpose2
});

// node_modules/@tonaljs/collection/dist/index.mjs
function rotate(times, arr) {
  const len = arr.length;
  const n = (times % len + len) % len;
  return arr.slice(n, len).concat(arr.slice(0, n));
}
function compact(arr) {
  return arr.filter((n) => n === 0 || n);
}

// node_modules/@tonaljs/pcset/dist/index.mjs
var EmptyPcset = {
  empty: true,
  name: "",
  setNum: 0,
  chroma: "000000000000",
  normalized: "000000000000",
  intervals: []
};
var setNumToChroma = (num2) => Number(num2).toString(2).padStart(12, "0");
var chromaToNumber = (chroma22) => parseInt(chroma22, 2);
var REGEX3 = /^[01]{12}$/;
function isChroma(set) {
  return REGEX3.test(set);
}
var isPcsetNum = (set) => typeof set === "number" && set >= 0 && set <= 4095;
var isPcset = (set) => set && isChroma(set.chroma);
var cache3 = { [EmptyPcset.chroma]: EmptyPcset };
function get(src) {
  const chroma22 = isChroma(src) ? src : isPcsetNum(src) ? setNumToChroma(src) : Array.isArray(src) ? listToChroma(src) : isPcset(src) ? src.chroma : EmptyPcset.chroma;
  return cache3[chroma22] = cache3[chroma22] || chromaToPcset(chroma22);
}
var IVLS = [
  "1P",
  "2m",
  "2M",
  "3m",
  "3M",
  "4P",
  "5d",
  "5P",
  "6m",
  "6M",
  "7m",
  "7M"
];
function chromaToIntervals(chroma22) {
  const intervals2 = [];
  for (let i = 0; i < 12; i++) {
    if (chroma22.charAt(i) === "1")
      intervals2.push(IVLS[i]);
  }
  return intervals2;
}
function modes(set, normalize = true) {
  const pcs = get(set);
  const binary = pcs.chroma.split("");
  return compact(
    binary.map((_, i) => {
      const r = rotate(i, binary);
      return normalize && r[0] === "0" ? null : r.join("");
    })
  );
}
function isSubsetOf(set) {
  const s = get(set).setNum;
  return (notes2) => {
    const o = get(notes2).setNum;
    return s && s !== o && (o & s) === o;
  };
}
function isSupersetOf(set) {
  const s = get(set).setNum;
  return (notes2) => {
    const o = get(notes2).setNum;
    return s && s !== o && (o | s) === o;
  };
}
function chromaRotations(chroma22) {
  const binary = chroma22.split("");
  return binary.map((_, i) => rotate(i, binary).join(""));
}
function chromaToPcset(chroma22) {
  const setNum = chromaToNumber(chroma22);
  const normalizedNum = chromaRotations(chroma22).map(chromaToNumber).filter((n) => n >= 2048).sort()[0];
  const normalized = setNumToChroma(normalizedNum);
  const intervals2 = chromaToIntervals(chroma22);
  return {
    empty: false,
    name: "",
    setNum,
    chroma: chroma22,
    normalized,
    intervals: intervals2
  };
}
function listToChroma(set) {
  if (set.length === 0) {
    return EmptyPcset.chroma;
  }
  let pitch2;
  const binary = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < set.length; i++) {
    pitch2 = note(set[i]);
    if (pitch2.empty)
      pitch2 = interval(set[i]);
    if (!pitch2.empty)
      binary[pitch2.chroma] = 1;
  }
  return binary.join("");
}

// node_modules/@tonaljs/chord-type/dist/index.mjs
var CHORDS = [
  // ==Major==
  ["1P 3M 5P", "major", "M ^  maj"],
  ["1P 3M 5P 7M", "major seventh", "maj7 \u0394 ma7 M7 Maj7 ^7"],
  ["1P 3M 5P 7M 9M", "major ninth", "maj9 \u03949 ^9"],
  ["1P 3M 5P 7M 9M 13M", "major thirteenth", "maj13 Maj13 ^13"],
  ["1P 3M 5P 6M", "sixth", "6 add6 add13 M6"],
  ["1P 3M 5P 6M 9M", "sixth added ninth", "6add9 6/9 69 M69"],
  ["1P 3M 6m 7M", "major seventh flat sixth", "M7b6 ^7b6"],
  [
    "1P 3M 5P 7M 11A",
    "major seventh sharp eleventh",
    "maj#4 \u0394#4 \u0394#11 M7#11 ^7#11 maj7#11"
  ],
  // ==Minor==
  // '''Normal'''
  ["1P 3m 5P", "minor", "m min -"],
  ["1P 3m 5P 7m", "minor seventh", "m7 min7 mi7 -7"],
  [
    "1P 3m 5P 7M",
    "minor/major seventh",
    "m/ma7 m/maj7 mM7 mMaj7 m/M7 -\u03947 m\u0394 -^7 -maj7"
  ],
  ["1P 3m 5P 6M", "minor sixth", "m6 -6"],
  ["1P 3m 5P 7m 9M", "minor ninth", "m9 -9"],
  ["1P 3m 5P 7M 9M", "minor/major ninth", "mM9 mMaj9 -^9"],
  ["1P 3m 5P 7m 9M 11P", "minor eleventh", "m11 -11"],
  ["1P 3m 5P 7m 9M 13M", "minor thirteenth", "m13 -13"],
  // '''Diminished'''
  ["1P 3m 5d", "diminished", "dim \xB0 o"],
  ["1P 3m 5d 7d", "diminished seventh", "dim7 \xB07 o7"],
  ["1P 3m 5d 7m", "half-diminished", "m7b5 \xF8 -7b5 h7 h"],
  // ==Dominant/Seventh==
  // '''Normal'''
  ["1P 3M 5P 7m", "dominant seventh", "7 dom"],
  ["1P 3M 5P 7m 9M", "dominant ninth", "9"],
  ["1P 3M 5P 7m 9M 13M", "dominant thirteenth", "13"],
  ["1P 3M 5P 7m 11A", "lydian dominant seventh", "7#11 7#4"],
  // '''Altered'''
  ["1P 3M 5P 7m 9m", "dominant flat ninth", "7b9"],
  ["1P 3M 5P 7m 9A", "dominant sharp ninth", "7#9"],
  ["1P 3M 7m 9m", "altered", "alt7"],
  // '''Suspended'''
  ["1P 4P 5P", "suspended fourth", "sus4 sus"],
  ["1P 2M 5P", "suspended second", "sus2"],
  ["1P 4P 5P 7m", "suspended fourth seventh", "7sus4 7sus"],
  ["1P 5P 7m 9M 11P", "eleventh", "11"],
  [
    "1P 4P 5P 7m 9m",
    "suspended fourth flat ninth",
    "b9sus phryg 7b9sus 7b9sus4"
  ],
  // ==Other==
  ["1P 5P", "fifth", "5"],
  ["1P 3M 5A", "augmented", "aug + +5 ^#5"],
  ["1P 3m 5A", "minor augmented", "m#5 -#5 m+"],
  ["1P 3M 5A 7M", "augmented seventh", "maj7#5 maj7+5 +maj7 ^7#5"],
  [
    "1P 3M 5P 7M 9M 11A",
    "major sharp eleventh (lydian)",
    "maj9#11 \u03949#11 ^9#11"
  ],
  // ==Legacy==
  ["1P 2M 4P 5P", "", "sus24 sus4add9"],
  ["1P 3M 5A 7M 9M", "", "maj9#5 Maj9#5"],
  ["1P 3M 5A 7m", "", "7#5 +7 7+ 7aug aug7"],
  ["1P 3M 5A 7m 9A", "", "7#5#9 7#9#5 7alt"],
  ["1P 3M 5A 7m 9M", "", "9#5 9+"],
  ["1P 3M 5A 7m 9M 11A", "", "9#5#11"],
  ["1P 3M 5A 7m 9m", "", "7#5b9 7b9#5"],
  ["1P 3M 5A 7m 9m 11A", "", "7#5b9#11"],
  ["1P 3M 5A 9A", "", "+add#9"],
  ["1P 3M 5A 9M", "", "M#5add9 +add9"],
  ["1P 3M 5P 6M 11A", "", "M6#11 M6b5 6#11 6b5"],
  ["1P 3M 5P 6M 7M 9M", "", "M7add13"],
  ["1P 3M 5P 6M 9M 11A", "", "69#11"],
  ["1P 3m 5P 6M 9M", "", "m69 -69"],
  ["1P 3M 5P 6m 7m", "", "7b6"],
  ["1P 3M 5P 7M 9A 11A", "", "maj7#9#11"],
  ["1P 3M 5P 7M 9M 11A 13M", "", "M13#11 maj13#11 M13+4 M13#4"],
  ["1P 3M 5P 7M 9m", "", "M7b9"],
  ["1P 3M 5P 7m 11A 13m", "", "7#11b13 7b5b13"],
  ["1P 3M 5P 7m 13M", "", "7add6 67 7add13"],
  ["1P 3M 5P 7m 9A 11A", "", "7#9#11 7b5#9 7#9b5"],
  ["1P 3M 5P 7m 9A 11A 13M", "", "13#9#11"],
  ["1P 3M 5P 7m 9A 11A 13m", "", "7#9#11b13"],
  ["1P 3M 5P 7m 9A 13M", "", "13#9"],
  ["1P 3M 5P 7m 9A 13m", "", "7#9b13"],
  ["1P 3M 5P 7m 9M 11A", "", "9#11 9+4 9#4"],
  ["1P 3M 5P 7m 9M 11A 13M", "", "13#11 13+4 13#4"],
  ["1P 3M 5P 7m 9M 11A 13m", "", "9#11b13 9b5b13"],
  ["1P 3M 5P 7m 9m 11A", "", "7b9#11 7b5b9 7b9b5"],
  ["1P 3M 5P 7m 9m 11A 13M", "", "13b9#11"],
  ["1P 3M 5P 7m 9m 11A 13m", "", "7b9b13#11 7b9#11b13 7b5b9b13"],
  ["1P 3M 5P 7m 9m 13M", "", "13b9"],
  ["1P 3M 5P 7m 9m 13m", "", "7b9b13"],
  ["1P 3M 5P 7m 9m 9A", "", "7b9#9"],
  ["1P 3M 5P 9M", "", "Madd9 2 add9 add2"],
  ["1P 3M 5P 9m", "", "Maddb9"],
  ["1P 3M 5d", "", "Mb5"],
  ["1P 3M 5d 6M 7m 9M", "", "13b5"],
  ["1P 3M 5d 7M", "", "M7b5"],
  ["1P 3M 5d 7M 9M", "", "M9b5"],
  ["1P 3M 5d 7m", "", "7b5"],
  ["1P 3M 5d 7m 9M", "", "9b5"],
  ["1P 3M 7m", "", "7no5"],
  ["1P 3M 7m 13m", "", "7b13"],
  ["1P 3M 7m 9M", "", "9no5"],
  ["1P 3M 7m 9M 13M", "", "13no5"],
  ["1P 3M 7m 9M 13m", "", "9b13"],
  ["1P 3m 4P 5P", "", "madd4"],
  ["1P 3m 5P 6m 7M", "", "mMaj7b6"],
  ["1P 3m 5P 6m 7M 9M", "", "mMaj9b6"],
  ["1P 3m 5P 7m 11P", "", "m7add11 m7add4"],
  ["1P 3m 5P 9M", "", "madd9"],
  ["1P 3m 5d 6M 7M", "", "o7M7"],
  ["1P 3m 5d 7M", "", "oM7"],
  ["1P 3m 6m 7M", "", "mb6M7"],
  ["1P 3m 6m 7m", "", "m7#5"],
  ["1P 3m 6m 7m 9M", "", "m9#5"],
  ["1P 3m 5A 7m 9M 11P", "", "m11A"],
  ["1P 3m 6m 9m", "", "mb6b9"],
  ["1P 2M 3m 5d 7m", "", "m9b5"],
  ["1P 4P 5A 7M", "", "M7#5sus4"],
  ["1P 4P 5A 7M 9M", "", "M9#5sus4"],
  ["1P 4P 5A 7m", "", "7#5sus4"],
  ["1P 4P 5P 7M", "", "M7sus4"],
  ["1P 4P 5P 7M 9M", "", "M9sus4"],
  ["1P 4P 5P 7m 9M", "", "9sus4 9sus"],
  ["1P 4P 5P 7m 9M 13M", "", "13sus4 13sus"],
  ["1P 4P 5P 7m 9m 13m", "", "7sus4b9b13 7b9b13sus4"],
  ["1P 4P 7m 10m", "", "4 quartal"],
  ["1P 5P 7m 9m 11P", "", "11b9"]
];
var data_default = CHORDS;
var NoChordType = {
  ...EmptyPcset,
  name: "",
  quality: "Unknown",
  intervals: [],
  aliases: []
};
var dictionary = [];
var index = {};
function get2(type) {
  return index[type] || NoChordType;
}
function all() {
  return dictionary.slice();
}
function add(intervals, aliases, fullName) {
  const quality = getQuality(intervals);
  const chord2 = {
    ...get(intervals),
    name: fullName || "",
    quality,
    intervals,
    aliases
  };
  dictionary.push(chord2);
  if (chord2.name) {
    index[chord2.name] = chord2;
  }
  index[chord2.setNum] = chord2;
  index[chord2.chroma] = chord2;
  chord2.aliases.forEach((alias) => addAlias(chord2, alias));
}
function addAlias(chord2, alias) {
  index[alias] = chord2;
}
function getQuality(intervals) {
  const has = (interval2) => intervals.indexOf(interval2) !== -1;
  return has("5A") ? "Augmented" : has("3M") ? "Major" : has("5d") ? "Diminished" : has("3m") ? "Minor" : "Unknown";
}
data_default.forEach(
  ([ivls, fullName, names22]) => add(ivls.split(" "), names22.split(" "), fullName)
);
dictionary.sort((a, b) => a.setNum - b.setNum);

// node_modules/@tonaljs/chord-detect/dist/index.mjs
var namedSet = (notes2) => {
  const pcToName = notes2.reduce((record, n) => {
    const chroma3 = note(n).chroma;
    if (chroma3 !== void 0) {
      record[chroma3] = record[chroma3] || note(n).name;
    }
    return record;
  }, {});
  return (chroma3) => pcToName[chroma3];
};
function detect(source, options = {}) {
  const notes2 = source.map((n) => note(n).pc).filter((x) => x);
  if (note.length === 0) {
    return [];
  }
  const found = findMatches(notes2, 1, options);
  return found.filter((chord2) => chord2.weight).sort((a, b) => b.weight - a.weight).map((chord2) => chord2.name);
}
var BITMASK = {
  // 3m 000100000000
  // 3M 000010000000
  anyThirds: 384,
  // 5P 000000010000
  perfectFifth: 16,
  // 5d 000000100000
  // 5A 000000001000
  nonPerfectFifths: 40,
  anySeventh: 3
};
var testChromaNumber = (bitmask) => (chromaNumber) => Boolean(chromaNumber & bitmask);
var hasAnyThird = testChromaNumber(BITMASK.anyThirds);
var hasPerfectFifth = testChromaNumber(BITMASK.perfectFifth);
var hasAnySeventh = testChromaNumber(BITMASK.anySeventh);
var hasNonPerfectFifth = testChromaNumber(BITMASK.nonPerfectFifths);
function hasAnyThirdAndPerfectFifthAndAnySeventh(chordType) {
  const chromaNumber = parseInt(chordType.chroma, 2);
  return hasAnyThird(chromaNumber) && hasPerfectFifth(chromaNumber) && hasAnySeventh(chromaNumber);
}
function withPerfectFifth(chroma3) {
  const chromaNumber = parseInt(chroma3, 2);
  return hasNonPerfectFifth(chromaNumber) ? chroma3 : (chromaNumber | 16).toString(2);
}
function findMatches(notes2, weight, options) {
  const tonic = notes2[0];
  const tonicChroma = note(tonic).chroma;
  const noteName = namedSet(notes2);
  const allModes = modes(notes2, false);
  const found = [];
  allModes.forEach((mode, index4) => {
    const modeWithPerfectFifth = options.assumePerfectFifth && withPerfectFifth(mode);
    const chordTypes = all().filter((chordType) => {
      if (options.assumePerfectFifth && hasAnyThirdAndPerfectFifthAndAnySeventh(chordType)) {
        return chordType.chroma === modeWithPerfectFifth;
      }
      return chordType.chroma === mode;
    });
    chordTypes.forEach((chordType) => {
      const chordName = chordType.aliases[0];
      const baseNote = noteName(index4);
      const isInversion = index4 !== tonicChroma;
      if (isInversion) {
        found.push({
          weight: 0.5 * weight,
          name: `${baseNote}${chordName}/${tonic}`
        });
      } else {
        found.push({ weight: 1 * weight, name: `${baseNote}${chordName}` });
      }
    });
  });
  return found;
}

// node_modules/@tonaljs/interval/dist/index.mjs
var IQ = "P m M m M P d P m M m M".split(" ");
var add2 = combinator((a, b) => [a[0] + b[0], a[1] + b[1]]);
var subtract = combinator((a, b) => [a[0] - b[0], a[1] - b[1]]);
function combinator(fn) {
  return (a, b) => {
    const coordA = interval(a).coord;
    const coordB = interval(b).coord;
    if (coordA && coordB) {
      const coord = fn(coordA, coordB);
      return coordToInterval(coord).name;
    }
  };
}

// node_modules/@tonaljs/scale-type/dist/index.mjs
var SCALES = [
  // Basic scales
  ["1P 2M 3M 5P 6M", "major pentatonic", "pentatonic"],
  ["1P 2M 3M 4P 5P 6M 7M", "major", "ionian"],
  ["1P 2M 3m 4P 5P 6m 7m", "minor", "aeolian"],
  // Jazz common scales
  ["1P 2M 3m 3M 5P 6M", "major blues"],
  ["1P 3m 4P 5d 5P 7m", "minor blues", "blues"],
  ["1P 2M 3m 4P 5P 6M 7M", "melodic minor"],
  ["1P 2M 3m 4P 5P 6m 7M", "harmonic minor"],
  ["1P 2M 3M 4P 5P 6M 7m 7M", "bebop"],
  ["1P 2M 3m 4P 5d 6m 6M 7M", "diminished", "whole-half diminished"],
  // Modes
  ["1P 2M 3m 4P 5P 6M 7m", "dorian"],
  ["1P 2M 3M 4A 5P 6M 7M", "lydian"],
  ["1P 2M 3M 4P 5P 6M 7m", "mixolydian", "dominant"],
  ["1P 2m 3m 4P 5P 6m 7m", "phrygian"],
  ["1P 2m 3m 4P 5d 6m 7m", "locrian"],
  // 5-note scales
  ["1P 3M 4P 5P 7M", "ionian pentatonic"],
  ["1P 3M 4P 5P 7m", "mixolydian pentatonic", "indian"],
  ["1P 2M 4P 5P 6M", "ritusen"],
  ["1P 2M 4P 5P 7m", "egyptian"],
  // Source: https://en.wikipedia.org/wiki/Neapolitan_scale
  ["1P 3M 4P 5d 7m", "neapolitan major pentatonic"],
  ["1P 3m 4P 5P 6m", "vietnamese 1"],
  ["1P 2m 3m 5P 6m", "pelog"],
  ["1P 2m 4P 5P 6m", "kumoijoshi"],
  ["1P 2M 3m 5P 6m", "hirajoshi"],
  ["1P 2m 4P 5d 7m", "iwato"],
  ["1P 2m 4P 5P 7m", "in-sen"],
  ["1P 3M 4A 5P 7M", "lydian pentatonic", "chinese"],
  ["1P 3m 4P 6m 7m", "malkos raga"],
  ["1P 3m 4P 5d 7m", "locrian pentatonic", "minor seven flat five pentatonic"],
  ["1P 3m 4P 5P 7m", "minor pentatonic", "vietnamese 2"],
  ["1P 3m 4P 5P 6M", "minor six pentatonic"],
  ["1P 2M 3m 5P 6M", "flat three pentatonic", "kumoi"],
  ["1P 2M 3M 5P 6m", "flat six pentatonic"],
  ["1P 2m 3M 5P 6M", "scriabin"],
  ["1P 3M 5d 6m 7m", "whole tone pentatonic"],
  ["1P 3M 4A 5A 7M", "lydian #5p pentatonic"],
  ["1P 3M 4A 5P 7m", "lydian dominant pentatonic"],
  ["1P 3m 4P 5P 7M", "minor #7m pentatonic"],
  ["1P 3m 4d 5d 7m", "super locrian pentatonic"],
  // 6-note scales
  ["1P 2M 3m 4P 5P 7M", "minor hexatonic"],
  ["1P 2A 3M 5P 5A 7M", "augmented"],
  ["1P 2M 4P 5P 6M 7m", "piongio"],
  // Source: https://en.wikipedia.org/wiki/Neapolitan_scale
  ["1P 2m 3M 4A 6M 7m", "prometheus neapolitan"],
  ["1P 2M 3M 4A 6M 7m", "prometheus"],
  ["1P 2m 3M 5d 6m 7m", "mystery #1"],
  ["1P 2m 3M 4P 5A 6M", "six tone symmetric"],
  ["1P 2M 3M 4A 5A 6A", "whole tone", "messiaen's mode #1"],
  ["1P 2m 4P 4A 5P 7M", "messiaen's mode #5"],
  // 7-note scales
  ["1P 2M 3M 4P 5d 6m 7m", "locrian major", "arabian"],
  ["1P 2m 3M 4A 5P 6m 7M", "double harmonic lydian"],
  [
    "1P 2m 2A 3M 4A 6m 7m",
    "altered",
    "super locrian",
    "diminished whole tone",
    "pomeroy"
  ],
  ["1P 2M 3m 4P 5d 6m 7m", "locrian #2", "half-diminished", "aeolian b5"],
  [
    "1P 2M 3M 4P 5P 6m 7m",
    "mixolydian b6",
    "melodic minor fifth mode",
    "hindu"
  ],
  ["1P 2M 3M 4A 5P 6M 7m", "lydian dominant", "lydian b7", "overtone"],
  ["1P 2M 3M 4A 5A 6M 7M", "lydian augmented"],
  [
    "1P 2m 3m 4P 5P 6M 7m",
    "dorian b2",
    "phrygian #6",
    "melodic minor second mode"
  ],
  [
    "1P 2m 3m 4d 5d 6m 7d",
    "ultralocrian",
    "superlocrian bb7",
    "superlocrian diminished"
  ],
  ["1P 2m 3m 4P 5d 6M 7m", "locrian 6", "locrian natural 6", "locrian sharp 6"],
  ["1P 2A 3M 4P 5P 5A 7M", "augmented heptatonic"],
  // Source https://en.wikipedia.org/wiki/Ukrainian_Dorian_scale
  [
    "1P 2M 3m 4A 5P 6M 7m",
    "dorian #4",
    "ukrainian dorian",
    "romanian minor",
    "altered dorian"
  ],
  ["1P 2M 3m 4A 5P 6M 7M", "lydian diminished"],
  ["1P 2M 3M 4A 5A 7m 7M", "leading whole tone"],
  ["1P 2M 3M 4A 5P 6m 7m", "lydian minor"],
  ["1P 2m 3M 4P 5P 6m 7m", "phrygian dominant", "spanish", "phrygian major"],
  ["1P 2m 3m 4P 5P 6m 7M", "balinese"],
  // Source: https://en.wikipedia.org/wiki/Neapolitan_scale
  ["1P 2m 3m 4P 5P 6M 7M", "neapolitan major"],
  ["1P 2M 3M 4P 5P 6m 7M", "harmonic major"],
  ["1P 2m 3M 4P 5P 6m 7M", "double harmonic major", "gypsy"],
  ["1P 2M 3m 4A 5P 6m 7M", "hungarian minor"],
  ["1P 2A 3M 4A 5P 6M 7m", "hungarian major"],
  ["1P 2m 3M 4P 5d 6M 7m", "oriental"],
  ["1P 2m 3m 3M 4A 5P 7m", "flamenco"],
  ["1P 2m 3m 4A 5P 6m 7M", "todi raga"],
  ["1P 2m 3M 4P 5d 6m 7M", "persian"],
  ["1P 2m 3M 5d 6m 7m 7M", "enigmatic"],
  [
    "1P 2M 3M 4P 5A 6M 7M",
    "major augmented",
    "major #5",
    "ionian augmented",
    "ionian #5"
  ],
  ["1P 2A 3M 4A 5P 6M 7M", "lydian #9"],
  // 8-note scales
  ["1P 2m 2M 4P 4A 5P 6m 7M", "messiaen's mode #4"],
  ["1P 2m 3M 4P 4A 5P 6m 7M", "purvi raga"],
  ["1P 2m 3m 3M 4P 5P 6m 7m", "spanish heptatonic"],
  ["1P 2M 3m 3M 4P 5P 6M 7m", "bebop minor"],
  ["1P 2M 3M 4P 5P 5A 6M 7M", "bebop major"],
  ["1P 2m 3m 4P 5d 5P 6m 7m", "bebop locrian"],
  ["1P 2M 3m 4P 5P 6m 7m 7M", "minor bebop"],
  ["1P 2M 3M 4P 5d 5P 6M 7M", "ichikosucho"],
  ["1P 2M 3m 4P 5P 6m 6M 7M", "minor six diminished"],
  [
    "1P 2m 3m 3M 4A 5P 6M 7m",
    "half-whole diminished",
    "dominant diminished",
    "messiaen's mode #2"
  ],
  ["1P 3m 3M 4P 5P 6M 7m 7M", "kafi raga"],
  ["1P 2M 3M 4P 4A 5A 6A 7M", "messiaen's mode #6"],
  // 9-note scales
  ["1P 2M 3m 3M 4P 5d 5P 6M 7m", "composite blues"],
  ["1P 2M 3m 3M 4A 5P 6m 7m 7M", "messiaen's mode #3"],
  // 10-note scales
  ["1P 2m 2M 3m 4P 4A 5P 6m 6M 7M", "messiaen's mode #7"],
  // 12-note scales
  ["1P 2m 2M 3m 3M 4P 5d 5P 6m 6M 7m 7M", "chromatic"]
];
var data_default2 = SCALES;
var NoScaleType = {
  ...EmptyPcset,
  intervals: [],
  aliases: []
};
var dictionary2 = [];
var index2 = {};
function get3(type) {
  return index2[type] || NoScaleType;
}
function all2() {
  return dictionary2.slice();
}
function add3(intervals, name2, aliases = []) {
  const scale = { ...get(intervals), name: name2, intervals, aliases };
  dictionary2.push(scale);
  index2[scale.name] = scale;
  index2[scale.setNum] = scale;
  index2[scale.chroma] = scale;
  scale.aliases.forEach((alias) => addAlias2(scale, alias));
  return scale;
}
function addAlias2(scale, alias) {
  index2[alias] = scale;
}
data_default2.forEach(
  ([ivls, name2, ...aliases]) => add3(ivls.split(" "), name2, aliases)
);

// node_modules/@tonaljs/chord/dist/index.mjs
var NoChord = {
  empty: true,
  name: "",
  symbol: "",
  root: "",
  bass: "",
  rootDegree: 0,
  type: "",
  tonic: null,
  setNum: NaN,
  quality: "Unknown",
  chroma: "",
  normalized: "",
  aliases: [],
  notes: [],
  intervals: []
};
function tokenize(name2) {
  const [letter, acc, oct, type] = tokenizeNote(name2);
  if (letter === "") {
    return tokenizeBass("", name2);
  } else if (letter === "A" && type === "ug") {
    return tokenizeBass("", "aug");
  } else {
    return tokenizeBass(letter + acc, oct + type);
  }
}
function tokenizeBass(note2, chord2) {
  const split = chord2.split("/");
  if (split.length === 1) {
    return [note2, split[0], ""];
  }
  const [letter, acc, oct, type] = tokenizeNote(split[1]);
  if (letter !== "" && oct === "" && type === "") {
    return [note2, split[0], letter + acc];
  } else {
    return [note2, chord2, ""];
  }
}
function get4(src) {
  if (Array.isArray(src)) {
    return getChord(src[1] || "", src[0], src[2]);
  } else if (src === "") {
    return NoChord;
  } else {
    const [tonic, type, bass] = tokenize(src);
    const chord2 = getChord(type, tonic, bass);
    return chord2.empty ? getChord(src) : chord2;
  }
}
function getChord(typeName, optionalTonic, optionalBass) {
  const type = get2(typeName);
  const tonic = note(optionalTonic || "");
  const bass = note(optionalBass || "");
  if (type.empty || optionalTonic && tonic.empty || optionalBass && bass.empty) {
    return NoChord;
  }
  const bassInterval = distance(tonic.pc, bass.pc);
  const bassIndex = type.intervals.indexOf(bassInterval);
  const hasRoot = bassIndex >= 0;
  const root = hasRoot ? bass : note("");
  const rootDegree = bassIndex === -1 ? NaN : bassIndex + 1;
  const hasBass = bass.pc && bass.pc !== tonic.pc;
  const intervals = Array.from(type.intervals);
  if (hasRoot) {
    for (let i = 1; i < rootDegree; i++) {
      const num = intervals[0][0];
      const quality = intervals[0][1];
      const newNum = parseInt(num, 10) + 7;
      intervals.push(`${newNum}${quality}`);
      intervals.shift();
    }
  } else if (hasBass) {
    const ivl = subtract(distance(tonic.pc, bass.pc), "8P");
    if (ivl)
      intervals.unshift(ivl);
  }
  const notes2 = tonic.empty ? [] : intervals.map((i) => transpose(tonic.pc, i));
  typeName = type.aliases.indexOf(typeName) !== -1 ? typeName : type.aliases[0];
  const symbol = `${tonic.empty ? "" : tonic.pc}${typeName}${hasRoot && rootDegree > 1 ? "/" + root.pc : hasBass ? "/" + bass.pc : ""}`;
  const name2 = `${optionalTonic ? tonic.pc + " " : ""}${type.name}${hasRoot && rootDegree > 1 ? " over " + root.pc : hasBass ? " over " + bass.pc : ""}`;
  return {
    ...type,
    name: name2,
    symbol,
    tonic: tonic.pc,
    type: type.name,
    root: root.pc,
    bass: hasBass ? bass.pc : "",
    intervals,
    rootDegree,
    notes: notes2
  };
}
var chord = get4;
function transpose2(chordName, interval2) {
  const [tonic, type, bass] = tokenize(chordName);
  if (!tonic) {
    return chordName;
  }
  const tr2 = transpose(bass, interval2);
  const slash = tr2 ? "/" + tr2 : "";
  return transpose(tonic, interval2) + type + slash;
}
function chordScales(name2) {
  const s = get4(name2);
  const isChordIncluded = isSupersetOf(s.chroma);
  return all2().filter((scale) => isChordIncluded(scale.chroma)).map((scale) => scale.name);
}
function extended(chordName) {
  const s = get4(chordName);
  const isSuperset = isSupersetOf(s.chroma);
  return all().filter((chord2) => isSuperset(chord2.chroma)).map((chord2) => s.tonic + chord2.aliases[0]);
}
function reduced(chordName) {
  const s = get4(chordName);
  const isSubset = isSubsetOf(s.chroma);
  return all().filter((chord2) => isSubset(chord2.chroma)).map((chord2) => s.tonic + chord2.aliases[0]);
}
function notes(chordName, tonic) {
  const chord2 = get4(chordName);
  const note2 = tonic || chord2.tonic;
  if (!note2 || chord2.empty)
    return [];
  return chord2.intervals.map((ivl) => transpose(note2, ivl));
}
function degrees(chordName, tonic) {
  const chord2 = get4(chordName);
  const note2 = tonic || chord2.tonic;
  const transpose22 = tonicIntervalsTransposer(chord2.intervals, note2);
  return (degree) => degree ? transpose22(degree > 0 ? degree - 1 : degree) : "";
}
function steps(chordName, tonic) {
  const chord2 = get4(chordName);
  const note2 = tonic || chord2.tonic;
  return tonicIntervalsTransposer(chord2.intervals, note2);
}
var index_default = {
  getChord,
  get: get4,
  detect,
  chordScales,
  extended,
  reduced,
  tokenize,
  transpose: transpose2,
  degrees,
  steps,
  notes,
  chord
};

// node_modules/@tonaljs/duration-value/dist/index.mjs
var DATA = [
  [
    0.125,
    "dl",
    ["large", "duplex longa", "maxima", "octuple", "octuple whole"]
  ],
  [0.25, "l", ["long", "longa"]],
  [0.5, "d", ["double whole", "double", "breve"]],
  [1, "w", ["whole", "semibreve"]],
  [2, "h", ["half", "minim"]],
  [4, "q", ["quarter", "crotchet"]],
  [8, "e", ["eighth", "quaver"]],
  [16, "s", ["sixteenth", "semiquaver"]],
  [32, "t", ["thirty-second", "demisemiquaver"]],
  [64, "sf", ["sixty-fourth", "hemidemisemiquaver"]],
  [128, "h", ["hundred twenty-eighth"]],
  [256, "th", ["two hundred fifty-sixth"]]
];
var data_default3 = DATA;
var VALUES = [];
data_default3.forEach(
  ([denominator, shorthand, names22]) => add4(denominator, shorthand, names22)
);
function add4(denominator, shorthand, names22) {
  VALUES.push({
    empty: false,
    dots: "",
    name: "",
    value: 1 / denominator,
    fraction: denominator < 1 ? [1 / denominator, 1] : [1, denominator],
    shorthand,
    names: names22
  });
}

// node_modules/@tonaljs/midi/dist/index.mjs
var L2 = Math.log(2);
var L440 = Math.log(440);
function freqToMidi(freq2) {
  const v = 12 * (Math.log(freq2) - L440) / L2 + 69;
  return Math.round(v * 100) / 100;
}
var SHARPS = "C C# D D# E F F# G G# A A# B".split(" ");
var FLATS = "C Db D Eb E F Gb G Ab A Bb B".split(" ");
function midiToNoteName(midi2, options = {}) {
  if (isNaN(midi2) || midi2 === -Infinity || midi2 === Infinity)
    return "";
  midi2 = Math.round(midi2);
  const pcs = options.sharps === true ? SHARPS : FLATS;
  const pc = pcs[midi2 % 12];
  if (options.pitchClass) {
    return pc;
  }
  const o = Math.floor(midi2 / 12) - 1;
  return pc + o;
}

// node_modules/@tonaljs/note/dist/index.mjs
var NAMES = ["C", "D", "E", "F", "G", "A", "B"];
var toName = (n) => n.name;
var onlyNotes = (array) => array.map(note).filter((n) => !n.empty);
function names(array) {
  if (array === void 0) {
    return NAMES.slice();
  } else if (!Array.isArray(array)) {
    return [];
  } else {
    return onlyNotes(array).map(toName);
  }
}
var get5 = note;
var name = (note2) => get5(note2).name;
var pitchClass = (note2) => get5(note2).pc;
var accidentals = (note2) => get5(note2).acc;
var octave = (note2) => get5(note2).oct;
var midi = (note2) => get5(note2).midi;
var freq = (note2) => get5(note2).freq;
var chroma = (note2) => get5(note2).chroma;
function fromMidi(midi2) {
  return midiToNoteName(midi2);
}
function fromFreq(freq2) {
  return midiToNoteName(freqToMidi(freq2));
}
function fromFreqSharps(freq2) {
  return midiToNoteName(freqToMidi(freq2), { sharps: true });
}
function fromMidiSharps(midi2) {
  return midiToNoteName(midi2, { sharps: true });
}
var distance2 = distance;
var transpose3 = transpose;
var tr = transpose;
var transposeBy = (interval2) => (note2) => transpose3(note2, interval2);
var trBy = transposeBy;
var transposeFrom = (note2) => (interval2) => transpose3(note2, interval2);
var trFrom = transposeFrom;
function transposeFifths(noteName, fifths) {
  return transpose3(noteName, [fifths, 0]);
}
var trFifths = transposeFifths;
function transposeOctaves(noteName, octaves) {
  return transpose3(noteName, [0, octaves]);
}
var ascending = (a, b) => a.height - b.height;
var descending = (a, b) => b.height - a.height;
function sortedNames(notes2, comparator) {
  comparator = comparator || ascending;
  return onlyNotes(notes2).sort(comparator).map(toName);
}
function sortedUniqNames(notes2) {
  return sortedNames(notes2, ascending).filter(
    (n, i, a) => i === 0 || n !== a[i - 1]
  );
}
var simplify = (noteName) => {
  const note2 = get5(noteName);
  if (note2.empty) {
    return "";
  }
  return midiToNoteName(note2.midi || note2.chroma, {
    sharps: note2.alt > 0,
    pitchClass: note2.midi === null
  });
};
function enharmonic(noteName, destName) {
  const src = get5(noteName);
  if (src.empty) {
    return "";
  }
  const dest = get5(
    destName || midiToNoteName(src.midi || src.chroma, {
      sharps: src.alt < 0,
      pitchClass: true
    })
  );
  if (dest.empty || dest.chroma !== src.chroma) {
    return "";
  }
  if (src.oct === void 0) {
    return dest.pc;
  }
  const srcChroma = src.chroma - src.alt;
  const destChroma = dest.chroma - dest.alt;
  const destOctOffset = srcChroma > 11 || destChroma < 0 ? -1 : srcChroma < 0 || destChroma > 11 ? 1 : 0;
  const destOct = src.oct + destOctOffset;
  return dest.pc + destOct;
}
var index_default2 = {
  names,
  get: get5,
  name,
  pitchClass,
  accidentals,
  octave,
  midi,
  ascending,
  descending,
  distance: distance2,
  sortedNames,
  sortedUniqNames,
  fromMidi,
  fromMidiSharps,
  freq,
  fromFreq,
  fromFreqSharps,
  chroma,
  transpose: transpose3,
  tr,
  transposeBy,
  trBy,
  transposeFrom,
  trFrom,
  transposeFifths,
  transposeOctaves,
  trFifths,
  simplify,
  enharmonic
};

// node_modules/@tonaljs/roman-numeral/dist/index.mjs
var NoRomanNumeral = { empty: true, name: "", chordType: "" };
var cache4 = {};
function get6(src) {
  return typeof src === "string" ? cache4[src] || (cache4[src] = parse3(src)) : typeof src === "number" ? get6(NAMES2[src] || "") : isPitch(src) ? fromPitch(src) : isNamedPitch(src) ? get6(src.name) : NoRomanNumeral;
}
function fromPitch(pitch2) {
  return get6(altToAcc(pitch2.alt) + NAMES2[pitch2.step]);
}
var REGEX4 = /^(#{1,}|b{1,}|x{1,}|)(IV|I{1,3}|VI{0,2}|iv|i{1,3}|vi{0,2})([^IViv]*)$/;
function tokenize2(str) {
  return REGEX4.exec(str) || ["", "", "", ""];
}
var ROMANS = "I II III IV V VI VII";
var NAMES2 = ROMANS.split(" ");
var NAMES_MINOR = ROMANS.toLowerCase().split(" ");
function parse3(src) {
  const [name2, acc, roman, chordType] = tokenize2(src);
  if (!roman) {
    return NoRomanNumeral;
  }
  const upperRoman = roman.toUpperCase();
  const step = NAMES2.indexOf(upperRoman);
  const alt = accToAlt(acc);
  const dir = 1;
  return {
    empty: false,
    name: name2,
    roman,
    interval: interval({ step, alt, dir }).name,
    acc,
    chordType,
    alt,
    step,
    major: roman === upperRoman,
    oct: 0,
    dir
  };
}

// node_modules/@tonaljs/key/dist/index.mjs
var Empty = Object.freeze([]);
var NoKey = {
  type: "major",
  tonic: "",
  alteration: 0,
  keySignature: ""
};
var NoKeyScale = {
  tonic: "",
  grades: Empty,
  intervals: Empty,
  scale: Empty,
  triads: Empty,
  chords: Empty,
  chordsHarmonicFunction: Empty,
  chordScales: Empty,
  secondaryDominants: Empty,
  secondaryDominantSupertonics: Empty,
  substituteDominantsMinorRelative: Empty,
  substituteDominants: Empty,
  substituteDominantSupertonics: Empty,
  secondaryDominantsMinorRelative: Empty
};
var NoMajorKey = {
  ...NoKey,
  ...NoKeyScale,
  type: "major",
  minorRelative: "",
  scale: Empty,
  substituteDominants: Empty,
  secondaryDominantSupertonics: Empty,
  substituteDominantsMinorRelative: Empty
};
var NoMinorKey = {
  ...NoKey,
  type: "minor",
  relativeMajor: "",
  natural: NoKeyScale,
  harmonic: NoKeyScale,
  melodic: NoKeyScale
};
var mapScaleToType = (scale, list, sep = "") => list.map((type, i) => `${scale[i]}${sep}${type}`);
function keyScale(grades, triads3, chordTypes, harmonicFunctions, chordScales2) {
  return (tonic) => {
    const intervals = grades.map((gr) => get6(gr).interval || "");
    const scale = intervals.map((interval2) => transpose3(tonic, interval2));
    const chords2 = mapScaleToType(scale, chordTypes);
    const secondaryDominants = scale.map((note2) => transpose3(note2, "5P")).map(
      (note2) => (
        // A secondary dominant is a V chord which:
        // 1. is not diatonic to the key,
        // 2. it must have a diatonic root.
        scale.includes(note2) && !chords2.includes(note2 + "7") ? note2 + "7" : ""
      )
    );
    const secondaryDominantSupertonics = supertonics(
      secondaryDominants,
      triads3
    );
    const substituteDominants = secondaryDominants.map((chord2) => {
      if (!chord2)
        return "";
      const domRoot = chord2.slice(0, -1);
      const subRoot = transpose3(domRoot, "5d");
      return subRoot + "7";
    });
    const substituteDominantSupertonics = supertonics(
      substituteDominants,
      triads3
    );
    return {
      tonic,
      grades,
      intervals,
      scale,
      triads: mapScaleToType(scale, triads3),
      chords: chords2,
      chordsHarmonicFunction: harmonicFunctions.slice(),
      chordScales: mapScaleToType(scale, chordScales2, " "),
      secondaryDominants,
      secondaryDominantSupertonics,
      substituteDominants,
      substituteDominantSupertonics,
      // @deprecated use secondaryDominantsSupertonic
      secondaryDominantsMinorRelative: secondaryDominantSupertonics,
      // @deprecated use secondaryDominantsSupertonic
      substituteDominantsMinorRelative: substituteDominantSupertonics
    };
  };
}
var supertonics = (dominants, targetTriads) => {
  return dominants.map((chord2, index4) => {
    if (!chord2)
      return "";
    const domRoot = chord2.slice(0, -1);
    const minorRoot = transpose3(domRoot, "5P");
    const target = targetTriads[index4];
    const isMinor = target.endsWith("m");
    return isMinor ? minorRoot + "m7" : minorRoot + "m7b5";
  });
};
var MajorScale = keyScale(
  "I II III IV V VI VII".split(" "),
  " m m   m dim".split(" "),
  "maj7 m7 m7 maj7 7 m7 m7b5".split(" "),
  "T SD T SD D T D".split(" "),
  "major,dorian,phrygian,lydian,mixolydian,minor,locrian".split(",")
);
var NaturalScale = keyScale(
  "I II bIII IV V bVI bVII".split(" "),
  "m dim  m m  ".split(" "),
  "m7 m7b5 maj7 m7 m7 maj7 7".split(" "),
  "T SD T SD D SD SD".split(" "),
  "minor,locrian,major,dorian,phrygian,lydian,mixolydian".split(",")
);
var HarmonicScale = keyScale(
  "I II bIII IV V bVI VII".split(" "),
  "m dim aug m   dim".split(" "),
  "mMaj7 m7b5 +maj7 m7 7 maj7 o7".split(" "),
  "T SD T SD D SD D".split(" "),
  "harmonic minor,locrian 6,major augmented,lydian diminished,phrygian dominant,lydian #9,ultralocrian".split(
    ","
  )
);
var MelodicScale = keyScale(
  "I II bIII IV V VI VII".split(" "),
  "m m aug   dim dim".split(" "),
  "m6 m7 +maj7 7 7 m7b5 m7b5".split(" "),
  "T SD T SD D  ".split(" "),
  "melodic minor,dorian b2,lydian augmented,lydian dominant,mixolydian b6,locrian #2,altered".split(
    ","
  )
);

// node_modules/@tonaljs/mode/dist/index.mjs
var MODES = [
  [0, 2773, 0, "ionian", "", "Maj7", "major"],
  [1, 2902, 2, "dorian", "m", "m7"],
  [2, 3418, 4, "phrygian", "m", "m7"],
  [3, 2741, -1, "lydian", "", "Maj7"],
  [4, 2774, 1, "mixolydian", "", "7"],
  [5, 2906, 3, "aeolian", "m", "m7", "minor"],
  [6, 3434, 5, "locrian", "dim", "m7b5"]
];
var NoMode = {
  ...EmptyPcset,
  name: "",
  alt: 0,
  modeNum: NaN,
  triad: "",
  seventh: "",
  aliases: []
};
var modes2 = MODES.map(toMode);
var index3 = {};
modes2.forEach((mode2) => {
  index3[mode2.name] = mode2;
  mode2.aliases.forEach((alias) => {
    index3[alias] = mode2;
  });
});
function get7(name2) {
  return typeof name2 === "string" ? index3[name2.toLowerCase()] || NoMode : name2 && name2.name ? get7(name2.name) : NoMode;
}
function toMode(mode2) {
  const [modeNum, setNum, alt, name2, triad, seventh, alias] = mode2;
  const aliases = alias ? [alias] : [];
  const chroma3 = Number(setNum).toString(2);
  const intervals = get3(name2).intervals;
  return {
    empty: false,
    intervals,
    modeNum,
    chroma: chroma3,
    normalized: chroma3,
    name: name2,
    setNum,
    alt,
    triad,
    seventh,
    aliases
  };
}
function chords(chords2) {
  return (modeName, tonic) => {
    const mode2 = get7(modeName);
    if (mode2.empty)
      return [];
    const triads22 = rotate(mode2.modeNum, chords2);
    const tonics = mode2.intervals.map((i) => transpose(tonic, i));
    return triads22.map((triad, i) => tonics[i] + triad);
  };
}
var triads = chords(MODES.map((x) => x[4]));
var seventhChords = chords(MODES.map((x) => x[5]));

// node_modules/@tonaljs/voice-leading/dist/index.mjs
var topNoteDiff = (voicings, lastVoicing) => {
  if (!lastVoicing || !lastVoicing.length) {
    return voicings[0];
  }
  const topNoteMidi = (voicing) => index_default2.midi(voicing[voicing.length - 1]) || 0;
  const diff = (voicing) => Math.abs(topNoteMidi(lastVoicing) - topNoteMidi(voicing));
  return voicings.sort((a, b) => diff(a) - diff(b))[0];
};
var index_default3 = {
  topNoteDiff
};

// node_modules/@tonaljs/voicing-dictionary/dist/index.mjs
var triads2 = {
  M: ["1P 3M 5P", "3M 5P 8P", "5P 8P 10M"],
  m: ["1P 3m 5P", "3m 5P 8P", "5P 8P 10m"],
  o: ["1P 3m 5d", "3m 5d 8P", "5d 8P 10m"],
  aug: ["1P 3M 5A", "3M 5A 8P", "5A 8P 10M"]
};
var lefthand = {
  m7: ["3m 5P 7m 9M", "7m 9M 10m 12P"],
  "7": ["3M 6M 7m 9M", "7m 9M 10M 13M"],
  "^7": ["3M 5P 7M 9M", "7M 9M 10M 12P"],
  "69": ["3M 5P 6A 9M"],
  m7b5: ["3m 5d 7m 8P", "7m 8P 10m 12d"],
  "7b9": ["3M 6m 7m 9m", "7m 9m 10M 13m"],
  // b9 / b13
  "7b13": ["3M 6m 7m 9m", "7m 9m 10M 13m"],
  // b9 / b13
  o7: ["1P 3m 5d 6M", "5d 6M 8P 10m"],
  "7#11": ["7m 9M 11A 13A"],
  "7#9": ["3M 7m 9A"],
  mM7: ["3m 5P 7M 9M", "7M 9M 10m 12P"],
  m6: ["3m 5P 6M 9M", "6M 9M 10m 12P"]
};
var all3 = {
  M: ["1P 3M 5P", "3M 5P 8P", "5P 8P 10M"],
  m: ["1P 3m 5P", "3m 5P 8P", "5P 8P 10m"],
  o: ["1P 3m 5d", "3m 5d 8P", "5d 8P 10m"],
  aug: ["1P 3M 5A", "3M 5A 8P", "5A 8P 10M"],
  m7: ["3m 5P 7m 9M", "7m 9M 10m 12P"],
  "7": ["3M 6M 7m 9M", "7m 9M 10M 13M"],
  "^7": ["3M 5P 7M 9M", "7M 9M 10M 12P"],
  "69": ["3M 5P 6A 9M"],
  m7b5: ["3m 5d 7m 8P", "7m 8P 10m 12d"],
  "7b9": ["3M 6m 7m 9m", "7m 9m 10M 13m"],
  // b9 / b13
  "7b13": ["3M 6m 7m 9m", "7m 9m 10M 13m"],
  // b9 / b13
  o7: ["1P 3m 5d 6M", "5d 6M 8P 10m"],
  "7#11": ["7m 9M 11A 13A"],
  "7#9": ["3M 7m 9A"],
  mM7: ["3m 5P 7M 9M", "7M 9M 10m 12P"],
  m6: ["3m 5P 6M 9M", "6M 9M 10m 12P"]
};
var defaultDictionary = lefthand;
function lookup(symbol, dictionary3 = defaultDictionary) {
  if (dictionary3[symbol]) {
    return dictionary3[symbol];
  }
  const { aliases } = index_default.get("C" + symbol);
  const match = Object.keys(dictionary3).find((_symbol) => aliases.includes(_symbol)) || "";
  if (match !== void 0) {
    return dictionary3[match];
  }
  return void 0;
}
var index_default4 = {
  lookup,
  lefthand,
  triads: triads2,
  all: all3,
  defaultDictionary
};

// node_modules/@tonaljs/voicing/dist/index.mjs
var defaultDictionary2 = index_default4.all;
var defaultVoiceLeading = index_default3.topNoteDiff;

// node_modules/@tonaljs/core/dist/index.mjs
function deprecate(original, alternative, fn) {
  return function(...args) {
    console.warn(`${original} is deprecated. Use ${alternative}.`);
    return fn.apply(this, args);
  };
}
var isNamed = deprecate("isNamed", "isNamedPitch", isNamedPitch);

// main.ts
var VIEW_TYPE_PIANOMETER = "pianometer-view";
var DEFAULT_SETTINGS = {
  keyColor: "#ff0090",
  rainbowMode: false,
  displayNoteNames: false,
  keyboardScale: 100
};
var PianoMeterPlugin = class extends import_obsidian.Plugin {
  async onload() {
    await this.loadSettings();
    this.registerView(
      VIEW_TYPE_PIANOMETER,
      (leaf) => new PianoMeterView(leaf, this)
    );
    this.addRibbonIcon("music", "PianoMeter", () => {
      this.activateView();
    });
    this.addCommand({
      id: "open-pianometer",
      name: "\u6253\u5F00\u94A2\u7434\u952E\u76D8\u663E\u793A\u5668",
      callback: () => {
        this.activateView();
      }
    });
    this.addSettingTab(new PianoMeterSettingTab(this.app, this));
  }
  onunload() {
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  async activateView() {
    const { workspace } = this.app;
    let leaf = null;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_PIANOMETER);
    if (leaves.length > 0) {
      leaf = leaves[0];
    } else {
      leaf = workspace.getRightLeaf(false);
      await (leaf == null ? void 0 : leaf.setViewState({ type: VIEW_TYPE_PIANOMETER, active: true }));
    }
    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }
};
var PianoMeterView = class extends import_obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.midiAccess = null;
    this.activeInputs = /* @__PURE__ */ new Map();
    // Piano state
    this.isKeyOn = new Array(128).fill(0);
    this.isPedaled = new Array(128).fill(0);
    this.nowPedaling = false;
    this.cc64now = 0;
    this.cc67now = 0;
    // Stats
    this.sessionStartTime = new Date();
    this.totalNotesPlayed = 0;
    this.notesThisFrame = 0;
    this.shortTermTotal = new Array(60).fill(0);
    this.legatoHistory = new Array(60).fill(0);
    this.notesSMax = 0;
    this.totalIntensityScore = 0;
    this.flatNames = false;
    // Layout constants
    this.border = 3;
    this.whiteKeyWidth = 20;
    this.whiteKeySpace = 1;
    this.blackKeyWidth = 17;
    this.blackKeyHeight = 45;
    this.radius = 5;
    this.bRadius = 4;
    this.keyAreaY = 3;
    this.keyAreaHeight = 70;
    this.isBlack = [0, 11, 0, 13, 0, 0, 11, 0, 12, 0, 13, 0];
    this.plugin = plugin;
  }
  getViewType() {
    return VIEW_TYPE_PIANOMETER;
  }
  getDisplayText() {
    return "PianoMeter";
  }
  getIcon() {
    return "music";
  }
  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("pianometer-container");
    const titleEl = this.containerEl.querySelector(".view-header-title");
    if (titleEl) {
      titleEl.addClass("pianometer-title-chord");
      this.chordDisplay = titleEl;
    } else {
      this.chordDisplay = container.createDiv({ cls: "pianometer-chord-display" });
    }
    const toggleBtn = container.createEl("button", {
      cls: "pianometer-toggle-btn",
      text: "\u2699\uFE0F"
    });
    this.canvas = container.createEl("canvas", { cls: "pianometer-canvas" });
    this.canvas.width = 1098;
    this.canvas.height = 76;
    this.ctx = this.canvas.getContext("2d");
    const controls = container.createDiv({ cls: "pianometer-controls pianometer-hidden" });
    toggleBtn.addEventListener("click", () => {
      controls.classList.toggle("pianometer-hidden");
      toggleBtn.textContent = controls.classList.contains("pianometer-hidden") ? "\u2699\uFE0F" : "\u2715";
    });
    const midiSection = controls.createDiv({ cls: "pianometer-midi-section" });
    midiSection.createEl("label", { text: "MIDI \u8BBE\u5907:" });
    this.midiDeviceList = midiSection.createDiv({ cls: "pianometer-midi-list" });
    const colorRow = controls.createDiv({ cls: "pianometer-row" });
    colorRow.createEl("label", { text: "\u989C\u8272: " });
    const colorPicker = colorRow.createEl("input", { type: "color" });
    colorPicker.value = this.plugin.settings.keyColor;
    colorPicker.addEventListener("input", () => {
      this.plugin.settings.keyColor = colorPicker.value;
      this.plugin.saveSettings();
    });
    const rainbowRow = controls.createDiv({ cls: "pianometer-row" });
    rainbowRow.createEl("label", { text: "\u5F69\u8679\u6A21\u5F0F: " });
    const rainbowToggle = rainbowRow.createEl("input", { type: "checkbox" });
    rainbowToggle.checked = this.plugin.settings.rainbowMode;
    rainbowToggle.addEventListener("change", () => {
      this.plugin.settings.rainbowMode = rainbowToggle.checked;
      this.plugin.saveSettings();
    });
    const noteNamesRow = controls.createDiv({ cls: "pianometer-row" });
    noteNamesRow.createEl("label", { text: "\u663E\u793A\u97F3\u540D: " });
    const noteNamesToggle = noteNamesRow.createEl("input", { type: "checkbox" });
    noteNamesToggle.checked = this.plugin.settings.displayNoteNames;
    noteNamesToggle.addEventListener("change", () => {
      this.plugin.settings.displayNoteNames = noteNamesToggle.checked;
      this.plugin.saveSettings();
    });
    const scaleRow = controls.createDiv({ cls: "pianometer-row" });
    scaleRow.createEl("label", { text: "\u952E\u76D8\u5927\u5C0F: " });
    const scaleSlider = scaleRow.createEl("input", { type: "range" });
    scaleSlider.min = "70";
    scaleSlider.max = "300";
    scaleSlider.value = String(this.plugin.settings.keyboardScale);
    const scaleValue = scaleRow.createEl("span", { cls: "pianometer-scale-value" });
    scaleValue.textContent = `${this.plugin.settings.keyboardScale}%`;
    scaleSlider.addEventListener("input", () => {
      const scale = parseInt(scaleSlider.value);
      scaleValue.textContent = `${scale}%`;
      this.plugin.settings.keyboardScale = scale;
      this.plugin.saveSettings();
      this.applyKeyboardScale(scale);
    });
    this.applyKeyboardScale(this.plugin.settings.keyboardScale);
    const resetRow = controls.createDiv({ cls: "pianometer-row pianometer-reset-row" });
    const resetTimeBtn = resetRow.createEl("button", { text: "\u91CD\u7F6E\u65F6\u95F4" });
    resetTimeBtn.addEventListener("click", () => {
      this.sessionStartTime = new Date();
    });
    const resetNotesBtn = resetRow.createEl("button", { text: "\u91CD\u7F6E\u97F3\u7B26" });
    resetNotesBtn.addEventListener("click", () => {
      this.totalNotesPlayed = 0;
      this.notesSMax = 0;
      this.totalIntensityScore = 0;
    });
    await this.initMIDI();
    this.startAnimation();
    this.canvas.addEventListener("click", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (y > 76 && x > 441 && x < 841) {
        this.flatNames = !this.flatNames;
      }
    });
  }
  async initMIDI() {
    try {
      this.midiAccess = await navigator.requestMIDIAccess();
      this.updateMIDIDevices();
      this.midiAccess.onstatechange = () => {
        this.updateMIDIDevices();
      };
    } catch (err) {
      console.error("Web MIDI API not supported:", err);
      this.midiDeviceList.innerHTML = '<span class="pianometer-no-midi">MIDI \u4E0D\u53EF\u7528</span>';
    }
  }
  updateMIDIDevices() {
    if (!this.midiAccess)
      return;
    this.midiDeviceList.innerHTML = "";
    const inputsMap = this.midiAccess.inputs;
    const inputs = [];
    inputsMap.forEach((input) => inputs.push(input));
    if (inputs.length === 0) {
      this.midiDeviceList.innerHTML = '<span class="pianometer-no-midi">\u672A\u68C0\u6D4B\u5230 MIDI \u8BBE\u5907</span>';
      return;
    }
    inputs.forEach((input, index4) => {
      const deviceRow = this.midiDeviceList.createDiv({ cls: "pianometer-midi-device" });
      const checkbox = deviceRow.createEl("input", { type: "checkbox" });
      checkbox.id = `midi-${input.id}`;
      checkbox.checked = true;
      checkbox.addEventListener("change", () => {
        this.toggleMIDIInput(input.id, checkbox.checked);
      });
      const label = deviceRow.createEl("label");
      label.setAttribute("for", `midi-${input.id}`);
      label.textContent = input.name || `MIDI Input ${index4 + 1}`;
      this.enableMIDIInput(input);
    });
  }
  enableMIDIInput(input) {
    if (this.activeInputs.has(input.id))
      return;
    input.onmidimessage = (e) => this.handleMIDIMessage(e);
    this.activeInputs.set(input.id, input);
  }
  disableMIDIInput(inputId) {
    const input = this.activeInputs.get(inputId);
    if (input) {
      input.onmidimessage = null;
      this.activeInputs.delete(inputId);
    }
  }
  toggleMIDIInput(inputId, enabled) {
    if (!this.midiAccess)
      return;
    if (enabled) {
      const inputsMap = this.midiAccess.inputs;
      const input = inputsMap.get(inputId);
      if (input) {
        this.enableMIDIInput(input);
      }
    } else {
      this.disableMIDIInput(inputId);
    }
  }
  handleMIDIMessage(event) {
    const data = event.data;
    if (!data || data.length < 2)
      return;
    const status = data[0] & 240;
    const channel = data[0] & 15;
    switch (status) {
      case 144:
        if (data[2] > 0) {
          this.noteOn(data[1], data[2]);
        } else {
          this.noteOff(data[1]);
        }
        break;
      case 128:
        this.noteOff(data[1]);
        break;
      case 176:
        this.controllerChange(data[1], data[2]);
        break;
    }
  }
  noteOn(pitch2, velocity) {
    this.totalNotesPlayed++;
    this.notesThisFrame++;
    this.totalIntensityScore += velocity;
    this.isKeyOn[pitch2] = 1;
    if (this.nowPedaling) {
      this.isPedaled[pitch2] = 1;
    }
  }
  noteOff(pitch2) {
    this.isKeyOn[pitch2] = 0;
  }
  controllerChange(number, value) {
    if (number === 64) {
      this.cc64now = value;
      if (value >= 64) {
        this.nowPedaling = true;
        for (let i = 0; i < 128; i++) {
          this.isPedaled[i] = this.isKeyOn[i];
        }
      } else {
        this.nowPedaling = false;
        this.isPedaled.fill(0);
      }
    } else if (number === 67) {
      this.cc67now = value;
    }
  }
  applyKeyboardScale(scale) {
    const scaleRatio = scale / 100;
    this.canvas.style.width = `${1098 * scaleRatio}px`;
    this.canvas.style.height = `${76 * scaleRatio}px`;
  }
  startAnimation() {
    const draw = () => {
      this.drawFrame();
      this.animationId = requestAnimationFrame(draw);
    };
    draw();
  }
  drawFrame() {
    const ctx = this.ctx;
    const settings = this.plugin.settings;
    ctx.fillStyle = "#333";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.shortTermTotal.push(this.notesThisFrame);
    this.shortTermTotal.shift();
    this.notesThisFrame = 0;
    this.legatoHistory.push(this.isKeyOn.reduce((a, b) => a + b, 0));
    this.legatoHistory.shift();
    this.drawWhiteKeys(ctx, settings);
    this.drawBlackKeys(ctx, settings);
    if (settings.displayNoteNames) {
      this.drawNoteNames(ctx);
    }
    this.drawTexts(ctx);
  }
  hexToHSL(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
  }
  getKeyColor(midiNote, isPedaled, settings) {
    if (settings.rainbowMode) {
      const hue = (midiNote - 21) / 87 * 1080 % 360;
      const lightness = isPedaled ? 50 : 70;
      return `hsl(${hue}, 100%, ${lightness}%)`;
    } else {
      const hsl = this.hexToHSL(settings.keyColor);
      const lightness = isPedaled ? hsl.l * 0.7 : hsl.l;
      return `hsl(${hsl.h}, ${hsl.s}%, ${lightness}%)`;
    }
  }
  drawWhiteKeys(ctx, settings) {
    let wIndex = 0;
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    for (let i = 21; i < 109; i++) {
      if (this.isBlack[i % 12] === 0) {
        const x = this.border + wIndex * (this.whiteKeyWidth + this.whiteKeySpace);
        if (this.isKeyOn[i] === 1) {
          ctx.fillStyle = this.getKeyColor(i, false, settings);
        } else if (this.isPedaled[i] === 1) {
          ctx.fillStyle = this.getKeyColor(i, true, settings);
        } else {
          ctx.fillStyle = "#fff";
        }
        this.roundRect(ctx, x, this.keyAreaY, this.whiteKeyWidth, this.keyAreaHeight, this.radius);
        wIndex++;
      }
    }
  }
  drawBlackKeys(ctx, settings) {
    let wIndex = 0;
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1.5;
    for (let i = 21; i < 109; i++) {
      if (this.isBlack[i % 12] === 0) {
        wIndex++;
      }
      if (this.isBlack[i % 12] > 0) {
        const x = this.border + (wIndex - 1) * (this.whiteKeyWidth + this.whiteKeySpace) + this.isBlack[i % 12];
        if (this.isKeyOn[i] === 1) {
          ctx.fillStyle = this.getKeyColor(i, false, settings);
        } else if (this.isPedaled[i] === 1) {
          ctx.fillStyle = this.getKeyColor(i, true, settings);
        } else {
          ctx.fillStyle = "#000";
        }
        this.roundRect(ctx, x, this.keyAreaY - 1, this.blackKeyWidth, this.blackKeyHeight, this.bRadius);
      }
    }
  }
  drawNoteNames(ctx) {
    const noteNames = ["A", "B", "C", "D", "E", "F", "G"];
    ctx.font = "12px sans-serif";
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let wIndex = 0;
    for (let i = 0; i < 52; i++) {
      const x = this.border + wIndex * (this.whiteKeyWidth + this.whiteKeySpace);
      const y = this.keyAreaY + this.keyAreaHeight - 11;
      ctx.fillText(noteNames[i % 7], x + this.whiteKeyWidth / 2, y);
      wIndex++;
    }
  }
  drawTexts(ctx) {
    if (this.chordDisplay) {
      const pressedKeys = this.getPressedKeys();
      const chords2 = this.detectChords(pressedKeys);
      if (chords2.length === 0) {
        this.chordDisplay.innerHTML = "";
      } else {
        const mainChord = `<span class="pianometer-chord-main">${chords2[0]}</span>`;
        const otherChords = chords2.slice(1).map(
          (c) => `<span class="pianometer-chord-alt">${c}</span>`
        ).join(" ");
        this.chordDisplay.innerHTML = mainChord + (otherChords ? " " + otherChords : "");
      }
    }
  }
  drawMultilineText(ctx, text, x, y) {
    const lines = text.split("\n");
    lines.forEach((line, index4) => {
      ctx.fillText(line, x, y + index4 * 16);
    });
  }
  calculateSessionTime() {
    const elapsed = Date.now() - this.sessionStartTime.getTime();
    const seconds = Math.floor(elapsed / 1e3 % 60);
    const minutes = Math.floor(elapsed / (1e3 * 60) % 60);
    const hours = Math.floor(elapsed / (1e3 * 60 * 60));
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  convertToBars(value) {
    const bars = Math.ceil(value / 12.8);
    return "|".repeat(bars) + ".".repeat(10 - bars);
  }
  getPressedKeys() {
    const noteNames = this.flatNames ? ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"] : ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const pressedKeys = [];
    for (let i = 0; i < 128; i++) {
      if (this.isKeyOn[i] === 1 || this.isPedaled[i] === 1) {
        const noteName = noteNames[i % 12];
        const octave2 = Math.floor(i / 12) - 1;
        pressedKeys.push(`${noteName}${octave2}`);
      }
    }
    return pressedKeys;
  }
  detectChords(notes2) {
    if (notes2.length === 0)
      return [];
    try {
      const detected = dist_exports.detect(notes2, { assumePerfectFifth: true });
      return detected.map((str) => str.replace(/M($|(?=\/))/g, ""));
    } catch (e) {
      return [];
    }
  }
  truncate(str, maxLength) {
    if (str.length <= maxLength)
      return str;
    return str.slice(0, maxLength - 3) + "...";
  }
  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  async onClose() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.activeInputs.forEach((input) => {
      input.onmidimessage = null;
    });
    this.activeInputs.clear();
  }
};
var PianoMeterSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "PianoMeter \u8BBE\u7F6E" });
    new import_obsidian.Setting(containerEl).setName("\u6309\u952E\u989C\u8272").setDesc("\u8BBE\u7F6E\u6309\u4E0B\u7434\u952E\u65F6\u7684\u989C\u8272").addColorPicker((color) => color.setValue(this.plugin.settings.keyColor).onChange(async (value) => {
      this.plugin.settings.keyColor = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("\u5F69\u8679\u6A21\u5F0F").setDesc("\u542F\u7528\u5F69\u8679\u6A21\u5F0F\u540E\uFF0C\u6BCF\u4E2A\u7434\u952E\u4F1A\u6709\u4E0D\u540C\u989C\u8272").addToggle((toggle) => toggle.setValue(this.plugin.settings.rainbowMode).onChange(async (value) => {
      this.plugin.settings.rainbowMode = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("\u663E\u793A\u97F3\u540D").setDesc("\u5728\u767D\u952E\u4E0A\u663E\u793A\u97F3\u540D").addToggle((toggle) => toggle.setValue(this.plugin.settings.displayNoteNames).onChange(async (value) => {
      this.plugin.settings.displayNoteNames = value;
      await this.plugin.saveSettings();
    }));
  }
};
