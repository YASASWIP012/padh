import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Lang, Level, Passage } from '../../core/passages';
import type { AserLevel } from '../../core/score';
import { api, playBase64Wav, type ClassView, type Kind, type ReadResult } from '../api';
import { LANG_LABEL, LEVEL_LABEL, t, u, getUi, setUi, type Ui } from '../i18n';
import { Legend, PassageText, RecordButton, ScoreView } from '../components/Reading';
import { PracticePlan } from '../components/Plan';
import { go } from '../router';
import type { Recording } from '../recorder';

const KEY = 'padh.teacher';
function saved(): { code: string; pin: string } | null {
  try { return JSON.parse(localStorage.getItem(KEY) ?? 'null'); } catch { return null; }
}
function save(v: { code: string; pin: string } | null) {
  try { v ? localStorage.setItem(KEY, JSON.stringify(v)) : localStorage.removeItem(KEY); } catch { /* private mode */ }
}

function UiSwitch() {
  const cur = getUi();
  return (
    <div class="segmented" role="radiogroup" aria-label="Screen language" style="margin-bottom:16px">
      {(['en', 'te', 'hi'] as Ui[]).map((l) => <button key={l} role="radio" aria-checked={cur === l} aria-pressed={cur === l} class={l !== 'en' ? 'indic' : ''} onClick={() => setUi(l)}>{LANG_LABEL[l]}</button>)}
    </div>
  );
}

export function TeacherPage({ sub }: { sub: string[] }) {
  return <><UiSwitch /><TeacherInner sub={sub} /></>;
}

function TeacherInner({ sub }: { sub: string[] }) {
  const [auth, setAuth] = useState(saved());
  const [cls, setCls] = useState<ClassView | null>(null);
  const [err, setErr] = useState('');

  const load = () => {
    if (!auth) return;
    api.getClass(auth.code, auth.pin).then(setCls).catch((e: Error) => { setErr(e.message); setAuth(null); save(null); });
  };
  useEffect(load, [auth?.code]);

  if (!auth) return <SignIn onIn={(a) => { save(a); setAuth(a); }} err={err} />;
  if (!cls) return <div class="muted-box">Loading your class…</div>;

  const [view, id, kind] = sub;
  if (view === 'child' && id) {
    const child = cls.children.find((c) => c.id === id);
    if (!child) return <div class="error">Child not found.</div>;
    return <Assess cls={cls} pin={auth.pin} childId={id} nickname={child.nickname} grade={child.grade} lang={child.lang} arm={child.arm} formOrder={child.form_order ?? 'AB'} kind={(kind as Kind) ?? 'pre'} onDone={load} />;
  }
  if (view === 'check') return <BlindCheck auth={auth} onDone={load} />;
  return <Dashboard cls={cls} auth={auth} reload={load} onOut={() => { save(null); setAuth(null); setCls(null); }} />;
}

