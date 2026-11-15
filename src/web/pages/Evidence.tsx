import { useEffect, useState } from 'preact/hooks';
import { api, type Agreement, type GroupStats, type Impact } from '../api';

const fmt = (x: number | null | undefined, d = 2) => (x === null || x === undefined || Number.isNaN(x) ? null : x.toFixed(d));
const pct = (x: number | null | undefined) => (x === null || x === undefined || Number.isNaN(x) ? null : `${Math.round(x * 100)}%`);

/** A number, or the condition it is waiting on. Zero data never shows up as a fake zero. */
function Kpi({ value, label, waiting }: { value: string | number | null; label: string; waiting: string }) {
  return (
    <div class="kpi">
      {value === null ? <b class="t-muted" style="font-size:28px">Waiting</b> : <b>{value}</b>}
      <span>{label}</span>
      {value === null && <span class="t-micro">{waiting}</span>}
    </div>
  );
}

function Group({ name, g, note }: { name: string; g: GroupStats; note: string }) {
  return (
    <div class="card col" style="gap:10px">
      <span class="t-title">{name}</span>
      <span class="t-small">{note}</span>
      <div class="kpis" style="grid-template-columns:repeat(2,minmax(0,1fr))">
        <Kpi value={g.pairs || null} label="children with both checks" waiting="Second checks open 7 days after the first" />
        <Kpi value={g.meanGain === null ? null : `${g.meanGain > 0 ? '+' : ''}${fmt(g.meanGain, 1)}`} label="mean change, correct words a minute" waiting="Needs 1 child with both checks" />
        <Kpi value={g.ci95 ? `${fmt(g.ci95[0], 1)} to ${fmt(g.ci95[1], 1)}` : null} label="95% interval" waiting="Needs 2 or more children" />
        <Kpi value={g.pairs ? `${g.levelMoves.up}/${g.pairs}` : null} label="moved up a reading level" waiting="Needs both checks" />
      </div>
    </div>
  );
}

function AgreementBlock({ a }: { a: Agreement }) {
  return (
    <div class="kpis">
      <Kpi value={a.recordings || null} label="recordings checked blind" waiting="Checks start once children have read" />
      <Kpi value={pct(a.wordAgreement)} label={`of ${a.words} words marked the same`} waiting="Needs 1 checked recording" />
      <Kpi value={pct(a.errorRecall)} label="of the checker's errors that Padh also caught" waiting="Needs a recording with mistakes" />
      <Kpi value={fmt(a.kappa)} label="Cohen's kappa, word by word" waiting="Needs 1 checked recording" />
      <Kpi value={pct(a.errorPrecision)} label="of Padh's error marks the checker agreed with" waiting="Needs a recording with mistakes" />
      <Kpi value={fmt(a.iccPerMinute)} label="ICC(2,1), correct words a minute" waiting="Needs 3 checked recordings" />
    </div>
  );
}

