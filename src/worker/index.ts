import { Hono } from 'hono';
import { getPassage, PASSAGES, WORD_BANK, type Form, type Lang, type Level } from '../core/passages';
import { scoreReading, nextStep } from '../core/score';
import { pickTargets, buildPlan, checkPracticeText, type PlanLevel, type ReadingTrace } from '../core/practice';
import { normalizeWord, tokenize } from '../core/text';
import { transcribe, speak, speechReady, type SpeechEnv } from './speech';
import { draftPrompt, draftText, modelReady, type LlmEnv } from './llm';
import { computeImpact } from './impact';

export interface Env extends LlmEnv, SpeechEnv {
  DB: D1Database;
  ASSETS: Fetcher;
  KEEP_AUDIO_RATE?: string; // share of readings kept for the blind teacher check, default 0.2
  MIN_GAP_DAYS?: string; // days between first and second check, default 7
  LIMITER?: { limit: (o: { key: string }) => Promise<{ success: boolean }> };
}

const app = new Hono<{ Bindings: Env }>();
const LANGS: Lang[] = ['te', 'hi', 'en'];

/** Short words every text needs. They never count as rehearsing a check passage. */
const FUNCTION_WORDS: Record<Lang, string[]> = {
  en: ['a', 'an', 'the', 'and', 'but', 'or', 'in', 'on', 'at', 'to', 'of', 'with', 'for', 'from', 'up', 'is', 'are', 'was', 'were', 'be', 'it', 'he', 'she', 'we', 'they', 'i', 'you', 'his', 'her', 'their', 'our', 'my', 'has', 'have', 'had', 'do', 'did', 'not', 'no', 'yes', 'this', 'that', 'there', 'then', 'very', 'all', 'too', 'so', 'run', 'sun', 'play', 'happy', 'big', 'little', 'day', 'go', 'went'],
  hi: ['और', 'है', 'हैं', 'था', 'थी', 'थे', 'में', 'से', 'को', 'का', 'की', 'के', 'पर', 'ने', 'भी', 'तो', 'वह', 'वे', 'यह', 'हम', 'मैं', 'एक', 'बहुत', 'नहीं', 'जाता', 'जाती', 'गया', 'गई', 'रहा', 'रही', 'साथ'],
  te: ['ఒక', 'మరియు', 'కూడా', 'చాలా', 'లో', 'ఉంది', 'ఉన్నాడు', 'ఉన్నారు', 'వచ్చింది', 'వెళ్ళింది', 'అతను', 'ఆమె', 'వాళ్ళు', 'మేము', 'నేను', 'అది', 'ఇది', 'కాదు', 'లేదు', 'రోజూ', 'అక్కడ', 'ఇక్కడ'],
};
const LEVELS: Level[] = ['letter', 'word', 'para', 'story'];
const now = () => Date.now();
const DAY = 86_400_000;

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function classCode(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join('');
}

async function teacherClass(env: Env, code: string, pin: string | undefined) {
  const row = await env.DB.prepare('SELECT * FROM classes WHERE code = ?').bind(code.toUpperCase()).first<Record<string, unknown>>();
  if (!row || !pin) return null;
  return (await sha256(`${row.id}:${pin}`)) === row.pin_hash ? row : null;
}

/** A child's data can only be read or written by someone holding that class's PIN. */
async function childWithPin(env: Env, childId: string, pin: string | undefined) {
  if (!pin) return null;
  const row = await env.DB.prepare('SELECT ch.*, cl.pin_hash, cl.is_demo FROM children ch JOIN classes cl ON cl.id = ch.class_id WHERE ch.id = ?')
    .bind(childId).first<Record<string, unknown>>();
  if (!row) return null;
  return (await sha256(`${row.class_id}:${pin}`)) === row.pin_hash ? row : null;
}

const asLang = (v: unknown): Lang | null => (LANGS.includes(v as Lang) ? (v as Lang) : null);
const asLevel = (v: unknown): Level | null => (LEVELS.includes(v as Level) ? (v as Level) : null);

// Guessing PINs or flooding the speech service is slowed per client address.
app.use('/api/*', async (c, next) => {
  if (c.req.method !== 'GET' && c.env.LIMITER) {
    const ip = c.req.header('cf-connecting-ip') ?? 'local';
    const { success } = await c.env.LIMITER.limit({ key: ip });
    if (!success) return c.json({ error: 'Too many tries. Wait a minute and try again.' }, 429);
  }
  await next();
});