function SignIn({ onIn, err }: { onIn: (a: { code: string; pin: string }) => void; err: string }) {
  const [mode, setMode] = useState<'in' | 'new'>('in');
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [lang, setLang] = useState<Lang>('te');
  const [msg, setMsg] = useState(err);
  const [made, setMade] = useState<string | null>(null);

  async function submit(e: Event) {
    e.preventDefault();
    setMsg('');
    try {
      if (mode === 'new') {
        const r = await api.createClass({ name, lang, pin });
        setMade(r.code);
      } else {
        await api.getClass(code.trim().toUpperCase(), pin);
        onIn({ code: code.trim().toUpperCase(), pin });
      }
    } catch (e2) {
      setMsg((e2 as Error).message);
    }
  }

  if (made) {
    return (
      <div class="reader col" style="max-width:520px">
        <span class="eyebrow"><span class="dot" />Class ready</span>
        <h2 style="font-size:32px">Your class code is <span class="t-mono">{made}</span>.</h2>
        <p class="t-small">Write it down with your PIN. You need both to open the class on any phone.</p>
        <button class="btn btn-candy" onClick={() => onIn({ code: made, pin })}>Open the class</button>
      </div>
    );
  }

  return (
    <form class="reader col" style="max-width:520px" onSubmit={submit}>
      <button type="button" class="btn btn-candy" onClick={() => onIn({ code: 'DEMO01', pin: '0000' })}>{u('demo')}</button>
      <p class="t-small">The demo class is read-only. Its children are made up and never counted on the evidence page.</p>
      <div class="segmented">
        <button type="button" aria-pressed={mode === 'in'} onClick={() => setMode('in')}>{u('openClass')}</button>
        <button type="button" aria-pressed={mode === 'new'} onClick={() => setMode('new')}>{u('newClass')}</button>
      </div>
      {mode === 'new' ? (
        <>
          <div class="field"><label for="n">Class name</label><input id="n" class="input" value={name} onInput={(e) => setName(e.currentTarget.value)} placeholder="Class 3, Government Primary School" required /></div>
          <div class="field"><label for="l">Main reading language</label>
            <select id="l" class="input" value={lang} onChange={(e) => setLang(e.currentTarget.value as Lang)}>
              {(['te', 'hi', 'en'] as Lang[]).map((l) => <option key={l} value={l}>{LANG_LABEL[l]}</option>)}
            </select>
          </div>
        </>
      ) : (
        <div class="field"><label for="c">Class code</label><input id="c" class="input t-mono" value={code} onInput={(e) => setCode(e.currentTarget.value)} placeholder="K7M2QX" autocomplete="off" required /></div>
      )}
      <div class="field"><label for="p">{mode === 'new' ? 'Choose a PIN (4 to 8 digits)' : 'PIN'}</label>
        <input id="p" class="input t-mono" inputMode="numeric" pattern="\d{4,8}" value={pin} onInput={(e) => setPin(e.currentTarget.value)} required /></div>
      {msg && <div class="error">{msg}</div>}
      <button class="btn btn-ink" type="submit">{mode === 'new' ? 'Create class' : 'Open class'}</button>
    </form>
  );
}

const ORDER: AserLevel[] = ['beginner', 'letter', 'word', 'para', 'story'];

