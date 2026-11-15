import { useEffect, useState } from 'preact/hooks';
import { api, type Impact } from '../api';
import { TryPage } from './Try';

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={d} /></svg>
);

export function Landing() {
  const [impact, setImpact] = useState<Impact | null>(null);
  useEffect(() => { api.impact().then(setImpact).catch(() => setImpact(null)); }, []);

  return (
    <>
      <section class="hero hero--split hero-cream" style="padding-bottom:var(--section-y)">
        <div class="container">
          <div>
            <span class="badge"><span class="badge__tag">Pilot</span>Free, open source · school pilot being set up</span>
            <h1 style="margin-top:22px">Hear a child read. Find the <span class="hl">exact letters</span> they stumble on.</h1>
            <p class="lead" style="margin-top:22px">Three in four Class 3 children in government schools can't yet read a Class 2 story. Padh listens to a child read for one minute on any phone, marks every word, finds the letters they stumble on, and plans ten minutes of practice for tomorrow.</p>
            <div class="cta-row">
              <button class="btn btn-candy btn-lg" onClick={() => document.getElementById('try')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Try it now</button>
              <a class="btn btn-outline btn-lg" href="#/teacher">For teachers</a>
            </div>
            <div class="trust"><span>Telugu, Hindi, English</span><span>Nickname only, no child's name stored</span><span><a href="#/evidence" style="text-decoration:underline;text-underline-offset:3px">Every number public</a></span></div>
          </div>
          <div class="stage" id="try" style="scroll-margin-top:96px">
            <TryPage embedded initialLang="en" />
          </div>
        </div>
      </section>

      <section class="section">
        <div class="container">
          <div class="section-head">
            <span class="eyebrow"><span class="dot" />The problem</span>
            <h2>Most children in Class 3 can't yet read a Class 2 story.</h2>
          </div>
          <div class="statline">
            <div class="stat">
              <b>23.4%</b>
              <p>of Class 3 children in government schools could read a Class 2 text in 2024. Three out of four could not.</p>
              <a href="https://www.millenniumpost.in/big-stories/aser-2024-reading-arithmetic-skills-improve-among-class-3-and-5-students-led-by-govt-schools-596643" target="_blank" rel="noopener">ASER 2024, via Millennium Post</a>
            </div>
            <div class="stat">
              <b>60</b>
              <p>words correct per minute is the NIPUN Bharat goal for the end of Class 3. Nobody can tell whether a child is there without listening to them read.</p>
              <a href="https://en.vikaspedia.in/education/policies-and-schemes/nipun-bharat-programme" target="_blank" rel="noopener">NIPUN Bharat targets</a>
            </div>
            <div class="stat">
              <b>44.8%</b>
              <p>of Class 5 children in government schools could read that same Class 2 text. More than half of Class 5 children could not.</p>
              <a href="https://www.millenniumpost.in/big-stories/aser-2024-reading-arithmetic-skills-improve-among-class-3-and-5-students-led-by-govt-schools-596643" target="_blank" rel="noopener">ASER 2024, via Millennium Post</a>
            </div>
          </div>
        </div>
      </section>

      <section class="section section--alt">
        <div class="container stack">
          <div class="split">
            <div>
              <span class="eyebrow"><Icon d="M12 3v12M8 7a4 4 0 0 1 8 0v5a4 4 0 0 1-8 0zM5 11a7 7 0 0 0 14 0M12 18v3" />Listen</span>
              <h3>It listens for the word the child actually said.</h3>
              <p class="lead">The speech recogniser isn't given the passage, so it isn't primed to hear the right words. Padh lines up what it heard against the print, word by word and akshara by akshara, and the blind checks measure any mistakes the recogniser still smooths over.</p>
              <div class="chips"><span class="chip">Akshara-level mistakes</span><span class="chip">Repeats and self-corrections aren't errors</span><span class="chip">Silence trimmed from timing</span></div>
            </div>
            <div class="stage stage--soft">
              <div class="reader" aria-hidden="true">
                <div class="passage indic" lang="te" style="font-size:26px">
                  <span class="w w--correct">రాము</span> <span class="w w--correct">బడికి</span> <span class="w w--substitution">వెళ్లాడు</span> <span class="w w--correct">అక్కడ</span> <span class="w w--omission">పిల్లలు</span> <span class="w w--correct">ఆడుకుంటున్నారు</span>
                </div>
                <div class="aks" style="margin-top:16px" lang="te"><span>ళ్లా</span><span>ల్ల</span></div>
              </div>
            </div>
          </div>
          <div class="split split--flip">
            <div>
              <span class="eyebrow"><Icon d="M4 19h16M4 15l4-4 4 4 8-8" />Practise</span>
              <h3>Ten minutes a day, at the child's own level.</h3>
              <p class="lead">A beginner works on aksharas and building words. A word reader reads words and short phrases. Only a paragraph reader gets a new passage. Code picks the letters each child misreads most often for how often they meet them, a language model drafts the passage, and code checks the draft before a child sees it.</p>
              <div class="chips"><span class="chip">Akshara drills for beginners</span><span class="chip">Word building</span><span class="chip">Echo and repeated reading</span></div>
            </div>
            <div class="stage stage--soft">
              <div class="col" aria-hidden="true">
                {['Listen first', 'Read after me', 'The tricky letters', 'Word ladder', 'Read it three times'].map((s, i) => (
                  <div class="step" key={s}><div class="t-title">{s}</div><span class="pill">{[1, 2, 1, 2, 3][i]} min</span></div>
                ))}
              </div>
            </div>
          </div>
          <div class="split">
            <div>
              <span class="eyebrow"><Icon d="M3 3v18h18M7 15l3-3 3 3 5-6" />Prove</span>
              <h3>Every number is public, including how often a person disagrees with Padh.</h3>
              <p class="lead">A second adult re-scores recordings without seeing Padh's marks. Children are placed at random in a practice group or a storybook comparison group and checked twice, a week apart, on matched passages. All of it is live on the evidence page.</p>
              <div class="row" style="margin-top:20px"><a class="btn btn-ink" href="#/evidence">See the evidence</a></div>
            </div>
            <div class="stage stage--soft">
              <div class="kpis" style="grid-template-columns:repeat(2,minmax(0,1fr))">
                {impact && impact.children > 0 ? (
                  <>
                    <div class="kpi card"><b>{impact.children}</b><span>children with consent</span></div>
                    <div class="kpi card"><b>{impact.readings}</b><span>readings scored</span></div>
                    <div class="kpi card"><b>{impact.prePost.pairs}</b><span>checked twice</span></div>
                    <div class="kpi card"><b>{impact.agreement.recordings}</b><span>re-scored blind by a second adult</span></div>
                  </>
                ) : (
                  <div class="card col" style="grid-column:1/-1;gap:8px">
                    <span class="t-title">The pilot starts after submission.</span>
                    <span class="t-small">No child has used Padh yet. The plan, the groups and the analysis are written down in advance, and results land on the evidence page as they come in.</span>
                    <a class="src" href="https://github.com/YASASWIP012/padh/blob/main/docs/pre-registration.md" target="_blank" rel="noopener">Read the pilot plan</a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="container">
          <div class="section-head"><span class="eyebrow"><span class="dot" />Questions</span><h2>What parents and teachers ask.</h2></div>
          <div class="faq">
            <details><summary>What happens to my child's voice?</summary><p>It goes to ElevenLabs to be turned into text under ElevenLabs' own data terms. Padh scores it and deletes its copy. If a parent agrees, a few recordings are kept for up to 14 days so a second adult can check the scoring, then deleted. Padh never stores a full name, photo, phone number or Aadhaar, and a parent can have everything about their child deleted at any time.</p></details>
            <details><summary>How accurate is it?</summary><p>We don't claim a number we haven't measured. Teachers re-score recordings blind, and the agreement between their marks and ours is published live on the evidence page. When the app isn't sure, it says so and asks a teacher to listen.</p></details>
            <details><summary>How is this different from Vaachan Samiksha, TARA or Read Along?</summary><p>Vaachan Samiksha and TARA are assessment tools run by schools. Read Along is a practice app. Padh joins the two for one child: the check finds the exact aksharas they misread, and the next day's practice is built around them. It works in Telugu, its scoring code is open for anyone to audit, and its accuracy is checked in public by people, not only claimed.</p></details>
            <details><summary>Which languages?</summary><p>Telugu, Hindi and English today. Passages, consent form and child-facing words come in all three. Adding a language means writing passages and a word list; the scoring works for any Indian script.</p></details>
            <details><summary>What does it cost?</summary><p>Nothing for schools or parents. The code is open source under the MIT licence, so any state or NGO can run its own copy.</p></details>
          </div>
        </div>
      </section>

      <section class="section section--alt" style="text-align:center">
        <div class="container col" style="justify-items:center;gap:20px">
          <span class="brandmark" style="width:72px;height:72px;font-size:34px;border-radius:20px;box-shadow:var(--shadow-2)">प</span>
          <h2>Hear a child read. <span class="t-muted">Then help them tomorrow.</span></h2>
          <div class="cta-row" style="margin-top:4px"><a class="btn btn-candy btn-lg" href="#/teacher">Start a class</a><a class="btn btn-outline btn-lg" href="#/consent">Print the consent form</a></div>
        </div>
      </section>
    </>
  );
}