app.get('/api/health', (c) => c.json({ ok: true, speech: speechReady(c.env), model: modelReady(c.env) }));

app.get('/api/passage', (c) => {
  const lang = asLang(c.req.query('lang'));
  const level = asLevel(c.req.query('level'));
  const form = (c.req.query('form') ?? 'C') as Form;
  if (!lang || !level || !['A', 'B', 'C'].includes(form)) return c.json({ error: 'bad request' }, 400);
  return c.json(getPassage(lang, level, form));
});

// A teacher sets up a class. The PIN is shown once and never stored in plain text.
app.post('/api/class', async (c) => {
  const b = await c.req.json<{ name?: string; lang?: string; pin?: string }>();
  const lang = asLang(b.lang);
  if (!b.name || !lang || !b.pin || !/^\d{4,8}$/.test(b.pin)) return c.json({ error: 'name, language and a 4-8 digit PIN are needed' }, 400);
  const id = crypto.randomUUID();
  const code = classCode();
  await c.env.DB.prepare('INSERT INTO classes (id, code, name, lang, pin_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, code, b.name.slice(0, 80), lang, await sha256(`${id}:${b.pin}`), now()).run();
  return c.json({ code });
});

app.post('/api/class/:code/child', async (c) => {
  const cls = await teacherClass(c.env, c.req.param('code'), c.req.header('x-pin'));
  if (!cls) return c.json({ error: 'wrong class code or PIN' }, 403);
  if (cls.is_demo) return c.json({ error: 'The demo class is read-only.' }, 403);
  const b = await c.req.json<{ nickname?: string; grade?: number; lang?: string; consent?: boolean; keepAudio?: boolean; witness?: string }>();
  const lang = asLang(b.lang) ?? (cls.lang as Lang);
  if (!b.nickname || !b.grade || b.grade < 1 || b.grade > 5) return c.json({ error: 'nickname and class 1-5 are needed' }, 400);
  if (!b.consent || !b.witness?.trim()) return c.json({ error: 'a signed parent consent form, and the name of the adult who collected it, are needed first' }, 400);
  // Permuted blocks of 4 within each class and grade: every block of four children holds two of each group
  // in a random order, so the next assignment can't be guessed from the counts. Form order is then
  // balanced within each group and grade.
  const same = (await c.env.DB.prepare('SELECT arm, form_order FROM children WHERE class_id = ? AND grade = ? ORDER BY created_at').bind(cls.id, b.grade).all<{ arm: string; form_order: string }>()).results;
  const block = Math.floor(same.length / 4);
  const seed = await sha256(`${cls.id}:${b.grade}:${block}:${cls.pin_hash}`);
  const order = ['practice', 'practice', 'waitlist', 'waitlist']
    .map((a, i) => ({ a, k: parseInt(seed.slice(i * 8, i * 8 + 8), 16) }))
    .sort((x, y) => x.k - y.k)
    .map((x) => x.a);
  const arm = order[same.length % 4];
  const inArm = same.filter((r) => r.arm === arm);
  const ab = inArm.filter((r) => r.form_order === 'AB').length;
  const ba = inArm.length - ab;
  const formOrder = ab < ba ? 'AB' : ba < ab ? 'BA' : parseInt(seed.slice(32, 40), 16) % 2 ? 'AB' : 'BA';
  const id = crypto.randomUUID();
  await c.env.DB.prepare('INSERT INTO children (id, class_id, nickname, grade, lang, consent_at, consent_keep_audio, consent_version, consent_witness, arm, form_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, cls.id, b.nickname.slice(0, 40), b.grade, lang, now(), b.keepAudio ? 1 : 0, 'v1', b.witness.trim().slice(0, 60), arm, formOrder, now()).run();
  return c.json({ id, arm });
});

app.get('/api/class/:code', async (c) => {
  const cls = await teacherClass(c.env, c.req.param('code'), c.req.header('x-pin'));
  if (!cls) return c.json({ error: 'wrong class code or PIN' }, 403);
  const kids = await c.env.DB.prepare('SELECT id, nickname, grade, lang, consent_keep_audio, arm, form_order FROM children WHERE class_id = ? ORDER BY nickname').bind(cls.id).all();
  const sess = await c.env.DB.prepare('SELECT child_id, kind, level, wcpm, passed, final_level, missed, review, created_at FROM sessions WHERE class_id = ? ORDER BY created_at').bind(cls.id).all();
  const pending = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM audio a JOIN sessions s ON s.id = a.session_id WHERE s.class_id = ?').bind(cls.id).first<{ n: number }>();
  return c.json({ name: cls.name, lang: cls.lang, code: cls.code, demo: !!cls.is_demo, minGapDays: Number(c.env.MIN_GAP_DAYS ?? '7'), children: kids.results, sessions: sess.results, toCheck: pending?.n ?? 0 });
});

/**
 * Study rules, enforced on the server so the public numbers can't drift:
 * one first check, one second check at least MIN_GAP_DAYS later, and no practice
 * for the waitlist group until their second check is done.
 */
async function checkRules(env: Env, child: Record<string, unknown>, kind: string, level: Level): Promise<string | null> {
  const rows = (await env.DB.prepare('SELECT kind, level, passed, review, final_level, created_at FROM sessions WHERE child_id = ? ORDER BY created_at').bind(child.id).all<{ kind: string; level: string; passed: number; review: string; final_level: string | null; created_at: number }>()).results;
  const ofKind = (k: string) => rows.filter((r) => r.kind === k);
  const preDone = ofKind('pre').find((r) => r.final_level);
  const postDone = ofKind('post').find((r) => r.final_level);
  const gap = Number(env.MIN_GAP_DAYS ?? '7') * DAY;
  const LADDER_WINDOW = 3 * 60 * 60 * 1000;
  if (kind === 'pre' || kind === 'post') {
    const runs = ofKind(kind);
    if (kind === 'pre' && preDone) return 'This child already has a first check.';
    if (kind === 'post') {
      if (!preDone) return 'Do the first check before the second.';
      if (postDone) return 'This child already has a second check.';
      const firstPre = ofKind('pre')[0];
      if (now() - firstPre.created_at < gap) {
        const days = Math.ceil((firstPre.created_at + gap - now()) / DAY);
        return `The second check opens in ${days} day${days === 1 ? '' : 's'}.`;
      }
    }
    // One ladder per check: a child never sees the same test passage on another day.
    if (runs.length && now() - runs[0].created_at > LADDER_WINDOW) return 'This check was started earlier and is waiting for a person to listen. Set the level from the class page.';
    // The server, not the browser, decides which level comes next.
    const last = runs[runs.length - 1];
    let expected: string = 'para';
    if (last) {
      const flagged = last.review !== '[]';
      if (flagged) expected = last.level;
      else {
        const nx = nextStep(last.level as Level, !!last.passed);
        if ('final' in nx) return 'This check is finished.';
        expected = nx.next;
      }
    }
    if (level !== expected) return `This check continues at the ${expected} level.`;
  }
  if (kind === 'practice') {
    if (!preDone) return 'Do the first check before practice.';
    if (child.arm === 'waitlist' && !postDone) return 'This child is in the comparison group. Practice starts after the second check.';
  }
  return null;
}

// One reading: audio in, word-by-word result out.
app.post('/api/read', async (c) => {
  if (!speechReady(c.env)) return c.json({ error: 'speech service not configured' }, 503);
  const form = await c.req.formData();
  const audio = form.get('audio');
  const lang = asLang(form.get('lang'));
  const level = asLevel(form.get('level'));
  const kind = String(form.get('kind') ?? 'try');
  const speechSeconds = Number(form.get('speechSeconds') ?? 0);
  const childId = form.get('childId') ? String(form.get('childId')) : null;
  if (!(audio instanceof File) || !lang || !level || !['pre', 'post', 'practice', 'try'].includes(kind)) return c.json({ error: 'bad request' }, 400);
  if (audio.size > 2_000_000) return c.json({ error: 'recording too long' }, 413);


  let child: Record<string, unknown> | null = null;
  if (childId) {
    child = await childWithPin(c.env, childId, c.req.header('x-pin'));
    if (!child) return c.json({ error: 'wrong class PIN for this child' }, 403);
    if (child.is_demo) return c.json({ error: 'The demo class is read-only.' }, 403);
    const rule = await checkRules(c.env, child, kind, level);
    if (rule) return c.json({ error: rule }, 409);
  } else if (kind !== 'try') {
    return c.json({ error: 'checks and practice belong to a child' }, 400);
  }
  // Counterbalanced: half the children read form A first and B second, the other half the reverse,
  // so a difference in difficulty between the forms cannot pass for progress.
  const order = String(child?.form_order ?? 'AB');
  const passageForm: Form = kind === 'pre' ? (order[0] as Form) : kind === 'post' ? (order[1] as Form) : 'C';
  const passage = getPassage(lang, level, passageForm);
  const runner = String(form.get('runner') ?? '').slice(0, 60);

  let heard: string;
  let seconds = speechSeconds;
  try {
    const h = await transcribe(c.env, audio, lang);
    heard = h.text;
    // Word timestamps from the recogniser are more exact than the browser's energy-based trim.
    if (h.speechSeconds && h.speechSeconds > 0.5) seconds = h.speechSeconds;
  } catch (e) {
    return c.json({ error: 'We could not hear that recording. Please try again.', detail: String(e) }, 502);
  }
  const score = scoreReading({ lang, level, passage: passage.text, heard, speechSeconds: seconds, maxRate: kind === 'try' ? 280 : 180 });
  // A flagged reading never moves the child up or down the ladder. One re-record
  // is allowed; after that the reading waits for a person to listen.
  let step: ReturnType<typeof nextStep> | { retry: true; attemptsLeft: number } | { review: true } = nextStep(level, score.passed);
  if (score.review.length > 0) {
    const recentFlagged = childId
      ? (await c.env.DB.prepare("SELECT COUNT(*) AS n FROM sessions WHERE child_id = ? AND kind = ? AND level = ? AND review != '[]' AND created_at > ?").bind(childId, kind, level, now() - 3 * 60 * 60 * 1000).first<{ n: number }>())?.n ?? 0
      : 0;
    if (recentFlagged < 1) step = { retry: true, attemptsLeft: 1 };
    // Silence on the letter list twice is itself the answer: as in ASER, the child is a beginner.
    else if (level === 'letter' && (kind === 'pre' || kind === 'post') && score.review.every((r) => r === 'no_speech')) step = { final: 'beginner' };
    else step = { review: true };
  }

  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO sessions (id, child_id, class_id, kind, lang, level, form, passage_id, heard, speech_seconds, correct, attempted, total_words, wcpm, passed, review, words, missed, exposed, final_level, runner, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    // Readings on the public try page may come from anyone, so their words are never stored, only the counts.
    id, childId, child?.class_id ?? null, kind, lang, level, passageForm, passage.id, kind === 'try' ? '' : heard, score.speechSeconds,
    score.correct, score.attempted, score.totalWords, score.wcpm, score.passed ? 1 : 0,
    JSON.stringify(score.review), kind === 'try' ? '[]' : JSON.stringify(score.alignment.words), JSON.stringify(score.missedAksharas), JSON.stringify(score.exposedAksharas),
    'final' in step && (kind === 'pre' || kind === 'post') ? step.final : null, runner, now(),
  ).run();

  // Keep a share of recordings (and every unclear one) for a teacher to score blind,
  // only where the parent agreed. Everything else is discarded right here.
  const rate = Number(c.env.KEEP_AUDIO_RATE ?? '0.2');
  // D1 rows top out near 2 MB, so very long recordings are never kept.
  // The random draw happens for every reading, flagged or not, so the headline sample includes hard cases.
  const randomPick = Math.random() < rate;
  const keep = child?.consent_keep_audio === 1 && audio.size <= 1_800_000 && (score.review.length > 0 || randomPick);
  if (keep) {
    await c.env.DB.prepare('INSERT INTO audio (session_id, flagged, random_pick, mime, data, expires_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, score.review.length > 0 ? 1 : 0, randomPick ? 1 : 0, audio.type || 'audio/webm', await audio.arrayBuffer(), now() + 14 * DAY).run();
  }

  return c.json({ sessionId: id, heard, passage, score, step });
});

// Tomorrow's practice: code picks the targets, a model drafts a text, code checks it.
app.post('/api/plan', async (c) => {
  const b = await c.req.json<{ childId?: string; lang?: string; level?: string; missed?: Record<string, number> }>();
  const lang = asLang(b.lang);
  const level = (['beginner', 'letter', 'word', 'para', 'story'].includes(b.level ?? '') ? b.level : 'para') as PlanLevel;
  if (!lang) return c.json({ error: 'bad request' }, 400);
  let history: ReadingTrace[] = b.missed ? [{ missed: b.missed }] : [];
  if (b.childId) {
    if (!(await childWithPin(c.env, b.childId, c.req.header('x-pin')))) return c.json({ error: 'wrong class PIN for this child' }, 403);
    const rows = await c.env.DB.prepare('SELECT missed, exposed FROM sessions WHERE child_id = ? ORDER BY created_at DESC LIMIT 6').bind(b.childId).all<{ missed: string; exposed: string }>();
    history = rows.results.map((r) => ({ missed: JSON.parse(r.missed), exposed: JSON.parse(r.exposed || '{}') })).reverse();
  }
  const targets = pickTargets(history, lang, WORD_BANK[lang]);
  const letters = getPassage(lang, 'letter', 'C').text.split(/\s+/);
  const easyWords = getPassage(lang, 'word', 'C').text.split(/\s+/);

  // Letter and beginner readers practise aksharas and word building; no connected text, no model.
  if (level === 'beginner' || level === 'letter') {
    return c.json({ targets, source: 'bank', plan: buildPlan({ level, targets, starterAksharas: letters, starterWords: easyWords }) });
  }

  // Practice never uses a word that appears only in the check passages (forms A and B), so it cannot
  // rehearse the test. Words that also appear in the practice form C are everyday words and are allowed.
  // Everyday words (the practice form C, the word bank, and common function words) are allowed.
  const everyday = new Set([...PASSAGES.filter((p) => p.lang === lang && p.form === 'C').flatMap((p) => tokenize(p.text, lang)), ...WORD_BANK[lang], ...FUNCTION_WORDS[lang]]);
  const testWords = new Set(PASSAGES.filter((p) => p.lang === lang && p.form !== 'C').flatMap((p) => tokenize(p.text, lang)).filter((w) => !everyday.has(w)));
  const known = new Set<string>([...WORD_BANK[lang], ...PASSAGES.filter((p) => p.lang === lang && p.form === 'C').flatMap((p) => tokenize(p.text, lang))].filter((w) => !testWords.has(w)));
  const bankTargets = { aksharas: targets.aksharas, words: targets.words.filter((w) => !testWords.has(w)) };
  // Practice text sits one step above what the child already reads well.
  const practiceLevel: Level = level === 'word' ? 'word' : 'story';
  const sample = getPassage(lang, practiceLevel === 'word' ? 'para' : 'story', 'C');

  let text = practiceLevel === 'word' ? sample.text.split(/(?<=[.!?।])\s+/).slice(0, 2).join(' ') : sample.text;
  let source: 'drafted' | 'bank' = 'bank';
  let feedback: string[] | undefined;
  for (let attempt = 0; attempt < 3 && modelReady(c.env); attempt++) {
    try {
      const draft = await draftText(c.env, draftPrompt(lang, practiceLevel, bankTargets, sample.text, feedback, [...testWords]));
      const check = checkPracticeText(draft, lang, practiceLevel, bankTargets, known, testWords);
      await c.env.DB.prepare('INSERT INTO drafts (id, lang, level, targets, text, ok, problems, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(crypto.randomUUID(), lang, practiceLevel, JSON.stringify(bankTargets), draft, check.ok ? 1 : 0, JSON.stringify(check.problems), now()).run();
      if (check.ok) { text = draft; source = 'drafted'; break; }
      feedback = check.problems;
    } catch {
      break;
    }
  }
  // The talk question belongs to the bank story, so it is only offered with that story.
  const plan = buildPlan({ level, targets: bankTargets, practiceText: text, starterAksharas: letters, starterWords: easyWords, question: source === 'bank' && practiceLevel === 'story' ? sample.questions?.[0]?.q : undefined });
  return c.json({ targets, source, plan });
});

app.post('/api/tts', async (c) => {
  if (!speechReady(c.env)) return c.json({ error: 'speech service not configured' }, 503);
  const b = await c.req.json<{ text?: string; lang?: string }>();
  const lang = asLang(b.lang);
  if (!b.text || !lang || b.text.length > 1200) return c.json({ error: 'bad request' }, 400);
  const key = await sha256(`${lang}:${b.text}`);
  const hit = await c.env.DB.prepare('SELECT audio FROM tts_cache WHERE key = ?').bind(key).first<{ audio: string }>();
  if (hit) return c.json(JSON.parse(hit.audio));
  try {
    const out = await speak(c.env, b.text, lang);
    await c.env.DB.prepare('INSERT OR IGNORE INTO tts_cache (key, audio, created_at) VALUES (?, ?, ?)').bind(key, JSON.stringify(out), now()).run();
    return c.json(out);
  } catch (e) {
    return c.json({ error: 'could not make the audio', detail: String(e) }, 502);
  }
});

// Blind check: a second adult hears a recording and marks each printed word, never seeing the machine's marks.
app.get('/api/class/:code/check', async (c) => {
  const cls = await teacherClass(c.env, c.req.param('code'), c.req.header('x-pin'));
  if (!cls) return c.json({ error: 'wrong class code or PIN' }, 403);
  const row = await c.env.DB.prepare(
    `SELECT s.id, s.passage_id, s.lang, s.runner, a.mime, a.data FROM audio a JOIN sessions s ON s.id = a.session_id
     WHERE s.class_id = ? AND a.expires_at > ? ORDER BY RANDOM() LIMIT 1`,
  ).bind(cls.id, now()).first<{ id: string; passage_id: string; lang: Lang; runner: string; mime: string; data: ArrayBuffer }>();
  if (!row) return c.json({ done: true });
  const p = PASSAGES.find((x) => x.id === row.passage_id)!;
  const bytes = new Uint8Array(row.data);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return c.json({ sessionId: row.id, runner: row.runner, words: p.text.split(/\s+/).filter((t) => normalizeWord(t, row.lang)), lang: row.lang, mime: row.mime, audio: btoa(bin) });
});

const MARKS = ['correct', 'error', 'skipped', 'not_reached'];
app.post('/api/class/:code/check', async (c) => {
  const cls = await teacherClass(c.env, c.req.param('code'), c.req.header('x-pin'));
  if (!cls) return c.json({ error: 'wrong class code or PIN' }, 403);
  if (cls.is_demo) return c.json({ error: 'The demo class is read-only.' }, 403);
  const b = await c.req.json<{ sessionId?: string; marks?: string[]; checker?: string; seconds?: number }>();
  const s = await c.env.DB.prepare('SELECT s.total_words, s.runner, a.flagged, a.random_pick FROM sessions s LEFT JOIN audio a ON a.session_id = s.id WHERE s.id = ? AND s.class_id = ?')
    .bind(b.sessionId ?? '', cls.id).first<{ total_words: number; runner: string; flagged: number | null; random_pick: number | null }>();
  if (!s || !Array.isArray(b.marks) || b.marks.length !== s.total_words || !b.marks.every((m) => MARKS.includes(m))) return c.json({ error: 'Mark every word before saving.' }, 400);
  const checker = (b.checker ?? '').trim();
  if (!checker) return c.json({ error: 'Add your name as the checker.' }, 400);
  if (s.runner && checker.toLowerCase() === s.runner.toLowerCase()) return c.json({ error: 'The adult who ran this reading cannot also check it. Ask someone else.' }, 400);
  await c.env.DB.batch([
    c.env.DB.prepare('INSERT OR REPLACE INTO rescores (session_id, marks, checker, human_seconds, flagged, random_pick, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(b.sessionId, JSON.stringify(b.marks), checker.slice(0, 60), typeof b.seconds === 'number' && b.seconds > 0 ? b.seconds : null, s.flagged ?? 0, s.random_pick ?? 0, now()),
    c.env.DB.prepare('DELETE FROM audio WHERE session_id = ?').bind(b.sessionId),
  ]);
  return c.json({ ok: true });
});

// A person listened to a reading Padh could not score and sets the level. Logged as set by a person.
app.post('/api/class/:code/child/:id/level', async (c) => {
  const cls = await teacherClass(c.env, c.req.param('code'), c.req.header('x-pin'));
  if (!cls) return c.json({ error: 'wrong class code or PIN' }, 403);
  if (cls.is_demo) return c.json({ error: 'The demo class is read-only.' }, 403);
  const b = await c.req.json<{ kind?: string; level?: string; by?: string }>();
  if (!['pre', 'post'].includes(b.kind ?? '') || !['beginner', 'letter', 'word', 'para', 'story'].includes(b.level ?? '') || !b.by?.trim()) return c.json({ error: 'bad request' }, 400);
  const child = await c.env.DB.prepare('SELECT * FROM children WHERE id = ? AND class_id = ?').bind(c.req.param('id'), cls.id).first<Record<string, unknown>>();
  if (!child) return c.json({ error: 'not found' }, 404);
  const done = await c.env.DB.prepare('SELECT id FROM sessions WHERE child_id = ? AND kind = ? AND final_level IS NOT NULL').bind(child.id, b.kind).first();
  if (done) return c.json({ error: 'This check already has a level.' }, 409);
  await c.env.DB.prepare(
    `INSERT INTO sessions (id, child_id, class_id, kind, lang, level, form, passage_id, heard, speech_seconds, correct, attempted, total_words, wcpm, passed, review, words, missed, exposed, final_level, runner, created_at)
     VALUES (?, ?, ?, ?, ?, 'letter', '-', 'set-by-person', '', 0, 0, 0, 0, NULL, 0, '["set_by_person"]', '[]', '{}', '{}', ?, ?, ?)`,
  ).bind(crypto.randomUUID(), child.id, cls.id, b.kind, child.lang, b.level, b.by.trim().slice(0, 60), now()).run();
  return c.json({ ok: true });
});

// Log adult time with a child: Padh practice, or storybook reading for the comparison group.
app.post('/api/class/:code/child/:id/minutes', async (c) => {
  const cls = await teacherClass(c.env, c.req.param('code'), c.req.header('x-pin'));
  if (!cls) return c.json({ error: 'wrong class code or PIN' }, 403);
  if (cls.is_demo) return c.json({ error: 'The demo class is read-only.' }, 403);
  const b = await c.req.json<{ kind?: string; minutes?: number }>();
  if (!['practice', 'storybook'].includes(b.kind ?? '') || !b.minutes || b.minutes < 1 || b.minutes > 60) return c.json({ error: 'bad request' }, 400);
  const child = await c.env.DB.prepare('SELECT id FROM children WHERE id = ? AND class_id = ?').bind(c.req.param('id'), cls.id).first();
  if (!child) return c.json({ error: 'not found' }, 404);
  await c.env.DB.prepare('INSERT INTO activity (id, child_id, kind, minutes, created_at) VALUES (?, ?, ?, ?, ?)').bind(crypto.randomUUID(), c.req.param('id'), b.kind, Math.round(b.minutes), now()).run();
  return c.json({ ok: true });
});

// A parent can withdraw at any time: the child and every reading are deleted.
app.delete('/api/class/:code/child/:id', async (c) => {
  const cls = await teacherClass(c.env, c.req.param('code'), c.req.header('x-pin'));
  if (!cls) return c.json({ error: 'wrong class code or PIN' }, 403);
  if (cls.is_demo) return c.json({ error: 'The demo class is read-only.' }, 403);
  const id = c.req.param('id');
  const child = await c.env.DB.prepare('SELECT id FROM children WHERE id = ? AND class_id = ?').bind(id, cls.id).first();
  if (!child) return c.json({ error: 'not found' }, 404);
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM audio WHERE session_id IN (SELECT id FROM sessions WHERE child_id = ?)').bind(id),
    c.env.DB.prepare('DELETE FROM rescores WHERE session_id IN (SELECT id FROM sessions WHERE child_id = ?)').bind(id),
    c.env.DB.prepare('DELETE FROM sessions WHERE child_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM activity WHERE child_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM children WHERE id = ?').bind(id),
  ]);
  return c.json({ ok: true });
});

app.get('/api/impact', async (c) => c.json(await computeImpact(c.env.DB)));

app.all('/api/*', (c) => c.json({ error: 'not found' }, 404));
app.all('*', (c) => c.env.ASSETS.fetch(c.req.raw));

export default {
  fetch: app.fetch,
  // Daily: delete recordings past 14 days, and blank transcripts older than 90 days (scores and counts stay).
  async scheduled(_e: ScheduledEvent, env: Env) {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM audio WHERE expires_at < ?').bind(now()),
      env.DB.prepare("UPDATE sessions SET heard = '' WHERE heard != '' AND created_at < ?").bind(now() - 90 * DAY),
    ]);
  },
};