/** Public, live numbers. Everything here is computed from the database on each request. */
export function EvidencePage() {
  const [d, setD] = useState<Impact | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { api.impact().then(setD).catch((e: Error) => setErr(e.message)); }, []);

  if (err) return <div class="error">{err}</div>;
  if (!d) return <div class="muted-box">Counting…</div>;
  const started = d.children > 0;

  return (
    <div class="col" style="gap:28px">
      <div class="app-head"><div>
        <span class="eyebrow"><span class="dot" />Live · computed {new Date(d.updatedAt).toLocaleString()}</span>
        <h1 style="margin-top:10px">What happened, in numbers.</h1>
        <p class="lead" style="margin-top:14px">Only children in real classes with a signed parent form are counted. Demo classes and people trying the site are kept out of every outcome here. <a class="src" href="/api/impact" target="_blank" rel="noopener">Raw numbers as JSON</a></p>
      </div></div>

      {!started && (
        <div class="note"><strong>The school pilot hasn't produced data yet.</strong> This page fills in on its own as children read. We'd rather show "waiting" than a guess.</div>
      )}

      <div class="kpis">
        <div class="kpi card"><b>{d.children}</b><span>children with consent, in {d.classes} class{d.classes === 1 ? '' : 'es'}</span></div>
        <div class="kpi card"><b>{d.childrenAssessed}</b><span>had a full first check</span></div>
        <div class="kpi card"><b>{d.childrenPracticed}</b><span>did at least one practice reading</span></div>
        <div class="kpi card"><b>{d.readings}</b><span>readings scored</span></div>
      </div>

      <section class="reader col">
        <span class="eyebrow"><span class="dot" />Did reading improve, and was it the practice?</span>
        <h3>Two groups, chosen at random, checked twice a week apart.</h3>
        <p class="t-small">Children are placed in the practice or comparison group in random blocks of four within each class and grade. Both groups get the same two checks on different matched passages, and the order of the passages is balanced within each group. The comparison group spends the same time reading storybooks aloud with an adult and starts Padh practice after the second check. Only the first second-check counts; repeats are refused.</p>
        <div class="grid grid-2">
          <Group name="Practice group" g={d.byGroup.practice} note={d.byGroup.practice.medianPracticeReadings !== null ? `Median ${d.byGroup.practice.medianPracticeReadings} practice readings between checks.` : 'Practises with Padh between the checks.'} />
          <Group name="Comparison group" g={d.byGroup.waitlist} note="Storybook time between the checks, no Padh practice." />
        </div>
        {(d.byGroup.practice.belowParagraph.pairs > 0 || d.byGroup.waitlist.belowParagraph.pairs > 0) && (
          <p class="t-small">Children below paragraph level are measured on word or letter lists instead: {d.byGroup.practice.belowParagraph.pairs} in the practice group ({fmt(d.byGroup.practice.belowParagraph.meanGain, 1) ?? '–'} more correct a minute), {d.byGroup.waitlist.belowParagraph.pairs} in the comparison group ({fmt(d.byGroup.waitlist.belowParagraph.meanGain, 1) ?? '–'}).</p>
        )}
        {d.byGroup.minutes.length > 0 && (
          <p class="t-small">Logged adult time: {d.byGroup.minutes.map((m) => `${m.group} group, ${m.kind}: ${m.minutes} minutes with ${m.children} children`).join('; ')}.</p>
        )}
        <div class="muted-box">
          <strong>Difference between groups:</strong>{' '}
          {d.byGroup.difference === null ? 'waiting for both groups to have second checks.' : `${d.byGroup.difference > 0 ? '+' : ''}${fmt(d.byGroup.difference, 1)} correct words a minute in favour of ${d.byGroup.difference >= 0 ? 'practice' : 'the comparison group'}${d.byGroup.differenceCi95 ? ` (95% interval ${fmt(d.byGroup.differenceCi95[0], 1)} to ${fmt(d.byGroup.differenceCi95[1], 1)})` : ''}.`}
          {d.prePost.pairs > 0 && d.prePost.pairs < 30 && ' With fewer than 30 children this is a first look, not a settled result.'}
        </div>
      </section>

      <section class="reader col">
        <span class="eyebrow"><span class="dot" />Can you trust the scoring?</span>
        <h3>A second adult re-scores recordings without seeing Padh's marks.</h3>
        <p class="t-small">Where parents agreed, about one in two recordings is drawn at random, flagged or not, plus every one Padh was unsure about. A different adult from the one who ran the reading marks every word as right, wrong, skipped or not reached, then the recording is deleted. The headline uses the random draws only, and rates are compared only when the checker timed the reading themselves.</p>
        <AgreementBlock a={d.agreement} />
        {d.agreement.bias !== null && (
          <p class="t-small">Padh reads {Math.abs(d.agreement.bias).toFixed(1)} correct words a minute {d.agreement.bias >= 0 ? 'higher' : 'lower'} than the checker on average{d.agreement.limits ? `, with 95% of readings between ${d.agreement.limits[0].toFixed(1)} and ${d.agreement.limits[1].toFixed(1)}` : ''}.</p>
        )}
        {d.agreementFlagged.recordings > 0 && <p class="t-small">On the {d.agreementFlagged.recordings} recordings Padh flagged as unsure, the word agreement was {pct(d.agreementFlagged.wordAgreement)}.</p>}
      </section>

      <section class="reader col">
        <span class="eyebrow"><span class="dot" />Practice texts</span>
        <h3>A model drafts each practice text, and code decides if a child sees it.</h3>
        <p class="t-small">Every draft is checked in code: right script, right length, mostly familiar words, no word that appears only in the check passages, and enough practice of the target letters. Rejected drafts are logged and never shown to a child.</p>
        <div class="kpis">
          <Kpi value={d.practiceDrafts.total || null} label="drafts written" waiting="Starts with the first practice plan" />
          <Kpi value={d.practiceDrafts.total ? d.practiceDrafts.passedChecker : null} label="passed every check" waiting="" />
          <Kpi value={d.publicTries} label="readings by visitors on the try page (not counted above)" waiting="" />
        </div>
      </section>
    </div>
  );
}
