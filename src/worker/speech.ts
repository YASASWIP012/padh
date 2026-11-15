import type { Lang } from '../core/passages';

export interface SpeechEnv {
  SPEECH_PROVIDER?: string; // 'elevenlabs' | 'sarvam'
  ELEVENLABS_API_KEY?: string;
  ELEVENLABS_VOICE_ID?: string;
  ELEVENLABS_TTS_MODEL?: string;
  SARVAM_API_KEY?: string;
}

export interface Heard {
  text: string;
  /** Seconds from the first to the last spoken word, when the recogniser gives word times. */
  speechSeconds: number | null;
}

export function speechReady(env: SpeechEnv): boolean {
  return provider(env) === 'elevenlabs' ? !!env.ELEVENLABS_API_KEY : !!env.SARVAM_API_KEY;
}

function provider(env: SpeechEnv): 'elevenlabs' | 'sarvam' {
  if (env.SPEECH_PROVIDER === 'sarvam') return 'sarvam';
  if (env.SPEECH_PROVIDER === 'elevenlabs') return 'elevenlabs';
  return env.ELEVENLABS_API_KEY ? 'elevenlabs' : 'sarvam';
}

const SARVAM_LANG: Record<Lang, string> = { te: 'te-IN', hi: 'hi-IN', en: 'en-IN' };

/**
 * Speech to text, verbatim: false starts and repeats are kept, because a
 * reading check needs them. The recogniser is never given the passage. Biasing
 * it toward the printed words would hide the child's real mistakes.
 */
export async function transcribe(env: SpeechEnv, audio: Blob, lang: Lang): Promise<Heard> {
  if (provider(env) === 'elevenlabs') {
    const form = new FormData();
    form.append('file', audio, 'reading.webm');
    form.append('model_id', 'scribe_v2');
    form.append('language_code', lang);
    form.append('no_verbatim', 'false');
    form.append('tag_audio_events', 'false');
    form.append('timestamps_granularity', 'word');
    const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: { 'xi-api-key': env.ELEVENLABS_API_KEY! },
      body: form,
    });
    if (!res.ok) throw new Error(`speech-to-text ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const b = (await res.json()) as { text?: string; words?: { type: string; start: number; end: number }[] };
    const words = (b.words ?? []).filter((w) => w.type === 'word');
    const speechSeconds = words.length >= 2 ? words[words.length - 1].end - words[0].start : null;
    return { text: b.text ?? '', speechSeconds };
  }

  const form = new FormData();
  form.append('file', audio, 'reading.webm');
  form.append('model', 'saaras:v3');
  form.append('mode', 'verbatim');
  form.append('language_code', SARVAM_LANG[lang]);
  const res = await fetch('https://api.sarvam.ai/speech-to-text', {
    method: 'POST',
    headers: { 'api-subscription-key': env.SARVAM_API_KEY! },
    body: form,
  });
  if (!res.ok) throw new Error(`speech-to-text ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = (await res.json()) as { transcript?: string };
  return { text: body.transcript ?? '', speechSeconds: null };
}

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** A slow, clear model reading of a practice text. */
export async function speak(env: SpeechEnv, text: string, lang: Lang): Promise<{ audio: string; mime: string }> {
  if (provider(env) === 'elevenlabs') {
    const voice = env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_64`, {
      method: 'POST',
      headers: { 'xi-api-key': env.ELEVENLABS_API_KEY!, 'content-type': 'application/json' },
      body: JSON.stringify({
        text,
        model_id: env.ELEVENLABS_TTS_MODEL || 'eleven_v3',
        language_code: lang,
        voice_settings: { speed: 0.8, stability: 0.6 },
      }),
    });
    if (!res.ok) throw new Error(`text-to-speech ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return { audio: toBase64(await res.arrayBuffer()), mime: 'audio/mpeg' };
  }

  const res = await fetch('https://api.sarvam.ai/text-to-speech', {
    method: 'POST',
    headers: { 'api-subscription-key': env.SARVAM_API_KEY!, 'content-type': 'application/json' },
    body: JSON.stringify({ text, language_code: SARVAM_LANG[lang], model: 'bulbul:v3', speaker: 'ritu', pace: 0.8, speech_sample_rate: 22050 }),
  });
  if (!res.ok) throw new Error(`text-to-speech ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = (await res.json()) as { audios?: string[] };
  if (!body.audios?.[0]) throw new Error('text-to-speech returned no audio');
  return { audio: body.audios[0], mime: 'audio/wav' };
}
