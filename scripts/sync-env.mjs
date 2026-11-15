// Copies keys from .env.local into .dev.vars for local runs. Neither file is committed.
import { readFileSync, writeFileSync } from 'node:fs';
const src = readFileSync('.env.local', 'utf8');
const keep = ['SPEECH_PROVIDER', 'ELEVENLABS_API_KEY', 'ELEVENLABS_VOICE_ID', 'ELEVENLABS_TTS_MODEL', 'SARVAM_API_KEY', 'LLM_API_KEY', 'LLM_PROVIDER', 'LLM_MODEL'];
const out = src.split('\n').filter((l) => keep.some((k) => l.startsWith(k + '=')) && l.split('=')[1]?.trim());
writeFileSync('.dev.vars', out.join('\n') + '\n');
console.log('wrote', out.map((l) => l.split('=')[0]).join(', ') || 'no keys yet');
