# Padh

Padh (पढ़, "read") is a reading check and practice planner for children in Classes 1 to 5. A teacher or parent opens it on any phone or laptop, and the child reads a short passage aloud in Telugu, Hindi or English. Padh marks every word, finds the aksharas the child misreads, and sets ten minutes of practice at that child's level.

**Reviewing this entry?** [JUDGES.md](JUDGES.md) is a five-minute path through it, with no install and no login.

| | |
|---|---|
| Live app | https://padh.padh-read.workers.dev |
| Evidence, updated live | https://padh.padh-read.workers.dev/#/evidence |
| Demo video | recorded after filing; link added here |
| Pilot plan, committed before any data | [docs/pre-registration.md](docs/pre-registration.md) |

**Status, plainly.** The app is complete. No child had used it when this was submitted. The school pilot starts after submission, and its results appear on the evidence page as they come in, including any that disappoint.

## The problem

- In 2024, 23.4% of Class 3 children in government schools could read a Class 2 text, and 44.8% of Class 5 children could ([ASER 2024, via Millennium Post](https://www.millenniumpost.in/big-stories/aser-2024-reading-arithmetic-skills-improve-among-class-3-and-5-students-led-by-govt-schools-596643)).
- NIPUN Bharat sets 45 to 60 words correct per minute for Class 2 and at least 60 by the end of Class 3 ([NIPUN Bharat targets](https://en.vikaspedia.in/education/policies-and-schemes/nipun-bharat-programme)).

The only way to know where a child stands is to listen to them read, word by word, with a stopwatch. A teacher with forty children rarely has the time, so a child stuck on ళ్ళ or स्कू stays stuck.

## What Padh does differently

Vaachan Samiksha (Gujarat) and IIT Bombay's TARA assess oral reading in schools. Read Along is a practice app. Padh does both for the same child, and adds three things:

1. **Akshara-level diagnosis.** It finds the exact aksharas a child misreads, judged against how often they met them, and builds the next day's practice around them.
2. **Telugu, with open scoring.** The scoring code is MIT-licensed and fully tested, so anyone can audit why a word was marked wrong.
3. **Accuracy checked by people, in public.** A second adult re-scores recordings blind, and the agreement is published on the evidence page as the checks come in.

## How it works

1. **Check.** The child reads into the device. The check starts at a short paragraph and moves up to a story, or down to words and then letters, following the ASER ladder.
2. **Transcribe, verbatim.** ElevenLabs Scribe turns the audio into text and keeps false starts and repeats. It isn't given the passage, so it isn't primed to hear the right words. Its own language model can still smooth over some mistakes, which is exactly what the blind checks measure. Its word timings give the reading time from the first word to the last.
3. **Align** (`src/core/align.ts`).
   - It lines up the transcript against the printed words with a weighted edit distance. Substitution cost falls as two words share more aksharas.
   - It accepts common spelling variants as correct: nukta, ళ్ళ / ళ్ల, nasal conjunct or anusvara.
   - It allows for the recogniser splitting or joining words.
   - It applies oral-reading conventions: repeats and self-corrections are not errors, and words after the child stops are "not reached".
   - An akshara is blamed only when the child's word was a near-miss. A skipped or unrelated word says nothing about any one akshara.
4. **Score** (`src/core/score.ts`). The output is correct items per minute, accuracy, the ASER-style pass rule (8 of 10 letters or words; a paragraph or story with no more than 3 mistakes), and the NIPUN target for Classes 2 and 3.
5. **When unsure, ask a person.** Silence, impossible speed or speech that doesn't match the passage is flagged. During a check, a flagged reading never moves the child up or down. It gets one re-record. After that, an adult who listened sets the level, and the record shows it was set by a person. Silence on the letter list twice counts as "beginner", as in ASER.
6. **Practise at the child's level** (`src/core/practice.ts`).
   - Beginners and letter readers do akshara drills and word building.
   - Word readers read words and short phrases.
   - Paragraph readers get a new passage built around their target aksharas. A language model drafts it from the target words only, never the child's data. `checkPracticeText` then rejects any draft in the wrong script, of the wrong length, below 80% familiar words, using a word that appears only in the two check passages, or too light on the target aksharas.
   - Every draft and verdict is logged.
7. **Blind check.**
   - Where a parent agreed, about one in two recordings is drawn at random (flagged or not), and every flagged one is also kept, for up to 14 days.
   - A second adult, a school teacher and never the one who ran the reading, marks every word as right, wrong, skipped or not reached without seeing Padh's marks, and times the reading.
   - The recording is then deleted.

### The pilot design, enforced in code

- **Groups:** children are placed in a practice group or a storybook comparison group in random blocks of four within each class and grade.
- **Forms:** each child reads form A or form B first, balanced within each group and grade, and the other form at the second check. The server decides each next level, and a check can't be restarted on another day. Forms are matched on aksharas, conjuncts, words and sentences ([docs/passage-review.md](docs/passage-review.md)).
- **Second check:** it opens 7 days after the first, and only the first second-check counts. Readings Padh flagged as unclear are left out of the outcomes.
- **Evidence page:** it reports both groups, the difference between them, practice dose, and agreement with the second adult (word agreement, kappa, error recall and precision, ICC(2,1), Bland-Altman). The analysis was written down before any data in [docs/pre-registration.md](docs/pre-registration.md).

### Built in AgentFoundry

The practice writer is an AgentFoundry agent, with its manifest, prompt and a 13-case eval suite in `.codenow/agent-studio/`. Production uses the same prompt file, and a test fails if they drift apart. See [agentfoundry/README.md](agentfoundry/README.md).

## Privacy and safeguarding

- **No identifiers:** children are known by a nickname. Padh stores no full name, photo, phone number or Aadhaar.
- **Consent:**
  - A teacher adds a child only after a signed parent form (three languages, version-stamped). Padh records the form version and the name of the adult who collected it. The flow was written with the DPDP Act 2023 rules for children's data in mind; it has not been reviewed by a lawyer.
  - The form names who receives what: ElevenLabs gets the audio to transcribe, under its own data terms; Cloudflare Workers AI, running Meta's open Llama model, gets only practice target words.
  - The child is asked first and is never shown a score.
- **Retention:**
  - Most audio is discarded right after scoring. The opt-in check keeps a recording for at most 14 days.
  - Transcripts are blanked after 90 days by a daily job. Readings on the public try page keep no transcript at all.
- **Withdrawal:** a teacher can delete everything about a child in one step when a parent withdraws.
- **Access:** class data needs the class PIN, PINs are stored salted and hashed, and attempts are rate-limited.

## Limits

- Children's speech is harder to recognise than adults'. Until enough blind checks are in, treat any single score as a guide, not a verdict.
- Forms are matched on counts. That does not prove they are equally hard, which is why the order is counterbalanced.
- A week is short. The trial is small and is reported as a feasibility study, not proof of learning gains.
- The passages are original. An earlier version was read by a native speaker. The current matched version has a short list of spots for a second read in [docs/passage-review.md](docs/passage-review.md).
- Padh needs a connection to score. An offline mode that records now and scores later is the next step.

## Run it locally

```bash
npm install
cp .env.example .env.local   # add ELEVENLABS_API_KEY and LLM_API_KEY
node scripts/sync-env.mjs
npx wrangler d1 execute padh --local --file=schema.sql
npx tsx scripts/seed-demo.ts && npx wrangler d1 execute padh --local --file=seed-demo.sql
npm run build && npx wrangler dev
```

Open http://localhost:8787. Tests: `npm test`. Type check: `npm run typecheck`.

## Repository map

```
src/core/      scoring engine shared by server and browser (no network, unit tested)
  text.ts        normalisation, spelling variants, akshara segmentation
  align.ts       word and akshara alignment, oral-reading rules
  score.ts       rates, ASER-style pass rules and levels, NIPUN targets, review flags
  vad.ts         reading-time detection in the browser
  practice.ts    target selection by miss rate, level-based plans, practice-text checker
  stats.ts       kappa, ICC(2,1), bootstrap interval
  passages.ts    36 original passages and word lists, matched across forms
src/worker/    Cloudflare Worker API (Hono, D1): checks, study rules, blind check, evidence
src/web/       Preact app: try page, teacher view, blind check, evidence page, consent form
agentfoundry/  AgentFoundry agent, prompt and evals
docs/          pilot plan and passage review
```

## Licence

MIT. Any state, district or NGO may run its own copy.
