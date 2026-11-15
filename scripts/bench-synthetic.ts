// Synthetic accuracy benchmark. A computer voice reads every paragraph and story passage with
// mistakes planted at known positions (a skipped word, a swapped word, a misread word), and the
// live pipeline scores it. We then compare Padh's marks with the known truth. This measures the
// pipeline on clear adult-like synthetic speech; it says nothing yet about children's voices.
import { readFileSync, writeFileSync } from 'node:fs';
import { PASSAGES, type Passage } from '../src/core/passages';
import { aksharas, normalizeWord } from '../src/core/text';

const BASE = process.argv[2] ?? 'https://padh.padh-read.workers.dev';
const key = readFileSync('.env.local', 'utf8').match(/^ELEVENLABS_API_KEY=(.+)$/m)?.[1]?.trim()!;

type Plant = { index: number; kind: 'skip' | 'swap' | 'misread' };

function planted(p: Passage): { spoken: string; plants: Plant[]; printed: string[] } {
  const printed = p.text.split(/\s+/).filter((t) => normalizeWord(t, p.lang));
  const n = printed.length;
  const plants: Plant[] = [
    { index: Math.floor(n * 0.25), kind: 'skip' },
    { index: Math.floor(n * 0.5), kind: 'swap' },
    { index: Math.floor(n * 0.75), kind: 'misread' },
  ];
  const out: string[] = [];
  printed.forEach((w, i) => {
    const pl = plants.find((x) => x.index === i);
    if (!pl) return out.push(w);
    if (pl.kind === 'skip') return;
    const clean = normalizeWord(w, p.lang);
    if (pl.kind === 'swap') return out.push(normalizeWord(printed[(i + 3) % n], p.lang) === clean ? normalizeWord(printed[(i + 5) % n], p.lang) : normalizeWord(printed[(i + 3) % n], p.lang));
    // Misread: drop the second akshara, the way a child skips a syllable.
    const aks = aksharas(clean, p.lang);
    out.push(aks.length > 2 ? [aks[0], ...aks.slice(2)].join('') : aks.length === 2 ? aks[0] : clean + clean);
  });
  return { spoken: out.join(' '), plants, printed };
}

const rows: string[] = [];
let tp = 0, fn = 0, fp = 0, words = 0;
const byKind: Record<string, { found: number; total: number }> = { skip: { found: 0, total: 0 }, swap: { found: 0, total: 0 }, misread: { found: 0, total: 0 } };
for (const p of PASSAGES.filter((x) => x.level === 'para' || x.level === 'story')) {
  const { spoken, plants } = planted(p);
  const tts = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM?output_format=mp3_44100_64', {
    method: 'POST', headers: { 'xi-api-key': key, 'content-type': 'application/json' },
    body: JSON.stringify({ text: spoken, model_id: 'eleven_v3', language_code: p.lang, voice_settings: { speed: 0.7 } }),
  });
  if (!tts.ok) { console.error('tts', p.id, tts.status); continue; }
  const form = new FormData();
  form.append('audio', new File([Buffer.from(await tts.arrayBuffer())], 'r.mp3', { type: 'audio/mpeg' }));
  form.append('lang', p.lang); form.append('level', p.level); form.append('kind', 'try'); form.append('speechSeconds', '0');
  // The public try page always scores form C; to score forms A and B we use their text through the same scorer.
  const res = await fetch(`${BASE}/api/read`, { method: 'POST', body: form });
  const body = await res.json() as { heard: string };
  const { scoreReading } = await import('../src/core/score');
  const s = scoreReading({ lang: p.lang, level: p.level, passage: p.text, heard: body.heard, speechSeconds: 30, maxRate: 999 });
  const errIdx = new Set(s.alignment.words.map((w, i) => (w.status === 'substitution' || w.status === 'omission' ? i : -1)).filter((i) => i >= 0));
  const truth = new Set(plants.map((x) => x.index));
  let found = 0;
  for (const pl of plants) { byKind[pl.kind].total++; if (errIdx.has(pl.index)) { byKind[pl.kind].found++; found++; } }
  const extra = [...errIdx].filter((i) => !truth.has(i)).length;
  tp += found; fn += plants.length - found; fp += extra; words += s.totalWords;
  rows.push(`| ${p.id} | ${s.totalWords} | ${found}/3 | ${extra} |`);
  console.log(p.id, `found ${found}/3, false alarms ${extra}`);
}
const recall = tp / (tp + fn), precision = tp / (tp + fp);
const md = `# Synthetic benchmark (computer voice, not children)

Run on ${new Date().toISOString().slice(0, 10)} with \`npx tsx scripts/bench-synthetic.ts\`. A computer voice (ElevenLabs text-to-speech) read each paragraph and story passage with three mistakes planted at known places: one skipped word, one word swapped for another word from the passage, and one word with its second akshara dropped. The recording went through the live speech-to-text step, and Padh's scorer marked it.

This shows how well the pipeline finds known mistakes in clear synthetic speech. It is an upper bound. Children's voices are harder, which is what the blind teacher checks in the pilot measure.

| Measure | Result |
|---|---|
| Planted mistakes found (recall) | ${tp}/${tp + fn} (${Math.round(recall * 100)}%) |
| Marks that were real mistakes (precision) | ${tp}/${tp + fp} (${Math.round(precision * 100)}%) |
| Skipped words found | ${byKind.skip.found}/${byKind.skip.total} |
| Swapped words found | ${byKind.swap.found}/${byKind.swap.total} |
| Misread words found | ${byKind.misread.found}/${byKind.misread.total} |
| Words scored | ${words} |

Misread words are the hard case: the recogniser sometimes "hears" the correct word even when a syllable is missing. That is the gap the blind checks are there to measure.

| Passage | Words | Planted found | False alarms |
|---|---|---|---|
${rows.join('\n')}
`;
writeFileSync('docs/synthetic-benchmark.md', md);
writeFileSync('public/benchmark.json', JSON.stringify({ date: new Date().toISOString().slice(0, 10), recall, precision, found: tp, planted: tp + fn, falseAlarms: fp, byKind, words }));
console.log('recall', recall.toFixed(3), 'precision', precision.toFixed(3), byKind);
