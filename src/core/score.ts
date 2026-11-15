import type { Lang, Level } from './passages';
import { align, type Alignment } from './align';
import { aksharas } from './text';

export interface ReadingScore {
  lang: Lang;
  level: Level;
  alignment: Alignment;
  totalWords: number;
  attempted: number;
  correct: number;
  errors: number;
  accuracy: number; // 0..1, over words attempted
  speechSeconds: number;
  /** Correct items per minute: words for a paragraph, story or word list; letters for the letter list. */
  wcpm: number | null;
  passed: boolean;
  /** Reasons a person should listen before this score is used. Empty means the score can stand. */
  review: string[];
  /** Akshara -> number of times missed in this reading. Drives the practice plan. */
  missedAksharas: Record<string, number>;
  /** Akshara -> times it appeared in words the child attempted. Misses are judged against this, not raw counts. */
  exposedAksharas: Record<string, number>;
}

/**
 * Pass rules follow the ASER reading tool: a child "can read" letters or words
 * when at least 4 of 5 are read correctly (we use 8 of 10), and a paragraph or
 * story when it is read through with no more than 3 mistakes.
 */
export function passRule(level: Level, a: { correct: number; errors: number; attempted: number; totalWords: number }): boolean {
  if (level === 'letter' || level === 'word') return a.correct >= 8;
  // Words left unread count as mistakes here, so stopping early is not a pass.
  return a.errors + (a.totalWords - a.attempted) <= 3;
}

export function scoreReading(opts: {
  lang: Lang;
  level: Level;
  passage: string;
  heard: string;
  speechSeconds: number;
  /** Above this many correct words a minute the reading is flagged. Children rarely pass 180; adults on the try page can. */
  maxRate?: number;
}): ReadingScore {
  const alignment = align(opts.passage, opts.heard, opts.lang);
  const { words, extras } = alignment;
  const totalWords = words.length;
  const attemptedWords = words.filter((w) => w.status !== 'not_reached');
  const attempted = attemptedWords.length;
  const correct = words.filter((w) => w.status === 'correct').length;
  const errors = attemptedWords.filter((w) => w.status === 'substitution' || w.status === 'omission').length;
  const accuracy = attempted === 0 ? 0 : correct / attempted;
  const connected = opts.level === 'para' || opts.level === 'story';
  const secs = Math.max(0, opts.speechSeconds);
  const wcpm = secs >= 3 ? Math.round((correct / secs) * 60) : null;

  const missedAksharas: Record<string, number> = {};
  for (const w of words) for (const ak of w.missed) missedAksharas[ak] = (missedAksharas[ak] ?? 0) + 1;
  const exposedAksharas: Record<string, number> = {};
  for (const w of attemptedWords) for (const ak of aksharas(w.ref, opts.lang)) exposedAksharas[ak] = (exposedAksharas[ak] ?? 0) + 1;

  const review: string[] = [];
  const heardCount = opts.heard.trim() ? opts.heard.trim().split(/\s+/).length : 0;
  if (heardCount === 0) review.push('no_speech');
  if (wcpm !== null && connected && wcpm > (opts.maxRate ?? 180)) review.push('too_fast');
  if (connected && secs > 0 && secs < 2) review.push('too_short');
  const insertions = extras.filter((e) => e.kind === 'insertion').length;
  if (heardCount > 0 && insertions > Math.max(3, totalWords * 0.3)) review.push('off_text');
  if (attempted > 0 && correct === 0 && heardCount > 3) review.push('off_text');

  const passed = review.length === 0 && passRule(opts.level, { correct, errors, attempted, totalWords });

  return {
    lang: opts.lang,
    level: opts.level,
    alignment,
    totalWords,
    attempted,
    correct,
    errors,
    accuracy,
    speechSeconds: secs,
    wcpm,
    passed,
    review: [...new Set(review)],
    missedAksharas,
    exposedAksharas,
  };
}

export type AserLevel = 'beginner' | 'letter' | 'word' | 'para' | 'story';

/**
 * ASER-style adaptive flow. Start at the paragraph. Pass it and try the story;
 * fail it and step down to words, then letters.
 * Returns the next level to test, or the final level reached.
 */
export function nextStep(tested: Level, passed: boolean): { next: Level } | { final: AserLevel } {
  switch (tested) {
    case 'para':
      return passed ? { next: 'story' } : { next: 'word' };
    case 'story':
      return { final: passed ? 'story' : 'para' };
    case 'word':
      return passed ? { final: 'word' } : { next: 'letter' };
    case 'letter':
      return { final: passed ? 'letter' : 'beginner' };
  }
}

/** NIPUN Bharat oral reading fluency targets (words correct per minute). */
export function nipunTarget(grade: number): { min: number; max: number | null } | null {
  if (grade === 2) return { min: 45, max: 60 };
  if (grade >= 3) return { min: 60, max: null };
  return null;
}
