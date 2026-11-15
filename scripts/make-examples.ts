// Makes the "sample result" for each language: a computer voice reads the practice passage with
// two mistakes planted on purpose, and the recording goes through the real scoring pipeline.
// Labelled as a computer voice everywhere it is shown. Run against a local or live server.
import { readFileSync, writeFileSync } from 'node:fs';
import { getPassage, type Lang } from '../src/core/passages';

const BASE = process.argv[2] ?? 'http://localhost:8787';
const key = readFileSync('.env.local', 'utf8').match(/^ELEVENLABS_API_KEY=(.+)$/m)?.[1]?.trim();
if (!key) throw new Error('ELEVENLABS_API_KEY missing');

function plant(text: string): { read: string; planted: string[] } {
  const words = text.split(/\s+/);
  const skip = 5;
  const change = 2;
  // The misread swaps in another word from the same passage, the way a child guesses from a familiar word.
  const swapIn = words[words.length - 3].replace(/[.,!?।]/g, '');
  const planted = [`skipped "${words[skip].replace(/[.,!?।]/g, '')}"`, `read "${words[change].replace(/[.,!?।]/g, '')}" as "${swapIn}"`];
  const out = words.map((w, i) => (i === change ? swapIn : w)).filter((_, i) => i !== skip);
  return { read: out.join(' '), planted };
}

for (const lang of ['en', 'te', 'hi'] as Lang[]) {
  const p = getPassage(lang, 'para', 'C');
  const { read, planted } = plant(p.text);
  const tts = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM?output_format=mp3_44100_64', {
    method: 'POST',
    headers: { 'xi-api-key': key, 'content-type': 'application/json' },
    body: JSON.stringify({ text: read, model_id: 'eleven_v3', language_code: lang, voice_settings: { speed: 0.7 } }),
  });
  if (!tts.ok) throw new Error(`tts ${lang} ${tts.status}`);
  const audio = Buffer.from(await tts.arrayBuffer());
  const form = new FormData();
  form.append('audio', new File([audio], 'reading.mp3', { type: 'audio/mpeg' }));
  form.append('lang', lang);
  form.append('level', 'para');
  form.append('kind', 'try');
  form.append('speechSeconds', '0');
  const res = await fetch(`${BASE}/api/read`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`read ${lang} ${res.status} ${await res.text()}`);
  const body = await res.json();
  const note = `A computer voice read this passage with two mistakes planted on purpose (${planted.join(', ')}). It is not a child. Scored by Padh's live pipeline on ${new Date().toISOString().slice(0, 10)}.`;
  writeFileSync(`public/example/${lang}.json`, JSON.stringify({ ...body, note, audio: audio.toString('base64'), mime: 'audio/mpeg' }));
  const s = body.score;
  console.log(lang, 'heard:', body.heard.slice(0, 80), '| correct', s.correct, '/', s.totalWords, 'wcpm', s.wcpm, 'review', s.review, 'statuses', s.alignment.words.filter((w: { status: string }) => w.status !== 'correct').map((w: { ref: string; status: string }) => `${w.ref}:${w.status}`).join(' '));
}
