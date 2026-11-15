import { describe, it, expect } from 'vitest';
import { PASSAGES, WORD_BANK, getPassage, type Lang, type Level, type Form } from './passages';

const LANGS: Lang[] = ['te', 'hi', 'en'];
const LEVELS: Level[] = ['letter', 'word', 'para', 'story'];
const FORMS: Form[] = ['A', 'B', 'C'];

const count = (s: string) => s.trim().split(/\s+/).length;

// Aksharas: grapheme clusters that contain a letter or mark (spaces and
// punctuation do not count). For English this is the letter count.
function aksharas(s: string, lang: Lang): number {
  const seg = new Intl.Segmenter(lang, { granularity: 'grapheme' });
  return [...seg.segment(s)].filter((g) => /[\p{L}\p{M}]/u.test(g.segment)).length;
}

// Conjuncts: count of the virama (U+0C4D Telugu, U+094D Hindi).
const conjuncts = (s: string) => (s.match(/[్्]/g) ?? []).length;

const sentences = (s: string) => (s.match(/[.!?।]+/g) ?? []).length;

const spread = (xs: number[]) => Math.max(...xs) - Math.min(...xs);

function forms(lang: Lang, level: Level) {
  return FORMS.map((f) => getPassage(lang, level, f).text);
}

describe('passage bank', () => {
  it('has every lang x level x form with a matching id', () => {
    for (const lang of LANGS)
      for (const level of LEVELS)
        for (const form of FORMS) {
          const p = getPassage(lang, level, form);
          expect(p.id).toBe(`${lang}-${level}-${form}`);
        }
    expect(PASSAGES.length).toBe(36);
    expect(new Set(PASSAGES.map((p) => p.id)).size).toBe(36);
  });

  it('letter and word items have exactly 10 tokens', () => {
    for (const p of PASSAGES.filter((x) => x.level === 'letter' || x.level === 'word')) {
      expect(p.text).toBe(p.text.trim());
      expect(p.text.split(' ').length, p.id).toBe(10);
    }
  });

  it('Telugu and Hindi word lists have exactly 2 conjunct words', () => {
    for (const lang of ['te', 'hi'] as Lang[])
      for (const t of forms(lang, 'word')) {
        const withConj = t.split(' ').filter((w) => conjuncts(w) > 0);
        expect(withConj.length, `${lang}: ${t}`).toBe(2);
      }
  });

  it('para and story word counts are in range', () => {
    const range: Record<Lang, Record<'para' | 'story', [number, number]>> = {
      te: { para: [18, 26], story: [45, 55] },
      hi: { para: [30, 40], story: [55, 65] },
      en: { para: [24, 32], story: [60, 70] },
    };
    for (const p of PASSAGES) {
      if (p.level !== 'para' && p.level !== 'story') continue;
      const n = count(p.text);
      const [lo, hi] = range[p.lang][p.level];
      expect(n >= lo && n <= hi, `${p.id}: ${n} not in ${lo}-${hi}`).toBe(true);
    }
  });

  it('Telugu and Hindi paragraphs are conjunct-light (Class 1)', () => {
    for (const t of forms('te', 'para')) expect(conjuncts(t), t).toBeLessThanOrEqual(4);
    for (const t of forms('hi', 'para')) {
      expect(conjuncts(t), t).toBeGreaterThanOrEqual(1);
      expect(conjuncts(t), t).toBeLessThanOrEqual(3);
    }
  });

  describe('forms are equated within each language and level', () => {
    for (const lang of LANGS)
      for (const level of LEVELS) {
        it(`${lang}-${level}`, () => {
          const ts = forms(lang, level);
          const ak = ts.map((t) => aksharas(t, lang));
          expect(Math.max(...ak) / Math.min(...ak), `aksharas ${ak}`).toBeLessThanOrEqual(1.05);
          const cj = ts.map(conjuncts);
          expect(spread(cj), `conjuncts ${cj}`).toBeLessThanOrEqual(1);
          const wc = ts.map(count);
          expect(spread(wc), `words ${wc}`).toBeLessThanOrEqual(2);
          const sc = ts.map(sentences);
          expect(spread(sc), `sentences ${sc}`).toBe(0);
        });
      }
  });

  it('stories have 2 questions with 2 to 4 accepted answers in the same script', () => {
    const script: Record<Lang, RegExp> = { te: /[ఀ-౿]/, hi: /[ऀ-ॿ]/, en: /[A-Za-z]/ };
    for (const p of PASSAGES.filter((x) => x.level === 'story')) {
      expect(p.questions?.length, p.id).toBe(2);
      for (const q of p.questions!) {
        expect(script[p.lang].test(q.q), `${p.id}: ${q.q}`).toBe(true);
        expect(q.accept.length >= 2 && q.accept.length <= 4, `${p.id}: ${q.q}`).toBe(true);
        expect(q.accept.some((a) => script[p.lang].test(a)), `${p.id}: ${q.q}`).toBe(true);
      }
    }
  });

  it('word bank has at least 200 unique words per language', () => {
    for (const lang of LANGS) {
      const list = WORD_BANK[lang];
      expect(new Set(list).size).toBe(list.length);
      expect(list.length).toBeGreaterThanOrEqual(200);
    }
  });

  it('word bank leaves out hard-to-decode words and keeps common inflected forms', () => {
    for (const w of ['దక్షిణం', 'గుడ్లగూబ', 'స్నేహితుడు', 'బడిపంతులు']) expect(WORD_BANK.te).not.toContain(w);
    for (const w of ['ఇంట్లో', 'బడికి', 'ఆవుకు']) expect(WORD_BANK.te).toContain(w);
  });

  it('uses one spelling for ళ్ళ in Telugu', () => {
    const all = PASSAGES.filter((p) => p.lang === 'te').map((p) => p.text).join(' ') + WORD_BANK.te.join(' ');
    expect(all.includes('ళ్ల')).toBe(false);
  });
});
