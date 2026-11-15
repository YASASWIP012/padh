# Five minutes with Padh

No install, no login, no microphone needed.

**1. See a scored reading (30 seconds).** Open https://padh.padh-read.workers.dev. In the reader on the right, choose a language and tap "No microphone? Open a sample result". Green words were read correctly, red ones differently, yellow ones skipped. Tap any coloured word to see what was heard and which akshara was missed.

**2. Read it yourself (1 minute, optional).** Choose English and Paragraph, tap the orange button, read the passage aloud and tap again. "What the checker heard" shows the raw transcript, so you can see exactly why each word was marked as it was. Try skipping a word or misreading one.

**3. The teacher's view (1 minute).** Go to Teachers and choose "See the demo class (no sign-in)". The children are made up, the class is read-only, and it is excluded from every public number. You will see:
- each child's random group (practice or comparison)
- their level at the first and second check
- the heatmap of aksharas the class misreads most

**4. The evidence page (1 minute).** Open Evidence. Every number is computed live from the database. Before the pilot produced data it said "Waiting" rather than showing a zero. It reports both groups, the difference between them, and how often a second adult agreed with Padh's marks.

**5. The code (1 minute).**
- `src/core/align.ts` and `src/core/score.ts` hold the scoring rules.
- `checkPracticeText` in `src/core/practice.ts` is where model drafts are rejected.
- `checkRules` in `src/worker/index.ts` enforces the pilot rules.
- `agentfoundry/` holds the agent and its evals.
- `docs/pre-registration.md` was committed before any child data.

## What is not done or not proven yet

- When this was submitted, no child had used Padh. The pilot results are added to the evidence page as they arrive.
- Scoring accuracy on children's voices is measured by the blind checks. It is not claimed in advance.
- The trial is small and short. It is reported as a feasibility study.