function Dashboard({ cls, auth, reload, onOut }: { cls: ClassView; auth: { code: string; pin: string }; reload: () => void; onOut: () => void }) {
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  async function remove(id: string) {
    await api.withdraw(auth.code, auth.pin, id);
    setRemoving(null);
    reload();
  }

  const rows = useMemo(() => cls.children.map((c) => {
    const mine = cls.sessions.filter((s) => s.child_id === c.id);
    const pre = mine.find((s) => s.kind === 'pre' && s.final_level);
    const post = [...mine].reverse().find((s) => s.kind === 'post' && s.final_level);
    const preW = mine.find((s) => s.kind === 'pre' && s.wcpm !== null)?.wcpm ?? null;
    const postW = [...mine].reverse().find((s) => s.kind === 'post' && s.wcpm !== null)?.wcpm ?? null;
    const practice = mine.filter((s) => s.kind === 'practice').length;
    return { c, pre, post, preW, postW, practice };
  }), [cls]);

  const heat = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of cls.sessions) for (const [ak, n] of Object.entries(JSON.parse(s.missed) as Record<string, number>)) m.set(ak, (m.get(ak) ?? 0) + n);
    const list = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 16);
    const max = list[0]?.[1] ?? 1;
    return list.map(([ak, n]) => ({ ak, n, a: 0.15 + 0.85 * (n / max) }));
  }, [cls]);

  return (
    <div class="col" style="gap:24px">
      {cls.demo && <div class="note"><strong>Demo class.</strong> These children are made up so you can see the teacher view. It is read-only and excluded from every public number.</div>}
      <div class="app-head">
        <div>
          <span class="eyebrow"><span class="dot" />{u('classCode')} <span class="t-mono">{cls.code}</span></span>
          <h1 style="margin-top:10px">{cls.name}</h1>
        </div>
        <div class="row">
          {cls.toCheck > 0 && <button class="btn btn-outline" onClick={() => go('/teacher/check')}>{u('checkRecordings')} ({cls.toCheck})</button>}
          {!cls.demo && <button class="btn btn-candy" onClick={() => setAdding(true)}>{u('addChild')}</button>}
          <button class="btn btn-ghost btn-sm" onClick={onOut}>{u('signOut')}</button>
        </div>
      </div>

      {adding && <AddChild auth={auth} lang={cls.lang} onDone={() => { setAdding(false); reload(); }} onCancel={() => setAdding(false)} />}

      {cls.children.length === 0 ? (
        <div class="reader col">
          <h3>Start with one child.</h3>
          <p class="t-small">Add a child once a parent has signed the consent form. Then run the first reading check. It takes about 3 minutes.</p>
          <a class="src" href="#/consent">Print the parent consent form</a>
          <p class="t-small">Each child is placed at random in the practice group or the waitlist group. Both groups get the same two checks a week apart. The waitlist group starts practice after the second check.</p>
        </div>
      ) : (
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>{u('child')}</th><th>{u('cls')}</th><th>{u('group')}</th><th>{u('firstCheck')}</th><th>{u('practiceDays')}</th><th>{u('secondCheck')}</th><th /></tr></thead>
            <tbody>
              {rows.map(({ c, pre, post, preW, postW, practice }) => (
                <tr key={c.id}>
                  <td><strong>{c.nickname}</strong><br /><span class="t-micro indic">{LANG_LABEL[c.lang]}</span></td>
                  <td>{c.grade}</td>
                  <td><span class={`pill ${c.arm === 'practice' ? 'pill--accent' : ''}`} title={c.arm === 'waitlist' ? 'Practice starts after the second check' : 'Practises between the checks'}>{c.arm === 'practice' ? u('practiceNow') : u('waitlist')}</span></td>
                  <td>{pre ? <span class="pill">{LEVEL_LABEL[pre.final_level!]}{preW !== null ? ` · ${preW} wcpm` : ''}</span> : <span class="t-micro">{u('notYet')}</span>}</td>
                  <td><span class="t-mono">{practice}</span></td>
                  <td>{post ? <span class={`pill ${ORDER.indexOf(post.final_level!) > ORDER.indexOf(pre?.final_level ?? 'beginner') || (postW ?? 0) > (preW ?? 0) ? 'pill--ok' : ''}`}>{LEVEL_LABEL[post.final_level!]}{postW !== null ? ` · ${postW} wcpm` : ''}</span> : <span class="t-micro">{u('after7')}</span>}</td>
                  <td style="text-align:right"><div class="row" style="justify-content:flex-end;gap:6px">
                    {!pre && !cls.demo && <button class="btn btn-ink btn-sm" onClick={() => go(`/teacher/child/${c.id}/pre`)}>{u('firstCheck')}</button>}
                    {pre && !cls.demo && (c.arm === 'practice' || post) && <button class="btn btn-outline btn-sm" onClick={() => go(`/teacher/child/${c.id}/practice`)}>{u('practise')}</button>}
                    {pre && !post && !cls.demo && <> <button class="btn btn-ghost btn-sm" disabled={Date.now() - pre.created_at < cls.minGapDays * 86_400_000} title={`Opens ${cls.minGapDays} days after the first check`} onClick={() => go(`/teacher/child/${c.id}/post`)}>{u('secondCheck')}</button></>}
                    {!cls.demo && pre && !post && <> <button class="btn btn-ghost btn-sm" title="Log 10 minutes of adult time today" onClick={async () => { await api.logMinutes(auth.code, auth.pin, c.id, c.arm === 'practice' ? 'practice' : 'storybook', 10); reload(); }}>+10 min {c.arm === 'practice' ? 'practice' : 'storybook'}</button></>}
                    {!cls.demo && (removing === c.id
                      ? <> <button class="btn btn-sm" style="background:var(--miss);color:#fff" onClick={() => remove(c.id)}>Delete all of {c.nickname}'s data</button> <button class="btn btn-ghost btn-sm" onClick={() => setRemoving(null)}>Keep</button></>
                      : <> <button class="btn btn-ghost btn-sm" title="Parent withdrew consent" onClick={() => setRemoving(c.id)}>{u('withdraw')}</button></>)}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {heat.length > 0 && (
        <div class="reader col">
          <span class="eyebrow"><span class="dot" />Letters this class trips on most</span>
          <p class="t-small">Darker means more misses across the class. A good place to start a whole-class lesson.</p>
          <div class="heat" lang={cls.lang}>
            {heat.map((h) => (
              <span key={h.ak} style={{ background: `color-mix(in oklab,var(--accent) ${Math.round(h.a * 100)}%,var(--surface))`, color: h.a > 0.6 ? 'var(--on-accent)' : 'var(--ink)' }}>{h.ak}<small>{h.n}</small></span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AddChild({ auth, lang, onDone, onCancel }: { auth: { code: string; pin: string }; lang: Lang; onDone: () => void; onCancel: () => void }) {
  const [nickname, setNick] = useState('');
  const [grade, setGrade] = useState(3);
  const [l, setL] = useState<Lang>(lang);
  const [consent, setConsent] = useState(false);
  const [keepAudio, setKeep] = useState(false);
  const [witness, setWitness] = useState('');
  const [err, setErr] = useState('');
  const [arm, setArm] = useState<string | null>(null);

  async function submit(e: Event) {
    e.preventDefault();
    try {
      const r = await api.addChild(auth.code, auth.pin, { nickname, grade, lang: l, consent, keepAudio, witness });
      setArm(r.arm);
    } catch (e2) { setErr((e2 as Error).message); }
  }

  if (arm) {
    return (
      <div class="reader col">
        <h3>{nickname} is in the {arm === 'practice' ? 'practice' : 'waitlist'} group.</h3>
        <p class="t-small">{arm === 'practice'
          ? 'They practise between the first and second check.'
          : 'They get the same two checks, then start practice after the second one. Comparing the two groups shows whether practice, not just a week of school, made the difference.'}</p>
        <div class="row"><button class="btn btn-ink" onClick={onDone}>Done</button></div>
      </div>
    );
  }

  return (
    <form class="reader col" onSubmit={submit}>
      <h3>Add a child</h3>
      <div class="grid grid-3">
        <div class="field"><label for="nn">Nickname (not the full name)</label><input id="nn" class="input" placeholder="e.g. Blue Kite" value={nickname} onInput={(e) => setNick(e.currentTarget.value)} required maxLength={40} /></div>
        <div class="field"><label for="gg">Class</label>
          <select id="gg" class="input" value={grade} onChange={(e) => setGrade(Number(e.currentTarget.value))}>{[1, 2, 3, 4, 5].map((g) => <option key={g} value={g}>Class {g}</option>)}</select></div>
        <div class="field"><label for="ll">Reads in</label>
          <select id="ll" class="input" value={l} onChange={(e) => setL(e.currentTarget.value as Lang)}>{(['te', 'hi', 'en'] as Lang[]).map((x) => <option key={x} value={x}>{LANG_LABEL[x]}</option>)}</select></div>
      </div>
      <div class="field"><label for="ww">Adult who collected the signed form</label><input id="ww" class="input" value={witness} onInput={(e) => setWitness(e.currentTarget.value)} placeholder="Teacher's name" required maxLength={60} /></div>
      <label class="check"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.currentTarget.checked)} />A parent or guardian has signed the consent form, and I have it.</label>
      <label class="check"><input type="checkbox" checked={keepAudio} onChange={(e) => setKeep(e.currentTarget.checked)} />The parent also agreed that a few recordings may be kept for up to 14 days so a teacher can check the scoring.</label>
      {err && <div class="error">{err}</div>}
      <div class="row"><button class="btn btn-candy" type="submit" disabled={!consent || !witness.trim()}>Add child</button><button class="btn btn-ghost" type="button" onClick={onCancel}>Cancel</button></div>
    </form>
  );
}

const LADDER: Level[] = ['letter', 'word', 'para', 'story'];

/** The adaptive check: start at the paragraph, move up to the story or down to words and letters. */
function Assess(p: { cls: ClassView; pin: string; childId: string; nickname: string; grade: number; lang: Lang; arm: string; formOrder: string; kind: Kind; onDone: () => void }) {
  const isCheck = p.kind === 'pre' || p.kind === 'post';
  const [level, setLevel] = useState<Level>(p.kind === 'practice' ? practiceLevel(p) : 'para');
  const [passage, setPassage] = useState<Passage | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ReadResult | null>(null);
  const [shown, setShown] = useState(false);
  const [tested, setTested] = useState<Level[]>([]);
  const [final, setFinal] = useState<AserLevel | null>(null);
  const [runner, setRunner] = useState(() => { try { return localStorage.getItem('padh.runner') ?? ''; } catch { return ''; } });
  const [err, setErr] = useState('');
  // Which form this child reads first was assigned at random; the server enforces the same order.
  const form = p.kind === 'pre' ? p.formOrder[0] : p.kind === 'post' ? p.formOrder[1] : 'C';

  useEffect(() => { setResult(null); setShown(false); api.passage(p.lang, level, form).then(setPassage).catch((e: Error) => setErr(e.message)); }, [level]);

  async function done(r: Recording) {
    setBusy(true); setErr('');
    try {
      try { localStorage.setItem('padh.runner', runner); } catch { /* private mode */ }
      const res = await api.read(r.blob, { lang: p.lang, level, kind: p.kind, speechSeconds: r.speechSeconds, childId: p.childId, pin: p.pin, runner });
      setResult(res);
      setTested((t0) => [...t0, level]);
      if (isCheck && 'final' in res.step) setFinal(res.step.final);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  const step = result?.step;
  const next = step && isCheck && 'next' in step ? step.next : null;
  const retry = step && 'retry' in step;
  const review = step && 'review' in step;

  return (
    <div class="col" style="gap:20px">
      <a class="back" href="#/teacher">← {p.cls.name}</a>
      <div class="app-head">
        <div>
          <span class="eyebrow"><span class="dot" />{p.kind === 'pre' ? 'First check' : p.kind === 'post' ? 'Second check' : 'Practice reading'}</span>
          <h1 style="margin-top:10px">{p.nickname}, class {p.grade}</h1>
        </div>
        {isCheck && (
          <div class="ladder" style="min-width:min(100%,420px)">
            {LADDER.map((l) => <span key={l} class={l === level && !final ? 'on' : tested.includes(l) ? 'done' : ''}>{LEVEL_LABEL[l]}</span>)}
          </div>
        )}
      </div>

      {!result && tested.length === 0 && (
        <div class="muted-box col" style="gap:10px">
          <span>Before you start, ask the child: "Would you like to read for me?" If they say no or seem upset, stop. Their result is never shown to them as a score.</span>
          <div class="field" style="max-width:360px"><label for="rn">Adult running this reading</label><input id="rn" class="input" value={runner} onInput={(e) => setRunner(e.currentTarget.value)} placeholder="Your name" /></div>
        </div>
      )}

      <div class="reader col" style="gap:22px">
        <span class="eyebrow indic" lang={p.lang}><span class="dot" />{t('readThis', p.lang)}</span>
        {passage ? <PassageText passage={passage} words={shown ? result?.score.alignment.words : undefined} /> : <div class="muted-box">Loading…</div>}
        {!result && <RecordButton lang={p.lang} onDone={done} disabled={busy || !passage || !runner.trim()} maxSeconds={level === 'story' ? 90 : 60} />}
        <div aria-live="polite">
          {busy && <div class="muted-box indic" lang={p.lang}>{t('checking', p.lang)}</div>}
          {err && <div class="error">{err}</div>}
        </div>
        {result && !shown && (
          <div class="col" style="gap:12px">
            <p class="indic t-title" lang={p.lang}>{t('wellDone', p.lang)}</p>
            <div class="row">
              {next && <button class="btn btn-candy" onClick={() => setLevel(next)}>Next: {LEVEL_LABEL[next]}</button>}
              {retry && <button class="btn btn-candy" onClick={() => setResult(null)}>{u('recordAgain')}</button>}
              <button class="btn btn-outline" onClick={() => setShown(true)}>{u('showResult')}</button>
            </div>
            {retry && <p class="t-small">Padh wasn't sure about that recording, so it doesn't count yet. You can record it once more.</p>}
            {review && <SetLevel p={p} />}
          </div>
        )}
        {result && shown && <><Legend /><ScoreView score={result.score} grade={p.grade} /></>}
        {result && shown && (
          <div class="row">
            {next && <button class="btn btn-candy" onClick={() => setLevel(next)}>Next: {LEVEL_LABEL[next]}</button>}
            {retry && <button class="btn btn-candy" onClick={() => setResult(null)}>{u('recordAgain')}</button>}
            {!isCheck && <button class="btn btn-ink" onClick={() => { setResult(null); setShown(false); }}>Read it again</button>}
          </div>
        )}
      </div>

      {final && (
        <div class="reader col">
          <span class="eyebrow"><span class="dot" />Result, for adults</span>
          <h2 style="font-size:clamp(28px,3.4vw,40px)">{p.nickname} reads at the <span class="hl">{LEVEL_LABEL[final].toLowerCase()}</span> level.</h2>
          <p class="t-small">An ASER-style ladder: letters, words, a short paragraph, then a story.</p>
          <div class="row"><button class="btn btn-ink" onClick={() => { p.onDone(); go('/teacher'); }}>{u('nextChild')}</button></div>
        </div>
      )}

      {(final || (!isCheck && result)) && (p.arm === 'practice' || p.kind !== 'pre') && (
        <div class="reader"><PracticePlan lang={p.lang} level={final ?? practiceFinal(p)} childId={p.childId} pin={p.pin} /></div>
      )}
      {final && p.kind === 'pre' && p.arm === 'waitlist' && (
        <div class="muted-box">{p.nickname} is in the comparison group. Until the second check in {p.cls.minGapDays} days, spend the same 10 minutes a day reading a storybook aloud together. Padh practice starts after the second check.</div>
      )}
    </div>
  );
}

/** After Padh gives up on a reading, an adult who listened sets the level. It is stored as set by a person. */
function SetLevel({ p }: { p: { cls: ClassView; pin: string; childId: string; kind: Kind } }) {
  const [lvl, setLvl] = useState<AserLevel>('letter');
  const [by, setBy] = useState('');
  const [msg, setMsg] = useState('');
  if (p.kind !== 'pre' && p.kind !== 'post') return <p class="note">Padh still isn't sure about this reading, so it doesn't count.</p>;
  return (
    <div class="note col" style="gap:10px">
      <span>Padh still isn't sure, so it won't guess a level. If you listened to the child read, set the level yourself. It is marked as set by a person on every report.</span>
      <div class="row">
        <select class="input" style="max-width:200px" value={lvl} onChange={(e) => setLvl(e.currentTarget.value as AserLevel)}>
          {(['beginner', 'letter', 'word', 'para', 'story'] as AserLevel[]).map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
        </select>
        <input class="input" style="max-width:220px" placeholder="Your name" value={by} onInput={(e) => setBy(e.currentTarget.value)} />
        <button class="btn btn-ink btn-sm" disabled={!by.trim()} onClick={async () => {
          try {
            await fetch(`/api/class/${p.cls.code}/child/${p.childId}/level`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-pin': p.pin }, body: JSON.stringify({ kind: p.kind, level: lvl, by }) }).then((r) => { if (!r.ok) throw new Error(); });
            setMsg('Saved.');
          } catch { setMsg('Could not save. Try again.'); }
        }}>Save level</button>
      </div>
      {msg && <span class="t-small">{msg}</span>}
    </div>
  );
}

function practiceFinal(p: { cls: ClassView; childId: string }): AserLevel {
  const done = p.cls.sessions.filter((s) => s.child_id === p.childId && s.final_level);
  return (done[done.length - 1]?.final_level ?? 'para') as AserLevel;
}

function practiceLevel(p: { cls: ClassView; childId: string }): Level {
  const f = practiceFinal(p);
  return f === 'beginner' ? 'letter' : f;
}

const MARK_LABEL: Record<string, string> = { correct: 'Right', error: 'Wrong', skipped: 'Skipped', not_reached: 'Not reached' };
const MARK_CLASS: Record<string, string> = { correct: 'w--correct', error: 'w--substitution', skipped: 'w--omission', not_reached: 'w--not_reached' };

/**
 * A second adult hears a recording and marks every printed word, starting from
 * nothing marked, without seeing the machine's marks. The adult who ran the
 * reading cannot check it.
 */
function BlindCheck({ auth, onDone }: { auth: { code: string; pin: string }; onDone: () => void }) {
  const [item, setItem] = useState<{ sessionId: string; runner: string; lang: Lang; words: string[]; mime: string; audio: string } | null>(null);
  const [marks, setMarks] = useState<(string | null)[]>([]);
  const [tool, setTool] = useState<string>('correct');
  const [checker, setChecker] = useState(() => { try { return localStorage.getItem('padh.checker') ?? ''; } catch { return ''; } });
  const [secs, setSecs] = useState('');
  const [done, setDone] = useState(false);
  const [n, setN] = useState(0);
  const [err, setErr] = useState('');

  const load = () => api.nextCheck(auth.code, auth.pin).then((r) => {
    if (r.done || !r.sessionId) { setDone(true); return; }
    setItem({ sessionId: r.sessionId, runner: r.runner ?? '', lang: r.lang ?? 'en', words: r.words!, mime: r.mime!, audio: r.audio! });
    setMarks(r.words!.map(() => null));
    setSecs('');
  }).catch((e: Error) => setErr(e.message));
  useEffect(() => { void load(); }, []);

  const left = marks.filter((m) => m === null).length;

  async function submit() {
    if (!item) return;
    setErr('');
    try {
      try { localStorage.setItem('padh.checker', checker); } catch { /* private mode */ }
      await api.submitCheck(auth.code, auth.pin, { sessionId: item.sessionId, marks: marks as string[], checker, seconds: secs ? Number(secs) : undefined });
      setN((x) => x + 1);
      setItem(null);
      void load();
    } catch (e) { setErr((e as Error).message); }
  }

  return (
    <div class="col" style="gap:20px">
      <a class="back" href="#/teacher" onClick={onDone}>← Back to the class</a>
      <div class="app-head"><div>
        <span class="eyebrow"><span class="dot" />Blind check · {n} done</span>
        <h1 style="margin-top:10px">Listen and mark every word.</h1>
        <p class="lead" style="margin-top:12px">You won't see Padh's marks. Pick a mark, then tap the words it applies to. Your marks are compared with Padh's on the public evidence page, and the recording is deleted when you save.</p>
      </div></div>
      {err && <div class="error">{err}</div>}
      {done && <div class="reader"><h3>Nothing left to check.</h3><p class="t-small" style="margin-top:8px">New recordings appear here as children read.</p></div>}
      {item && (
        <div class="reader col" style="gap:20px">
          <div class="grid grid-2">
            <div class="field"><label for="ck">Your name (checker)</label><input id="ck" class="input" value={checker} onInput={(e) => setChecker(e.currentTarget.value)} placeholder="Not the adult who ran the reading" /></div>
            <div class="field"><label for="sc">Reading time you measured, in seconds</label><input id="sc" class="input t-mono" inputMode="decimal" value={secs} onInput={(e) => setSecs(e.currentTarget.value)} placeholder="From first word to last word" /></div>
          </div>
          {item.runner && <p class="t-small">This reading was run by {item.runner}. A different adult should check it.</p>}
          <div class="row"><button class="btn btn-ink" onClick={() => playBase64Wav(item.audio, item.mime)}>Play the recording</button><span class="t-small">Play it as many times as you like.</span></div>
          <div class="segmented" role="radiogroup" aria-label="Mark to apply">
            {Object.keys(MARK_LABEL).map((k) => <button key={k} role="radio" aria-checked={tool === k} aria-pressed={tool === k} onClick={() => setTool(k)}>{MARK_LABEL[k]}</button>)}
          </div>
          <div class="passage indic" lang={item.lang} style="font-size:26px">
            {item.words.map((w, i) => (
              <span key={i}>
                <button class={`w ${marks[i] ? MARK_CLASS[marks[i]!] : ''}`} style={`all:unset;cursor:pointer;padding:2px 6px;border-radius:6px;${marks[i] ? '' : 'box-shadow:inset 0 0 0 1px var(--line-2)'}`}
                  aria-label={`${w}: ${marks[i] ? MARK_LABEL[marks[i]!] : 'not marked'}`}
                  onClick={() => setMarks((m) => m.map((x, j) => (j === i ? (x === tool ? null : tool) : x)))}>{w}</button>{' '}
              </span>
            ))}
          </div>
          <div class="row">
            <button class="btn btn-candy" disabled={left > 0 || !checker.trim() || !(Number(secs) > 0)} onClick={submit}>{left > 0 ? `${left} word${left > 1 ? 's' : ''} not marked yet` : 'Save and delete the recording'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
