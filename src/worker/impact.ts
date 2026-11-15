import { bootstrapDiffCI, bootstrapMeanCI, cohenKappa, icc21, mean, median } from '../core/stats';
import type { WordResult } from '../core/align';

const ORDER = ['beginner', 'letter', 'word', 'para', 'story'];

interface Row {
  id: string;
  child_id: string;
  kind: string;
  level: string;
  wcpm: number | null;
  correct: number;
  speech_seconds: number;
  final_level: string | null;
  words: string;
  review: string;
  created_at: number;
  arm?: string;
}

/**
 * Everything on the public evidence page comes from here. Only children in real
 * (non-demo) classes with consent on file are counted. Practice and "try it"
 * readings are reported separately and never mixed into outcomes.
 */
export async function computeImpact(db: D1Database) {
  const real = `JOIN children ch ON ch.id = s.child_id JOIN classes cl ON cl.id = ch.class_id AND cl.is_demo = 0`;
  const rows = (await db.prepare(`SELECT s.*, ch.arm FROM sessions s ${real} ORDER BY s.created_at`).all<Row & { arm: string }>()).results;
  const counts = await db.prepare(
    `SELECT (SELECT COUNT(*) FROM children ch JOIN classes cl ON cl.id = ch.class_id AND cl.is_demo = 0) AS children,
            (SELECT COUNT(DISTINCT cl.id) FROM classes cl JOIN children ch ON ch.class_id = cl.id WHERE cl.is_demo = 0) AS classes,
            (SELECT COUNT(*) FROM sessions WHERE kind = 'try') AS tries,
            (SELECT COUNT(*) FROM drafts) AS drafts,
            (SELECT COUNT(*) FROM drafts WHERE ok = 1) AS draftsOk`,
  ).first<Record<string, number>>();

  // Logged adult time per group, so the comparison group's storybook time can be checked against practice time.
  const act = (await db.prepare(`SELECT ch.arm AS arm, a.kind AS kind, SUM(a.minutes) AS m, COUNT(DISTINCT a.child_id) AS kids FROM activity a JOIN children ch ON ch.id = a.child_id JOIN classes cl ON cl.id = ch.class_id AND cl.is_demo = 0 GROUP BY ch.arm, a.kind`).all<{ arm: string; kind: string; m: number; kids: number }>()).results;
  const activity = act.map((r) => ({ group: r.arm === 'waitlist' ? 'comparison' : 'practice', kind: r.kind, minutes: r.m, children: r.kids }));

  const draftsByLang = (await db.prepare('SELECT lang, COUNT(*) AS total, SUM(ok) AS passed FROM drafts GROUP BY lang').all<{ lang: string; total: number; passed: number }>()).results;

  const byChild = new Map<string, Row[]>();
  for (const r of rows) byChild.set(r.child_id, [...(byChild.get(r.child_id) ?? []), r]);

  // Pre and post use different passages of matched difficulty (forms A and B).
  // Only the first reading of each kind counts; the server refuses repeats, and
  // this guards the numbers even if a repeat ever slips in.
  const arms = { practice: { gains: [] as number[], lowGains: [] as number[], up: 0, same: 0, down: 0, dose: [] as number[] }, waitlist: { gains: [] as number[], lowGains: [] as number[], up: 0, same: 0, down: 0, dose: [] as number[] } };
  let assessed = 0;
  let practiced = 0;
  for (const list of byChild.values()) {
    const arm = list[0].arm === 'waitlist' ? arms.waitlist : list[0].arm === 'practice' ? arms.practice : null;
    if (!arm) continue;
    const preFinal = list.find((r) => r.kind === 'pre' && r.final_level);
    const postFinal = list.find((r) => r.kind === 'post' && r.final_level);
    if (preFinal) assessed++;
    const beforePost = list.filter((r) => r.kind === 'practice' && (!postFinal || r.created_at < postFinal.created_at)).length;
    if (beforePost > 0 || list.some((r) => r.kind === 'practice')) practiced++;
    if (preFinal && postFinal) {
      arm.dose.push(beforePost);
      const d = ORDER.indexOf(postFinal.final_level!) - ORDER.indexOf(preFinal.final_level!);
      if (d > 0) arm.up++; else if (d < 0) arm.down++; else arm.same++;
      let paired = false;
      for (const lvl of ['story', 'para']) {
        const pre = list.find((r) => r.kind === 'pre' && r.level === lvl && r.wcpm !== null && r.review === '[]');
        const post = list.find((r) => r.kind === 'post' && r.level === lvl && r.wcpm !== null && r.review === '[]');
        if (pre && post) { arm.gains.push(post.wcpm! - pre.wcpm!); paired = true; break; }
      }
      // Children below paragraph level: correct items a minute on the same word or letter list.
      if (!paired) {
        for (const lvl of ['word', 'letter']) {
          const pre = list.find((r) => r.kind === 'pre' && r.level === lvl && r.wcpm !== null && r.review === '[]');
          const post = list.find((r) => r.kind === 'post' && r.level === lvl && r.wcpm !== null && r.review === '[]');
          if (pre && post) { arm.lowGains.push(post.wcpm! - pre.wcpm!); break; }
        }
      }
    }
  }
  const summarise = (a: typeof arms.practice) => ({
    pairs: a.gains.length,
    meanGain: a.gains.length ? mean(a.gains) : null,
    medianGain: a.gains.length ? median(a.gains) : null,
    ci95: a.gains.length >= 2 ? bootstrapMeanCI(a.gains) : null,
    levelMoves: { up: a.up, same: a.same, down: a.down },
    medianPracticeReadings: a.dose.length ? median(a.dose) : null,
    belowParagraph: { pairs: a.lowGains.length, meanGain: a.lowGains.length ? mean(a.lowGains) : null },
  });
  const gains = [...arms.practice.gains, ...arms.waitlist.gains];
  const levelMoves = { up: arms.practice.up + arms.waitlist.up, same: arms.practice.same + arms.waitlist.same, down: arms.practice.down + arms.waitlist.down };
  const practiceArm = summarise(arms.practice);
  const waitlistArm = summarise(arms.waitlist);

  // Machine vs a second adult, on recordings they scored without seeing our marks.
  // The human decides which words were attempted, so the machine's view never leaks into the comparison.
  const checks = (await db.prepare(
    `SELECT s.words, s.correct, s.speech_seconds, s.level, s.wcpm, r.marks, r.human_seconds, r.flagged, r.random_pick FROM rescores r JOIN sessions s ON s.id = r.session_id ${real}`,
  ).all<{ words: string; correct: number; speech_seconds: number; level: string; wcpm: number | null; marks: string; human_seconds: number | null; flagged: number; random_pick: number }>()).results;
  const agreementFor = (subset: typeof checks) => {
    const mWord: boolean[] = [];
    const hWord: boolean[] = [];
    let tp = 0, fp = 0, fn = 0;
    const mRate: number[] = [];
    const hRate: number[] = [];
    for (const ck of subset) {
      const words = JSON.parse(ck.words) as WordResult[];
      const marks = JSON.parse(ck.marks) as string[];
      let humanCorrect = 0;
      words.forEach((w, i) => {
        const h = marks[i];
        if (h === 'correct') humanCorrect++;
        if (!h || h === 'not_reached') return;
        const machineOk = w.status === 'correct';
        const humanOk = h === 'correct';
        mWord.push(machineOk);
        hWord.push(humanOk);
        if (!humanOk && !machineOk) tp++;
        if (humanOk && !machineOk) fp++;
        if (!humanOk && machineOk) fn++;
      });
      // Rates are compared only when the checker timed the reading themselves, so the machine's timing never leaks in.
      if (ck.human_seconds && ck.human_seconds >= 3 && ck.speech_seconds >= 3) {
        mRate.push((ck.correct / ck.speech_seconds) * 60);
        hRate.push((humanCorrect / ck.human_seconds) * 60);
      }
    }
    const diffs = mRate.map((m, i) => m - hRate[i]);
    const bias = diffs.length ? mean(diffs) : null;
    const sd = diffs.length >= 2 ? Math.sqrt(diffs.reduce((a, d) => a + (d - bias!) ** 2, 0) / (diffs.length - 1)) : null;
    return {
      recordings: subset.length,
      words: mWord.length,
      wordAgreement: mWord.length ? mWord.filter((m, i) => m === hWord[i]).length / mWord.length : null,
      kappa: mWord.length ? cohenKappa(mWord, hWord) : null,
      errorRecall: tp + fn ? tp / (tp + fn) : null,
      errorPrecision: tp + fp ? tp / (tp + fp) : null,
      iccPerMinute: mRate.length >= 3 ? icc21(mRate, hRate) : null,
      bias,
      limits: bias !== null && sd !== null ? [bias - 1.96 * sd, bias + 1.96 * sd] as [number, number] : null,
    };
  };
  const random = agreementFor(checks.filter((c) => c.random_pick));
  const flaggedAgreement = agreementFor(checks.filter((c) => c.flagged && !c.random_pick));

  return {
    updatedAt: new Date().toISOString(),
    classes: counts?.classes ?? 0,
    children: counts?.children ?? 0,
    childrenAssessed: assessed,
    childrenPracticed: practiced,
    readings: rows.length,
    publicTries: counts?.tries ?? 0,
    prePost: {
      pairs: gains.length,
      meanGain: gains.length ? mean(gains) : null,
      medianGain: gains.length ? median(gains) : null,
      ci95: gains.length >= 2 ? bootstrapMeanCI(gains) : null,
      levelMoves,
    },
    // Randomised comparison: the waitlist group has the same two checks with no practice in between.
    byGroup: {
      practice: practiceArm,
      waitlist: waitlistArm,
      difference: practiceArm.meanGain !== null && waitlistArm.meanGain !== null ? practiceArm.meanGain - waitlistArm.meanGain : null,
      differenceCi95: arms.practice.gains.length >= 2 && arms.waitlist.gains.length >= 2 ? bootstrapDiffCI(arms.practice.gains, arms.waitlist.gains) : null,
      minutes: activity,
    },
    // Headline agreement uses only recordings picked at random; flagged ones are reported apart.
    agreement: random,
    agreementFlagged: flaggedAgreement,
    practiceDrafts: { total: counts?.drafts ?? 0, passedChecker: counts?.draftsOk ?? 0, byLang: draftsByLang },
  };
}
