import { describe, expect, it } from 'vitest';
import { pearson, icc21, cohenKappa, bootstrapMeanCI, bootstrapDiffCI, mean, median } from './stats';
import { speechSpan } from './vad';
import { pickTargets, checkPracticeText } from './practice';

describe('stats', () => {
  it('pearson is 1 for a perfect line', () => {
    expect(pearson([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1);
  });
  it('ICC punishes a constant offset that pearson ignores', () => {
    const a = [20, 30, 40, 50, 60];
    expect(icc21(a, a)).toBeCloseTo(1);
    expect(icc21(a, a.map((x) => x + 15))).toBeLessThan(0.9);
    expect(pearson(a, a.map((x) => x + 15))).toBeCloseTo(1);
  });
  it('kappa is 1 for identical marks and 0 for chance', () => {
    expect(cohenKappa([true, false, true, true], [true, false, true, true])).toBe(1);
    expect(cohenKappa([true, true, false, false], [true, false, true, false])).toBeCloseTo(0);
  });
  it('bootstrap is reproducible and brackets the mean', () => {
    const d = [3, 5, 8, 2, 10, 6, 4, 7];
    const [lo, hi] = bootstrapMeanCI(d);
    expect(bootstrapMeanCI(d)).toEqual([lo, hi]);
    expect(lo).toBeLessThan(5.625);
    expect(hi).toBeGreaterThan(5.625);
  });
  it('median', () => expect(median([5, 1, 3, 2])).toBe(2.5));
  it('difference interval brackets the true gap and excludes zero for a clear gap', () => {
    const a = [10, 12, 9, 11, 13, 10, 12];
    const b = [1, 2, 0, 3, 1, 2, 1];
    const [lo, hi] = bootstrapDiffCI(a, b);
    expect(lo).toBeGreaterThan(0);
    expect(lo).toBeLessThan(mean(a) - mean(b));
    expect(hi).toBeGreaterThan(mean(a) - mean(b));
  });
});

describe('speech timing', () => {
  it('ignores silence before and after reading', () => {
    const sr = 16000;
    const s = new Float32Array(sr * 6);
    for (let i = 0; i < s.length; i++) s[i] = (Math.random() - 0.5) * 0.002;
    for (let i = sr * 1.5; i < sr * 4.5; i++) s[i] = Math.sin(i / 8) * 0.3;
    const span = speechSpan(s, sr);
    expect(span.start).toBeGreaterThan(1.4);
    expect(span.start).toBeLessThan(1.6);
    expect(span.seconds).toBeGreaterThan(2.8);
    expect(span.seconds).toBeLessThan(3.2);
  });
  it('returns zero for pure silence', () => {
    expect(speechSpan(new Float32Array(16000), 16000).seconds).toBe(0);
  });
});

describe('practice', () => {
  const bank = ['pat', 'sat', 'ship', 'shop', 'fish', 'dog', 'sun', 'chip', 'much'];
  it('targets the most-missed aksharas, weighting recent readings', () => {
    const t = pickTargets([{ missed: { s: 1, h: 3 }, exposed: { s: 6, h: 3 } }, { missed: { s: 1, h: 3 }, exposed: { s: 6, h: 3 } }], 'en', bank, 1);
    expect(t.aksharas).toEqual(['h']);
    expect(t.words).toEqual(expect.arrayContaining(['ship', 'shop', 'fish', 'chip', 'much']));
  });
  it('prefers an akshara missed every time over a common one missed now and then', () => {
    const t = pickTargets([{ missed: { a: 3, q: 2 }, exposed: { a: 30, q: 2 } }], 'en', ['quit', 'ant'], 1);
    expect(t.aksharas).toEqual(['q']);
  });
  it('rejects a practice text that reuses words from the check passages', () => {
    const targets = { aksharas: ['h'], words: ['ship', 'fish'] };
    const known = new Set(['the', 'a', 'is', 'on', 'big', 'red', 'and', 'sun', 'dog', 'sat', 'hen']);
    const c = checkPracticeText('the ship is red and the fish is big the hen sat on the ship the fish sat on a ship the sun is on the fish and the ship', 'en', 'para', targets, known, new Set(['hen']));
    expect(c.problems.join()).toContain('check passages');
  });
  it('rejects a practice text in the wrong script or with unknown words', () => {
    const targets = { aksharas: ['h'], words: ['ship', 'fish'] };
    const known = new Set(['the', 'a', 'is', 'on', 'big', 'red', 'and', 'sun', 'dog', 'sat']);
    const bad = checkPracticeText('पानी '.repeat(25), 'en', 'para', targets, known);
    expect(bad.ok).toBe(false);
    const good = checkPracticeText(
      'the ship is red and the fish is big the dog sat on the ship the fish sat on a ship the sun is on the fish and the ship',
      'en', 'para', targets, known,
    );
    expect(good.problems).toEqual([]);
  });
});
