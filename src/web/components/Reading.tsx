import { useEffect, useRef, useState } from 'preact/hooks';
import type { Lang, Level, Passage } from '../../core/passages';
import type { WordResult } from '../../core/align';
import type { ReadingScore } from '../../core/score';
import { nipunTarget } from '../../core/score';
import { normalizeWord } from '../../core/text';
import { Recorder, type Recording } from '../recorder';
import { t } from '../i18n';
import { api, playBase64Wav } from '../api';

const MicIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
);
const StopIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2" /></svg>
);

export function PassageText({ passage, words }: { passage: Passage; words?: WordResult[] }) {
  const [picked, setPicked] = useState<number | null>(null);
  const grid = passage.level === 'letter' || passage.level === 'word';
  const cls = `passage ${grid ? 'passage--grid' : ''} ${passage.lang === 'en' ? 'passage--en' : ''}`;
  const tokens = passage.text.split(/\s+/).filter((t) => normalizeWord(t, passage.lang));
  const pickedWord = picked !== null ? words?.[picked] : undefined;
  return (
    <div class="col" style="gap:10px">
      <div class={cls} lang={passage.lang}>
        {tokens.map((tok, i) => {
          const w = words?.[i];
          if (!w) return grid ? <span key={i}>{tok}</span> : <><span key={i} class="w">{tok}</span>{' '}</>;
          const btn = (
            <button type="button" class={grid ? '' : `w w--${w.status}`} style="all:unset;cursor:pointer" aria-label={`${tok}: ${describe(w)}`} onClick={() => setPicked(picked === i ? null : i)}>
              {grid ? <span class={`w--${w.status}`} style="display:block;padding:14px 4px;border-radius:var(--r-md)">{tok}</span> : tok}
            </button>
          );
          return grid ? <span key={i} style="padding:0;background:none;box-shadow:none">{btn}</span> : <><span key={i} class={`w w--${w.status}`}>{btn}</span>{' '}</>;
        })}
      </div>
      {words && <p class="t-small" aria-live="polite">{pickedWord ? <><strong lang={passage.lang} class="indic">{tokens[picked!]}</strong>: {describe(pickedWord)}</> : 'Tap any word to see what Padh heard.'}</p>}
    </div>
  );
}

function describe(w: WordResult): string {
  if (w.status === 'correct') return 'Read correctly';
  if (w.status === 'omission') return 'Skipped';
  if (w.status === 'not_reached') return 'Not reached';
  return `Heard "${w.heard}"${w.missed.length ? ` · check ${w.missed.join(' ')}` : ''}`;
}

export function Legend() {
  return (
    <div class="legend">
      <span><i style="background:var(--green-wash);box-shadow:inset 0 0 0 1px var(--green)" />Read correctly</span>
      <span><i style="background:var(--miss-wash);box-shadow:inset 0 0 0 1px var(--miss)" />Read differently</span>
      <span><i style="background:var(--skip-wash);box-shadow:inset 0 0 0 1px var(--skip)" />Skipped</span>
      <span><i style="background:var(--tint)" />Not reached</span>
    </div>
  );
}

