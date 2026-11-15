import { useEffect, useState } from 'preact/hooks';
import type { Lang, Level, Passage } from '../../core/passages';
import { api, playBase64Wav, type ReadResult } from '../api';
import { LANG_LABEL, t } from '../i18n';
import { Legend, PassageText, RecordButton, ScoreView, Speak } from '../components/Reading';
import { PracticePlan } from '../components/Plan';
import type { Recording } from '../recorder';

const LEVELS: { id: Level; label: string }[] = [
  { id: 'letter', label: 'Letters' },
  { id: 'word', label: 'Words' },
  { id: 'para', label: 'Paragraph' },
  { id: 'story', label: 'Story' },
];

/** A stored, real run through the live pipeline, for anyone without a microphone. */
interface Example extends ReadResult {
  note: string;
  audio?: string;
  mime?: string;
}

function friendly(msg: string): string {
  if (/not configured/i.test(msg)) return 'The speech service is switched off right now.';
  if (/could not hear|speech-to-text|502|503|fetch/i.test(msg)) return 'Padh could not reach the speech service just now. Your recording is still here, so you can try again without reading it twice.';
  if (/too long/i.test(msg)) return 'That recording was longer than 90 seconds. Please read just the passage.';
  return msg;
}

/** The open "try it" page. Anyone can read a passage and see exactly what the checker heard. */
export function TryPage({ embedded = false, initialLang = 'en' }: { embedded?: boolean; initialLang?: Lang }) {
  const [lang, setLang] = useState<Lang>(initialLang);
  const [level, setLevel] = useState<Level>('para');
  const [passage, setPassage] = useState<Passage | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ReadResult | Example | null>(null);
  const [pending, setPending] = useState<Recording | null>(null);
  const [err, setErr] = useState('');
  const [example, setExample] = useState<Example | null>(null);

  useEffect(() => {
    setResult(null);
    setErr('');
    setPending(null);
    api.passage(lang, level, 'C').then(setPassage).catch(() => setErr('Could not load the passage. Check your connection and reload.'));
  }, [lang, level]);

  useEffect(() => {
    setExample(null);
    fetch(`/example/${lang}.json`).then((r) => (r.ok ? (r.json() as Promise<Example>) : null)).then((x) => setExample(x)).catch(() => setExample(null));
  }, [lang]);

  async function send(r: Recording) {
    setBusy(true);
    setErr('');
    try {
      setResult(await api.read(r.blob, { lang, level, kind: 'try', speechSeconds: r.speechSeconds }));
      setPending(null);
    } catch (e) {
      setPending(r);
      setErr(friendly((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  function showExample() {
    if (!example) return;
    setLevel(example.score.level);
    setPassage(example.passage);
    setResult(example);
    setErr('');
    if (example.audio) playBase64Wav(example.audio, example.mime);
  }

  const isExample = !!result && 'note' in result;

  return (
    <div class="col" style="gap:20px">
      <div class="row" style="justify-content:space-between">
        <div class="segmented" role="radiogroup" aria-label="Language">
          {(['en', 'te', 'hi'] as Lang[]).map((l) => (
            <button key={l} role="radio" aria-checked={lang === l} onClick={() => setLang(l)} class={l !== 'en' ? 'indic' : ''}>{LANG_LABEL[l]}</button>
          ))}
        </div>
        <div class="segmented" role="radiogroup" aria-label="Level">
          {LEVELS.map((x) => (
            <button key={x.id} role="radio" aria-checked={level === x.id} onClick={() => setLevel(x.id)}>{x.label}</button>
          ))}
        </div>
      </div>

      <div class="reader col" style="gap:22px">
        <div class="row" style="justify-content:space-between">
          <span class="eyebrow indic" lang={lang}><span class="dot" />{isExample ? 'Sample result' : t('readThis', lang)}</span>
          {passage && !result && <Speak text={passage.text} lang={lang} label="Hear it read" />}
        </div>
        {isExample && <div class="note">{(result as Example).note}</div>}
        {passage ? <PassageText passage={passage} words={result?.score.alignment.words} /> : <div class="muted-box">Loading…</div>}
        {result && <Legend />}
        {!result && (
          <RecordButton lang={lang} onDone={send} disabled={busy || !passage} maxSeconds={level === 'story' ? 90 : 60} />
        )}
        <div aria-live="polite">
          {busy && <div class="muted-box indic" lang={lang}>{t('checking', lang)}</div>}
          {err && (
            <div class="error col" style="gap:10px">
              <span>{err}</span>
              <div class="row">
                {pending && <button class="btn btn-ink btn-sm" onClick={() => send(pending)}>Try again with the same recording</button>}
                {example && <button class="btn btn-outline btn-sm" onClick={showExample}>Open the sample result</button>}
              </div>
            </div>
          )}
        </div>
        {!result && <p class="t-micro">This page is for adults trying Padh. Your recording goes to ElevenLabs to be turned into text, under ElevenLabs' data terms. Padh scores it and keeps no copy and no transcript.</p>}
        {!result && !err && example && (
          <button class="btn btn-ghost btn-sm" style="justify-self:start" onClick={showExample}>No microphone? Open a sample result</button>
        )}
        {result && (
          <>
            <ScoreView score={result.score} />
            <div class="muted-box">
              <strong>What the checker heard:</strong>{' '}
              <span class="indic" lang={lang}>{result.heard || '(nothing)'}</span>
            </div>
            <div class="row">
              <button class="btn btn-ink" onClick={() => setResult(null)}>{isExample ? 'Now read it yourself' : 'Read again'}</button>
            </div>
          </>
        )}
      </div>

      {result && !embedded && (
        <div class="reader">
          <PracticePlan lang={lang} level={level} missed={result.score.missedAksharas} />
        </div>
      )}
      {result && embedded && Object.keys(result.score.missedAksharas).length > 0 && (
        <div class="reader col" style="gap:8px">
          <span class="eyebrow"><span class="dot" />Tomorrow's 10 minutes</span>
          <p class="t-small">Practice built around <span class="indic" lang={lang}>{Object.keys(result.score.missedAksharas).slice(0, 3).join(', ')}</span>, at this reader's level.</p>
          <a class="src" href="#/try">See the full practice plan</a>
        </div>
      )}
    </div>
  );
}
