import type { Lang, Level } from './passages';
import { aksharas, tokenize } from './text';

export interface PracticeTargets {
  aksharas: string[];
  words: string[];
}

export interface ReadingTrace {
  missed: Record<string, number>;
  exposed?: Record<string, number>;
}

/**
 * Picks what tomorrow's practice should work on: the aksharas this child gets
 * wrong most often relative to how often they met them, and familiar words that
 * contain them. Raw miss counts would just pick the commonest letters, so we use
 * a miss rate, with at least two encounters before an akshara can be chosen.
 * Pure code, no model involved, so a teacher can check every choice.
 */
export function pickTargets(history: ReadingTrace[], lang: Lang, wordBank: string[], max = 3): PracticeTargets {
  const miss = new Map<string, number>();
  const seen = new Map<string, number>();
  history.forEach((h, idx) => {
    const weight = 1 + idx / Math.max(1, history.length); // recent readings count more
    for (const [ak, n] of Object.entries(h.missed)) miss.set(ak, (miss.get(ak) ?? 0) + n * weight);
    const exposed = h.exposed ?? h.missed;
    for (const [ak, n] of Object.entries(exposed)) seen.set(ak, (seen.get(ak) ?? 0) + n * weight);
  });
  const ranked = [...miss.entries()]
    .map(([ak, m]) => ({ ak, m, rate: m / Math.max(m, seen.get(ak) ?? m) }))
    .filter((x) => (seen.get(x.ak) ?? 0) >= 2 || x.m >= 2)
    .sort((a, b) => b.rate - a.rate || b.m - a.m)
    .map((x) => x.ak);
  const targets = ranked.slice(0, max);

  const words: string[] = [];
  for (const w of wordBank) {
    const aks = aksharas(w, lang);
    if (targets.some((t) => aks.includes(t)) && !words.includes(w)) words.push(w);
  }
  words.sort((a, b) => aksharas(a, lang).length - aksharas(b, lang).length);
  return { aksharas: targets, words: words.slice(0, 8) };
}

export interface PlanStep {
  kind: 'listen' | 'echo' | 'sounds' | 'build' | 'words' | 'repeat' | 'talk';
  minutes: number;
  text?: string;
  items?: string[];
}

export type PlanLevel = 'beginner' | 'letter' | 'word' | 'para' | 'story';

/**
 * Practice follows the child's level, the way Teaching at the Right Level does:
 * beginners and letter readers work on aksharas and building words, word readers
 * on reading words and short phrases, and only paragraph readers do repeated
 * reading of connected text.
 */
export function buildPlan(opts: {
  level: PlanLevel;
  targets: PracticeTargets;
  practiceText?: string;
  starterAksharas?: string[];
  starterWords?: string[];
  question?: string;
}): PlanStep[] {
  const { targets } = opts;
  const aks = targets.aksharas.length ? targets.aksharas : (opts.starterAksharas ?? []).slice(0, 4);
  const words = targets.words.length ? targets.words : (opts.starterWords ?? []).slice(0, 6);
  if (opts.level === 'beginner' || opts.level === 'letter') {
    return [
      { kind: 'sounds', minutes: 3, items: aks },
      { kind: 'build', minutes: 4, items: words.slice(0, 4) },
      { kind: 'words', minutes: 3, items: words.slice(0, 6) },
    ];
  }
  if (opts.level === 'word') {
    const steps: PlanStep[] = [];
    if (aks.length) steps.push({ kind: 'sounds', minutes: 2, items: aks });
    steps.push({ kind: 'words', minutes: 4, items: words });
    if (opts.practiceText) steps.push({ kind: 'echo', minutes: 4, text: opts.practiceText });
    return steps;
  }
  const text = opts.practiceText ?? '';
  const steps: PlanStep[] = [
    { kind: 'listen', minutes: 1, text },
    { kind: 'echo', minutes: 2, text },
  ];
  if (aks.length) steps.push({ kind: 'sounds', minutes: 1, items: aks });
  if (words.length) steps.push({ kind: 'words', minutes: 2, items: words });
  steps.push({ kind: 'repeat', minutes: 3, text });
  if (opts.question) steps.push({ kind: 'talk', minutes: 1, text: opts.question });
  return steps;
}

const SCRIPT: Record<Lang, RegExp> = {
  te: /^[ఀ-౿]+$/,
  hi: /^[ऀ-ॿ]+$/,
  en: /^[a-z]+$/,
};

const LENGTH: Record<Level, [number, number]> = {
  letter: [20, 40],
  word: [8, 18],
  para: [20, 40],
  story: [25, 60],
};

export interface Check {
  ok: boolean;
  problems: string[];
  coverage: number;
  targetHits: number;
}

/**
 * Checks a practice text before any child sees it. The model only drafts; this
 * function decides. The text must be in the right script, the right length,
 * made mostly of words the child already meets in school passages, and it must
 * actually practise the target aksharas.
 */
export function checkPracticeText(text: string, lang: Lang, level: Level, targets: PracticeTargets, knownWords: Set<string>, testWords: Set<string> = new Set()): Check {
  const problems: string[] = [];
  const tokens = tokenize(text, lang);
  const fromTest = [...new Set(tokens.filter((t) => testWords.has(t)))];
  if (fromTest.length) problems.push(`uses words from the check passages: ${fromTest.slice(0, 4).join(' ')}`);
  const [lo, hi] = LENGTH[level];
  if (tokens.length < lo || tokens.length > hi) problems.push(`length ${tokens.length} not in ${lo}-${hi}`);
  const wrongScript = tokens.filter((t) => !SCRIPT[lang].test(t));
  if (wrongScript.length) problems.push(`wrong script: ${wrongScript.slice(0, 3).join(' ')}`);
  const known = tokens.filter((t) => knownWords.has(t) || targets.words.includes(t)).length;
  const coverage = tokens.length ? known / tokens.length : 0;
  // Telugu words carry their endings, so fewer exact matches are expected.
  const minCoverage = lang === 'te' ? 0.7 : 0.8;
  if (coverage < minCoverage) problems.push(`only ${Math.round(coverage * 100)}% familiar words`);
  let targetHits = 0;
  for (const t of tokens) if (targets.aksharas.some((ak) => aksharas(t, lang).includes(ak))) targetHits++;
  if (targets.aksharas.length && targetHits < 4) problems.push(`target aksharas used only ${targetHits} times`);
  return { ok: problems.length === 0, problems, coverage, targetHits };
}