/** The record button with a live level meter and timer. */
export function RecordButton(props: { lang: Lang; onDone: (r: Recording) => void; disabled?: boolean; maxSeconds?: number }) {
  const rec = useRef<Recorder | null>(null);
  const [on, setOn] = useState(false);
  const [levels, setLevels] = useState<number[]>(Array(18).fill(0.05));
  const [secs, setSecs] = useState(0);
  const [err, setErr] = useState('');
  const raf = useRef(0);

  useEffect(() => () => { cancelAnimationFrame(raf.current); rec.current?.cancel(); }, []);

  const tick = () => {
    const r = rec.current;
    if (!r) return;
    setLevels((l) => [...l.slice(1), Math.max(0.05, r.level())]);
    const e = r.elapsed();
    setSecs(e);
    if (e >= (props.maxSeconds ?? 90)) { void stop(); return; }
    raf.current = requestAnimationFrame(tick);
  };

  async function start() {
    setErr('');
    try {
      rec.current = new Recorder();
      await rec.current.start();
      setOn(true);
      raf.current = requestAnimationFrame(tick);
    } catch {
      setErr('The microphone is blocked. Allow it in the browser and try again.');
    }
  }

  async function stop() {
    cancelAnimationFrame(raf.current);
    const r = rec.current;
    rec.current = null;
    setOn(false);
    if (r) props.onDone(await r.stop());
  }

  return (
    <div class="row" style="gap:20px">
      <button class={`mic ${on ? 'mic--on' : ''}`} disabled={props.disabled} onClick={() => (on ? stop() : start())} aria-label={on ? 'Stop recording' : 'Start recording'}>
        {on ? <StopIcon /> : <MicIcon />}
      </button>
      <div class="col" style="gap:6px">
        <strong lang={props.lang} class="indic">{on ? t('tapWhenDone', props.lang) : t('tapToStart', props.lang)}</strong>
        {on ? (
          <div class="row" style="gap:12px">
            <div class="meter" aria-hidden="true">{levels.map((l, i) => <i key={i} style={{ height: `${8 + l * 32}px` }} />)}</div>
            <span class="timer">{secs.toFixed(1)}s</span>
          </div>
        ) : (
          <span class="t-small">Up to {props.maxSeconds ?? 90} seconds. Nothing is kept unless a parent agreed.</span>
        )}
        {err && <div class="error">{err}</div>}
      </div>
    </div>
  );
}

const REVIEW_TEXT: Record<string, string> = {
  no_speech: 'We could not hear any reading. Check the microphone and try again.',
  too_fast: 'That was faster than anyone reads. A teacher should listen before this counts.',
  too_short: 'The recording was very short.',
  off_text: 'What we heard does not match the passage. A teacher should listen before this counts.',
};

export function ScoreView({ score, grade }: { score: ReadingScore; grade?: number }) {
  const target = grade ? nipunTarget(grade) : null;
  const connected = score.level === 'para' || score.level === 'story';
  return (
    <div class="col" style="gap:18px">
      {score.review.length > 0 && (
        <div class="note">{score.review.map((r) => <p key={r}>{REVIEW_TEXT[r] ?? r}</p>)}</div>
      )}
      <div class="score-hero">
        {connected ? (
          <div class="score-tile">
            <b class="t-mono">{score.wcpm ?? '–'}</b>
            <span>words correct per minute</span>
            {target && score.wcpm !== null && (
              <>
                <div class="bar" aria-hidden="true">
                  <i style={{ width: `${Math.min(100, (score.wcpm / (target.max ?? target.min * 1.3)) * 100)}%` }} />
                  <em style={{ left: `${Math.min(100, (target.min / (target.max ?? target.min * 1.3)) * 100)}%` }} />
                </div>
                <span>Indicative only: NIPUN's Class {grade} goal is {target.min}{target.max ? ` to ${target.max}` : '+'} words a minute on grade-level text</span>
              </>
            )}
          </div>
        ) : (
          <div class="score-tile"><b class="t-mono">{score.correct}/{score.totalWords}</b><span>read correctly</span></div>
        )}
        <div class="score-tile"><b class="t-mono">{Math.round(score.accuracy * 100)}%</b><span>accuracy on words tried</span></div>
        <div class="score-tile"><b class="t-mono">{score.speechSeconds.toFixed(1)}s</b><span>reading time, silence trimmed</span></div>
      </div>
      {Object.keys(score.missedAksharas).length > 0 && (
        <div class="col" style="gap:10px">
          <span class="eyebrow"><span class="dot" />Letters to practise</span>
          <div class="aks" lang={score.lang}>
            {Object.entries(score.missedAksharas).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([ak]) => <span key={ak}>{ak}</span>)}
          </div>
        </div>
      )}
    </div>
  );
}

export function Speak({ text, lang, label }: { text: string; lang: Lang; label?: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  async function play() {
    setState('loading');
    try {
      const { audio, mime } = await api.tts(text, lang);
      playBase64Wav(audio, mime);
      setState('idle');
    } catch {
      setState('error');
    }
  }
  return (
    <button class="btn btn-outline btn-sm" onClick={play} disabled={state === 'loading'}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5zM16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12" /></svg>
      {state === 'loading' ? '…' : state === 'error' ? 'Audio unavailable' : label ?? t('listen', lang)}
    </button>
  );
}

export const LEVEL_ORDER: Level[] = ['letter', 'word', 'para', 'story'];
