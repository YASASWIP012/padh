// Builds seed-demo.sql: a read-only demo class so judges and visitors can see the
// teacher view. Every child here is made up, the class is marked is_demo = 1, and
// demo data is excluded from every public number.
import { createHash, randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { getPassage, type Lang, type Level, type Form } from '../src/core/passages';
import { scoreReading, nextStep } from '../src/core/score';
import { tokenize } from '../src/core/text';

const DAY = 86_400_000;
const now = Date.now();
const classId = 'demo-class';
const pinHash = createHash('sha256').update(`${classId}:0000`).digest('hex');
const q = (v: unknown) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const out: string[] = [
  "DELETE FROM sessions WHERE class_id = 'demo-class';",
  "DELETE FROM children WHERE class_id = 'demo-class';",
  "DELETE FROM classes WHERE id = 'demo-class';",
  `INSERT INTO classes (id, code, name, lang, pin_hash, is_demo, created_at) VALUES ('demo-class', 'DEMO01', 'Demo class (made-up children)', 'te', ${q(pinHash)}, 1, ${now - 10 * DAY});`,
];

// Reads a passage with a given number of words swapped or skipped, deterministically.
function simulate(text: string, lang: Lang, mistakes: number, stopAt?: number): string {
  const words = tokenize(text, lang);
  const res: string[] = [];
  const end = stopAt ?? words.length;
  for (let i = 0; i < end; i++) {
    if (mistakes > 0 && i % 5 === 3) {
      mistakes--;
      if (i % 2) continue; // skipped
      res.push([...words[i]].slice(0, -1).join('') || words[i]); // last letter dropped
    } else res.push(words[i]);
  }
  return res.join(' ');
}

const kids: { nick: string; lang: Lang; grade: number; arm: string; order: string; pre: number; post?: number; practice: number }[] = [
  { nick: 'Demo child 1', lang: 'te', grade: 3, arm: 'practice', order: 'AB', pre: 2, post: 0, practice: 6 },
  { nick: 'Demo child 2', lang: 'te', grade: 2, arm: 'waitlist', order: 'BA', pre: 5, post: 4, practice: 0 },
  { nick: 'Demo child 3', lang: 'te', grade: 3, arm: 'practice', order: 'BA', pre: 7, practice: 3 },
  { nick: 'Demo child 4', lang: 'hi', grade: 4, arm: 'waitlist', order: 'AB', pre: 1, practice: 0 },
  { nick: 'Demo child 5', lang: 'en', grade: 3, arm: 'practice', order: 'AB', pre: 3, post: 1, practice: 5 },
  { nick: 'Demo child 6', lang: 'te', grade: 2, arm: 'waitlist', order: 'AB', pre: 9, practice: 0 },
];

for (const [k, kid] of kids.entries()) {
  const childId = `demo-child-${k + 1}`;
  out.push(`INSERT INTO children (id, class_id, nickname, grade, lang, consent_at, consent_keep_audio, consent_version, consent_witness, arm, form_order, created_at) VALUES (${q(childId)}, 'demo-class', ${q(kid.nick)}, ${kid.grade}, ${q(kid.lang)}, ${now - 9 * DAY}, 0, 'v1', 'Demo', ${q(kid.arm)}, ${q(kid.order)}, ${now - 9 * DAY});`);
  const run = (kind: 'pre' | 'post' | 'practice', form: Form, mistakes: number, at: number) => {
    let level: Level = kind === 'practice' ? 'para' : 'para';
    for (let step = 0; step < 4; step++) {
      const p = getPassage(kid.lang, level, form);
      const heard = simulate(p.text, kid.lang, mistakes);
      const secs = tokenize(p.text, kid.lang).length * (1.1 + mistakes * 0.12);
      const s = scoreReading({ lang: kid.lang, level, passage: p.text, heard, speechSeconds: secs });
      const nx = nextStep(level, s.passed);
      const final = kind !== 'practice' && 'final' in nx ? nx.final : null;
      out.push(`INSERT INTO sessions (id, child_id, class_id, kind, lang, level, form, passage_id, heard, speech_seconds, correct, attempted, total_words, wcpm, passed, review, words, missed, exposed, final_level, runner, created_at) VALUES (${q(randomUUID())}, ${q(childId)}, 'demo-class', ${q(kind)}, ${q(kid.lang)}, ${q(level)}, ${q(form)}, ${q(p.id)}, ${q(heard)}, ${s.speechSeconds}, ${s.correct}, ${s.attempted}, ${s.totalWords}, ${q(s.wcpm)}, ${s.passed ? 1 : 0}, '[]', ${q(JSON.stringify(s.alignment.words))}, ${q(JSON.stringify(s.missedAksharas))}, ${q(JSON.stringify(s.exposedAksharas))}, ${q(final)}, 'Demo', ${at + step * 60_000});`);
      if (kind === 'practice' || 'final' in nx) break;
      level = nx.next;
    }
  };
  run('pre', kid.order[0] as Form, kid.pre, now - 9 * DAY);
  for (let d = 0; d < kid.practice; d++) run('practice', 'C', Math.max(0, kid.pre - d), now - (8 - d) * DAY);
  if (kid.post !== undefined) run('post', kid.order[1] as Form, kid.post, now - DAY);
}

writeFileSync('seed-demo.sql', out.join('\n') + '\n');
console.log(`wrote seed-demo.sql with ${out.length} statements`);
