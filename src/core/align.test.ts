import { describe, expect, it } from 'vitest';
import { align } from './align';
import { scoreReading, nextStep, nipunTarget, passRule } from './score';
import { normalizeWord, aksharas } from './text';

const statuses = (p: string, h: string, lang: 'te' | 'hi' | 'en') =>
  align(p, h, lang).words.map((w) => w.status);

describe('normalisation', () => {
  it('unifies precomposed and decomposed nukta in Hindi', () => {
    expect(normalizeWord('पढ़ा', 'hi')).toBe(normalizeWord('पढ़ा', 'hi'));
  });
  it('strips danda and punctuation', () => {
    expect(normalizeWord('घर।', 'hi')).toBe('घर');
    expect(normalizeWord('"Dog,"', 'en')).toBe('dog');
  });
  it('keeps Telugu conjuncts as one akshara', () => {
    expect(aksharas('పిల్లలు', 'te')).toEqual(['పి', 'ల్ల', 'లు']);
  });
});

describe('alignment', () => {
  it('marks a perfect reading correct', () => {
    expect(statuses('the cat sat on the mat', 'the cat sat on the mat', 'en')).toEqual(Array(6).fill('correct'));
  });

  it('finds a substitution and keeps later words aligned', () => {
    expect(statuses('the cat sat on the mat', 'the cap sat on the mat', 'en')).toEqual([
      'correct', 'substitution', 'correct', 'correct', 'correct', 'correct',
    ]);
  });

  it('finds an omission in the middle', () => {
    expect(statuses('the cat sat on the mat', 'the cat on the mat', 'en')).toEqual([
      'correct', 'correct', 'omission', 'correct', 'correct', 'correct',
    ]);
  });

  it('treats words after the child stopped as not reached, not errors', () => {
    expect(statuses('the cat sat on the mat', 'the cat sat', 'en')).toEqual([
      'correct', 'correct', 'correct', 'not_reached', 'not_reached', 'not_reached',
    ]);
  });

  it('accepts ASR splitting one printed word into two', () => {
    const a = align('ఒకరోజు అమ్మ వచ్చింది', 'ఒక రోజు అమ్మ వచ్చింది', 'te');
    expect(a.words.map((w) => w.status)).toEqual(['correct', 'correct', 'correct']);
    expect(a.extras).toEqual([]);
  });

  it('accepts ASR joining two printed words', () => {
    expect(statuses('ఒక రోజు అమ్మ', 'ఒకరోజు అమ్మ', 'te')).toEqual(['correct', 'correct', 'correct']);
  });

  it('reports the exact Telugu akshara misread', () => {
    const a = align('పిల్లలు బడికి వెళ్లారు', 'పిలలు బడికి వెళ్లారు', 'te');
    expect(a.words[0].status).toBe('substitution');
    expect(a.words[0].missed).toEqual(['ల్ల']);
  });

  it('reports the Hindi conjunct the child missed', () => {
    const a = align('बच्चे स्कूल जाते हैं', 'बच्चे सकूल जाते हैं', 'hi');
    expect(a.words[1].status).toBe('substitution');
    expect(a.words[1].missed).toContain('स्कू');
  });

  it('keeps ड़ and ढ़ distinct from ड and ढ', () => {
    expect(statuses('सड़क', 'सडक', 'hi')).toEqual(['substitution']);
    expect(statuses('पढ़', 'पढ', 'hi')).toEqual(['substitution']);
  });

  it('accepts common spelling variants as correct', () => {
    expect(statuses('सफ़ेद गाय', 'सफेद गाय', 'hi')).toEqual(['correct', 'correct']);
    expect(statuses('ठंडा पानी', 'ठण्डा पानी', 'hi')).toEqual(['correct', 'correct']);
    expect(statuses('గరమి నీళ్ళు', 'గరమి నీళ్లు', 'te')).toEqual(['correct', 'correct']);
    expect(statuses('बहुत गरमी है', 'बहुत गर्मी है', 'hi')).toEqual(['correct', 'correct', 'correct']);
  });

  it('blames no akshara for a skipped word or an unrelated word', () => {
    const a = align('the cat sat on the mat', 'the dog on the mat', 'en');
    expect(a.words.map((w) => w.status).filter((x) => x !== 'correct').sort()).toEqual(['omission', 'substitution']);
    expect(a.words.every((w) => w.missed.length === 0)).toBe(true);
  });

  it('does not count a repetition as an error', () => {
    const a = align('the cat sat on the mat', 'the cat cat sat on the mat', 'en');
    expect(a.words.every((w) => w.status === 'correct')).toBe(true);
    expect(a.extras[0].kind).toBe('repetition');
  });

  it('does not count a self-correction as an error', () => {
    const a = align('the big dog ran home', 'the big do dog ran home', 'en');
    expect(a.words.every((w) => w.status === 'correct')).toBe(true);
    expect(a.extras[0].kind).toBe('self_correction');
  });

  it('keeps an unrelated extra word as an insertion', () => {
    const a = align('the dog ran home', 'the dog ran fast home', 'en');
    expect(a.extras[0].kind).toBe('insertion');
  });
});

describe('scoring', () => {
  const story = 'one two three four five six seven eight nine ten';

  it('computes words correct per minute from speech time', () => {
    const s = scoreReading({ lang: 'en', level: 'story', passage: story, heard: story, speechSeconds: 10 });
    expect(s.correct).toBe(10);
    expect(s.wcpm).toBe(60);
    expect(s.accuracy).toBe(1);
  });

  it('flags silence for a person to review instead of scoring zero', () => {
    const s = scoreReading({ lang: 'en', level: 'para', passage: story, heard: '', speechSeconds: 8 });
    expect(s.review).toContain('no_speech');
    expect(s.passed).toBe(false);
  });

  it('flags reading that has nothing to do with the passage', () => {
    const s = scoreReading({ lang: 'en', level: 'para', passage: story, heard: 'hello my name is ravi and i like mangoes', speechSeconds: 6 });
    expect(s.review).toContain('off_text');
  });

  it('applies the ASER pass rules', () => {
    expect(passRule('word', { correct: 8, errors: 2, attempted: 10, totalWords: 10 })).toBe(true);
    expect(passRule('word', { correct: 7, errors: 3, attempted: 10, totalWords: 10 })).toBe(false);
    expect(passRule('para', { correct: 27, errors: 3, attempted: 30, totalWords: 30 })).toBe(true);
    expect(passRule('para', { correct: 26, errors: 4, attempted: 30, totalWords: 30 })).toBe(false);
    expect(passRule('para', { correct: 15, errors: 0, attempted: 15, totalWords: 30 })).toBe(false);
    expect(passRule('para', { correct: 26, errors: 0, attempted: 26, totalWords: 30 })).toBe(false);
  });

  it('follows the ASER adaptive order', () => {
    expect(nextStep('para', true)).toEqual({ next: 'story' });
    expect(nextStep('para', false)).toEqual({ next: 'word' });
    expect(nextStep('story', false)).toEqual({ final: 'para' });
    expect(nextStep('word', false)).toEqual({ next: 'letter' });
    expect(nextStep('letter', false)).toEqual({ final: 'beginner' });
  });

  it('uses NIPUN targets for classes 2 and 3', () => {
    expect(nipunTarget(2)).toEqual({ min: 45, max: 60 });
    expect(nipunTarget(3)).toEqual({ min: 60, max: null });
    expect(nipunTarget(1)).toBeNull();
  });
});
