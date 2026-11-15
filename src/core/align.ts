import type { Lang } from './passages';
import { aksharaDiff, foldWord, tokenize } from './text';

export type WordStatus =
  | 'correct'
  | 'substitution'
  | 'omission'
  | 'not_reached';

export interface WordResult {
  index: number;
  ref: string;
  heard: string | null;
  status: WordStatus;
  /** Aksharas of the printed word the child missed or misread. */
  missed: string[];
}

export interface ExtraResult {
  heard: string;
  /** Position in the reference just before which the extra word was heard. */
  before: number;
  kind: 'insertion' | 'self_correction' | 'repetition';
}

export interface Alignment {
  words: WordResult[];
  extras: ExtraResult[];
}

type Op =
  | { t: 'match'; i: number; j: number }
  | { t: 'sub'; i: number; j: number }
  | { t: 'del'; i: number }
  | { t: 'ins'; j: number }
  | { t: 'merge'; i: number; j: number } // two heard words = one printed word
  | { t: 'split'; i: number; j: number }; // one heard word = two printed words

/**
 * Aligns what the recogniser heard against the printed passage.
 *
 * The recogniser is not told the passage, so mistakes are not hidden by a
 * language model that "expects" the right word. The alignment is a weighted
 * edit distance at word level; substitution cost falls as two words share more
 * aksharas, which keeps near-misses attached to the word the child attempted.
 * ASR often splits or joins words differently from print, so 2-to-1 and 1-to-2
 * joins are free when the concatenation matches exactly.
 */
export function align(passage: string, heardText: string, lang: Lang): Alignment {
  const printed = tokenize(passage, lang);
  const ref = printed.map((w) => foldWord(w, lang));
  const hyp = tokenize(heardText, lang).map((w) => foldWord(w, lang));
  const n = ref.length;
  const m = hyp.length;

  const subCost = (i: number, j: number) => {
    if (ref[i] === hyp[j]) return 0;
    const sim = aksharaDiff(ref[i], hyp[j], lang).similarity;
    return 0.5 + 0.5 * (1 - sim);
  };

  const INF = Number.POSITIVE_INFINITY;
  const cost: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(INF));
  const back: (Op | null)[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(null));
  cost[0][0] = 0;

  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= m; j++) {
      const c = cost[i][j];
      if (c === INF) continue;
      const relax = (ni: number, nj: number, add: number, op: Op) => {
        if (c + add < cost[ni][nj]) {
          cost[ni][nj] = c + add;
          back[ni][nj] = op;
        }
      };
      if (i < n && j < m) {
        const s = subCost(i, j);
        relax(i + 1, j + 1, s, s === 0 ? { t: 'match', i, j } : { t: 'sub', i, j });
      }
      if (i < n) relax(i + 1, j, 1, { t: 'del', i });
      if (j < m) relax(i, j + 1, 1, { t: 'ins', j });
      if (i < n && j + 1 < m && hyp[j] + hyp[j + 1] === ref[i]) relax(i + 1, j + 2, 0, { t: 'merge', i, j });
      if (i + 1 < n && j < m && ref[i] + ref[i + 1] === hyp[j]) relax(i + 2, j + 1, 0, { t: 'split', i, j });
    }
  }

  const ops: Op[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const op = back[i][j];
    if (!op) break;
    ops.push(op);
    switch (op.t) {
      case 'match':
      case 'sub':
        i--; j--; break;
      case 'del': i--; break;
      case 'ins': j--; break;
      case 'merge': i--; j -= 2; break;
      case 'split': i -= 2; j--; break;
    }
  }
  ops.reverse();

  const words: WordResult[] = printed.map((r, index) => ({ index, ref: r, heard: null, status: 'omission', missed: [] }));
  const extras: ExtraResult[] = [];
  let refPos = 0;
  for (const op of ops) {
    switch (op.t) {
      case 'match':
        words[op.i] = { index: op.i, ref: printed[op.i], heard: hyp[op.j], status: 'correct', missed: [] };
        refPos = op.i + 1;
        break;
      case 'sub': {
        // Only a near-miss tells us which akshara was the problem. A completely
        // different word says nothing about any one akshara, so none are blamed.
        const d = aksharaDiff(ref[op.i], hyp[op.j], lang);
        words[op.i] = { index: op.i, ref: printed[op.i], heard: hyp[op.j], status: 'substitution', missed: d.similarity >= 0.5 || letterSimilarity(ref[op.i], hyp[op.j]) >= 0.6 ? d.missed : [] };
        refPos = op.i + 1;
        break;
      }
      case 'merge':
        words[op.i] = { index: op.i, ref: printed[op.i], heard: hyp[op.j] + ' ' + hyp[op.j + 1], status: 'correct', missed: [] };
        refPos = op.i + 1;
        break;
      case 'split':
        words[op.i] = { index: op.i, ref: printed[op.i], heard: hyp[op.j], status: 'correct', missed: [] };
        words[op.i + 1] = { index: op.i + 1, ref: printed[op.i + 1], heard: hyp[op.j], status: 'correct', missed: [] };
        refPos = op.i + 2;
        break;
      case 'del':
        // A skipped word is a word-level error; it is not blamed on any akshara.
        refPos = op.i + 1;
        break;
      case 'ins':
        extras.push({ heard: hyp[op.j], before: refPos, kind: 'insertion' });
        break;
    }
  }

  // Words after the last word the child attempted were not reached (time ran
  // out or the child stopped). They are not errors.
  let last = -1;
  for (const w of words) if (w.status !== 'omission') last = w.index;
  for (const w of words) if (w.index > last) { w.status = 'not_reached'; w.missed = []; }

  // Standard oral-reading conventions: a repeated word or a false start that the
  // child corrects is not an error.
  for (const e of extras) {
    const prev = words[e.before - 1];
    const next = words[e.before];
    if ((prev && prev.status === 'correct' && ref[prev.index] === e.heard) || (next && next.status === 'correct' && ref[next.index] === e.heard)) e.kind = 'repetition';
    else if (next && next.status === 'correct' && (ref[next.index].startsWith(e.heard) || aksharaDiff(ref[next.index], e.heard, lang).similarity >= 0.5)) e.kind = 'self_correction';
  }

  return { words, extras };
}

/** Similarity over code points, ignoring the virama, so a split conjunct (स्कू read as सकू) still counts as a near-miss. */
export function letterSimilarity(a: string, b: string): number {
  const x = [...a.replace(/[\u094D\u0C4D]/g, '')];
  const y = [...b.replace(/[\u094D\u0C4D]/g, '')];
  const prev = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= y.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (x[i - 1] === y[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  const len = Math.max(x.length, y.length);
  return len === 0 ? 1 : 1 - prev[y.length] / len;
}
