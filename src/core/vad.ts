/**
 * Finds when the child started and stopped speaking, so that words correct per
 * minute is measured over reading time and not over the silence before the
 * first word or after the last one.
 *
 * Energy-based: 20 ms frames, noise floor taken from the quietest frames, speech
 * is any frame well above that floor. Short gaps inside reading count as reading
 * time, which matches how a teacher with a stopwatch times a passage.
 */
export function speechSpan(samples: Float32Array, sampleRate: number): { start: number; end: number; seconds: number } {
  const frame = Math.max(1, Math.round(sampleRate * 0.02));
  const energies: number[] = [];
  for (let i = 0; i + frame <= samples.length; i += frame) {
    let sum = 0;
    for (let k = i; k < i + frame; k++) sum += samples[k] * samples[k];
    energies.push(Math.sqrt(sum / frame));
  }
  if (energies.length === 0) return { start: 0, end: 0, seconds: 0 };
  const sorted = [...energies].sort((a, b) => a - b);
  const floor = sorted[Math.floor(sorted.length * 0.1)];
  const peak = sorted[Math.floor(sorted.length * 0.98)];
  const threshold = Math.max(floor * 4, floor + (peak - floor) * 0.12, 0.004);

  // Require a few frames in a row so a click or bump does not start the clock.
  const run = 3;
  const loud = energies.map((e) => e > threshold);
  let first = -1;
  for (let i = 0; i + run <= loud.length; i++) {
    if (loud.slice(i, i + run).every(Boolean)) { first = i; break; }
  }
  let last = -1;
  for (let i = loud.length - run; i >= 0; i--) {
    if (loud.slice(i, i + run).every(Boolean)) { last = i + run - 1; break; }
  }
  if (first < 0 || last < first) return { start: 0, end: 0, seconds: 0 };
  const start = (first * frame) / sampleRate;
  const end = ((last + 1) * frame) / sampleRate;
  return { start, end, seconds: end - start };
}
