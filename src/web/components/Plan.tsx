import { useEffect, useState } from 'preact/hooks';
import type { Lang, Level } from '../../core/passages';
import type { PlanStep, PracticeTargets } from '../../core/practice';
import { api } from '../api';
import { Speak } from './Reading';
import { aksharas } from '../../core/text';

const splitAks = (w: string, lang: Lang) => `${aksharas(w, lang).join(' + ')} = ${w}`;

const STEP_TEXT: Record<PlanStep['kind'], { title: string; how: string }> = {
  listen: { title: 'Listen first', how: 'Play the passage. The child follows each word with a finger.' },
  echo: { title: 'Read after me', how: 'The adult reads one sentence, the child reads the same sentence back.' },
  sounds: { title: 'The tricky letters', how: 'Say each one together, then find it in the passage.' },
  build: { title: 'Build the word', how: 'Say each akshara, then blend them into the word. Write it in the air or on a slate.' },
  words: { title: 'Word ladder', how: 'Read each word. Go back to any that were hard.' },
  repeat: { title: 'Read it three times', how: 'The child reads the whole passage alone three times. It gets easier each time.' },
  talk: { title: 'Talk about it', how: 'Ask this and let the child answer in their own words.' },
};

export function PracticePlan(props: { lang: Lang; level: Level | 'beginner'; childId?: string; pin?: string; missed?: Record<string, number> }) {
  const [data, setData] = useState<{ targets: PracticeTargets; source: string; plan: PlanStep[] } | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    setData(null);
    api.plan({ lang: props.lang, level: props.level, childId: props.childId, missed: props.missed }, props.pin)
      .then(setData)
      .catch((e: Error) => setErr(e.message));
  }, [props.lang, props.level, props.childId, JSON.stringify(props.missed)]);

  if (err) return <div class="error">{err}</div>;
  if (!data) return <div class="muted-box">Writing tomorrow's practice…</div>;
  const total = data.plan.reduce((a, s) => a + s.minutes, 0);

  return (
    <div class="col" style="gap:16px">
      <div class="row" style="justify-content:space-between">
        <span class="eyebrow"><span class="dot" />Tomorrow's practice · {total} minutes</span>
        <span class={`pill ${data.source === 'drafted' ? 'pill--accent' : ''}`}>
          {data.source === 'drafted' ? 'New text, passed every check' : 'Text from the passage bank'}
        </span>
      </div>
      <div class="steps">
        {data.plan.map((s, i) => (
          <div class="step" key={i}>
            <div class="col" style="gap:6px">
              <span class="t-title">{STEP_TEXT[s.kind].title}</span>
              <span class="t-small">{STEP_TEXT[s.kind].how}</span>
              {s.text && s.kind !== 'echo' && s.kind !== 'repeat' && <p class="indic" lang={props.lang}>{s.text}</p>}
              {s.kind === 'repeat' && <p class="indic" lang={props.lang}>{s.text}</p>}
              {s.items && (
                <div class={s.kind === 'sounds' ? 'aks' : 'chips'} lang={props.lang}>
                  {s.items.map((x) => (s.kind === 'sounds' ? <span key={x}>{x}</span> : s.kind === 'build' ? <span class="chip indic" key={x}>{splitAks(x, props.lang)}</span> : <span class="chip indic" key={x}>{x}</span>))}
                </div>
              )}
            </div>
            <div class="row" style="gap:6px">
              <span class="pill">{s.minutes} min</span>
              {(s.kind === 'listen' || s.kind === 'talk') && s.text && <Speak text={s.text} lang={props.lang} />}
              {s.kind === 'words' && s.items && <Speak text={s.items.join(', ')} lang={props.lang} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
