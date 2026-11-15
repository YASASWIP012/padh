/** Small, dependency-free statistics used on the public evidence page. */

export function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
}

export function median(xs: number[]): number {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function pearson(xs: number[], ys: number[]): number {
  if (xs.length !== ys.length || xs.length < 3) return NaN;
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  return dx === 0 || dy === 0 ? NaN : num / Math.sqrt(dx * dy);
}

/**
 * Two-way random, absolute agreement, single rater ICC(2,1).
 * The standard figure for "does the machine give the same number a teacher would".
 */
export function icc21(a: number[], b: number[]): number {
  const n = a.length;
  if (n < 3 || b.length !== n) return NaN;
  const k = 2;
  const rows = a.map((x, i) => [x, b[i]]);
  const grand = mean([...a, ...b]);
  const rowMeans = rows.map((r) => mean(r));
  const colMeans = [mean(a), mean(b)];
  let ssr = 0, ssc = 0, sse = 0;
  for (let i = 0; i < n; i++) ssr += k * (rowMeans[i] - grand) ** 2;
  for (let j = 0; j < k; j++) ssc += n * (colMeans[j] - grand) ** 2;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < k; j++) sse += (rows[i][j] - rowMeans[i] - colMeans[j] + grand) ** 2;
  const msr = ssr / (n - 1);
  const msc = ssc / (k - 1);
  const mse = sse / ((n - 1) * (k - 1));
  const denom = msr + (k - 1) * mse + (k * (msc - mse)) / n;
  return denom === 0 ? NaN : (msr - mse) / denom;
}

/** Cohen's kappa for two raters marking each word right (true) or wrong (false). */
export function cohenKappa(a: boolean[], b: boolean[]): number {
  const n = a.length;
  if (n === 0 || b.length !== n) return NaN;
  let agree = 0, aTrue = 0, bTrue = 0;
  for (let i = 0; i < n; i++) {
    if (a[i] === b[i]) agree++;
    if (a[i]) aTrue++;
    if (b[i]) bTrue++;
  }
  const po = agree / n;
  const pe = (aTrue / n) * (bTrue / n) + (1 - aTrue / n) * (1 - bTrue / n);
  return pe === 1 ? (po === 1 ? 1 : NaN) : (po - pe) / (1 - pe);
}

/** Seeded PRNG so the published confidence interval is reproducible. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Percentile bootstrap 95% interval for the mean of paired differences. */
export function bootstrapMeanCI(xs: number[], iterations = 5000, seed = 20261115): [number, number] {
  if (xs.length < 2) return [NaN, NaN];
  const rand = mulberry32(seed);
  const means: number[] = [];
  for (let it = 0; it < iterations; it++) {
    let s = 0;
    for (let i = 0; i < xs.length; i++) s += xs[Math.floor(rand() * xs.length)];
    means.push(s / xs.length);
  }
  means.sort((a, b) => a - b);
  return [means[Math.floor(iterations * 0.025)], means[Math.floor(iterations * 0.975)]];
}

/** Percentile bootstrap 95% interval for mean(a) - mean(b), resampling each group separately. */
export function bootstrapDiffCI(a: number[], b: number[], iterations = 5000, seed = 20261115): [number, number] {
  if (a.length < 2 || b.length < 2) return [NaN, NaN];
  const rand = mulberry32(seed);
  const diffs: number[] = [];
  const draw = (xs: number[]) => { let s = 0; for (let i = 0; i < xs.length; i++) s += xs[Math.floor(rand() * xs.length)]; return s / xs.length; };
  for (let it = 0; it < iterations; it++) diffs.push(draw(a) - draw(b));
  diffs.sort((x, y) => x - y);
  return [diffs[Math.floor(iterations * 0.025)], diffs[Math.floor(iterations * 0.975)]];
}
