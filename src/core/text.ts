import type { Lang } from './passages';

const segmenters = new Map<string, Intl.Segmenter>();
function segmenter(lang: Lang): Intl.Segmenter {
  let s = segmenters.get(lang);
  if (!s) {
    s = new Intl.Segmenter(lang, { granularity: 'grapheme' });
    segmenters.set(lang, s);
  }
  return s;
}

// Punctuation and marks that never count as part of a word.
const PUNCT = /[।॥.,!?;:'"“”‘’()\[\]{}\-–—…/\\|]/g;

// ASR output for Hindi sometimes writes nukta letters as precomposed code points
// and sometimes as base + U+093C. NFC alone does not unify them, so we map the
// precomposed forms to base + nukta before comparing.
const NUKTA_MAP: Record<string, string> = {
  'क़': 'क़', 'ख़': 'ख़', 'ग़': 'ग़',
  'ज़': 'ज़', 'ड़': 'ड़', 'ढ़': 'ढ़',
  'फ़': 'फ़', 'य़': 'य़',
};

export function normalizeWord(word: string, lang: Lang): string {
  let w = word.normalize('NFC').replace(PUNCT, '').trim();
  if (lang === 'hi') {
    w = w.replace(/[क़-य़]/g, (c) => NUKTA_MAP[c] ?? c);
    // Chandrabindu and anusvara are used interchangeably in everyday writing.
    w = w.replace(/ँ/g, 'ं');
  }
  if (lang === 'en') w = w.toLowerCase();
  // Zero-width joiners change rendering only.
  return w.replace(/[‌‍]/g, '');
}

export function tokenize(text: string, lang: Lang): string[] {
  return text
    .normalize('NFC')
    .split(/\s+/)
    .map((t) => normalizeWord(t, lang))
    .filter((t) => t.length > 0);
}

/** Splits a word into aksharas (orthographic syllables). English falls back to letters. */
export function aksharas(word: string, lang: Lang): string[] {
  return Array.from(segmenter(lang).segment(word), (s) => s.segment);
}

/** Levenshtein distance over akshara sequences, with the alignment path. */
export function aksharaDiff(ref: string, hyp: string, lang: Lang) {
  const a = aksharas(ref, lang);
  const b = aksharas(hyp, lang);
  const n = a.length;
  const m = b.length;
  const d: number[][] = Array.from({ length: n + 1 }, (_, i) =>
    Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  // Walk back to find which reference aksharas were missed or misread.
  const missed: string[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) {
      if (a[i - 1] !== b[j - 1]) missed.push(a[i - 1]);
      i--;
      j--;
    } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
      missed.push(a[i - 1]);
      i--;
    } else {
      j--;
    }
  }
  const dist = d[n][m];
  const similarity = n + m === 0 ? 1 : 1 - dist / Math.max(n, m);
  return { distance: dist, similarity, missed: missed.reverse(), refAksharas: a, hypAksharas: b };
}

// Spellings that people (and recognisers) use interchangeably for the same word.
const VARIANTS: Record<Lang, Record<string, string>> = {
  hi: { 'गर्मी': 'गरमी' },
  te: { 'అయ్యింది': 'అయింది', 'వెళ్తుంది': 'వెళుతుంది', 'వెళ్తాడు': 'వెళతాడు' },
  en: { 'ok': 'okay' },
};

/**
 * Folds a normalised word to a comparison key, so that a correct reading written
 * in another accepted spelling is not marked wrong. Used for matching only; the
 * printed word is always what the child sees.
 */
export function foldWord(word: string, lang: Lang): string {
  let w = word;
  if (lang === 'hi') {
    // Nukta on ज़ फ़ ख़ ग़ क़ is often dropped in writing; on ड़ and ढ़ it marks a different sound, so it stays.
    w = w.replace(/([^\u0921\u0922])\u093C/g, '$1');
    // A nasal consonant before a stop of the same place is written either way: ण्ड/ंड, न्द/ंद, म्ब/ंब.
    w = w.replace(/\u0919\u094D(?=[\u0915-\u0918])|\u091E\u094D(?=[\u091A-\u091D])|\u0923\u094D(?=[\u091F-\u0922])|\u0928\u094D(?=[\u0924-\u0927])|\u092E\u094D(?=[\u092A-\u092D])/g, '\u0902');
  }
  if (lang === 'te') {
    w = w.replace(/\u0C33\u0C4D\u0C32/g, '\u0C33\u0C4D\u0C33'); // ళ్ల -> ళ్ళ
    w = w.replace(/\u0C19\u0C4D(?=[\u0C15-\u0C18])|\u0C1E\u0C4D(?=[\u0C1A-\u0C1D])|\u0C23\u0C4D(?=[\u0C1F-\u0C22])|\u0C28\u0C4D(?=[\u0C24-\u0C27])|\u0C2E\u0C4D(?=[\u0C2A-\u0C2D])/g, '\u0C02');
  }
  return VARIANTS[lang][w] ?? w;
}
