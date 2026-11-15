# Synthetic benchmark (computer voice, not children)

Run on 2026-11-15 with `npx tsx scripts/bench-synthetic.ts`. A computer voice (ElevenLabs text-to-speech) read each paragraph and story passage with three mistakes planted at known places: one skipped word, one word swapped for another word from the passage, and one word with its second akshara dropped. The recording went through the live speech-to-text step, and Padh's scorer marked it.

This shows how well the pipeline finds known mistakes in clear synthetic speech. It is an upper bound. Children's voices are harder, which is what the blind teacher checks in the pilot measure.

| Measure | Result |
|---|---|
| Planted mistakes found (recall) | 41/54 (76%) |
| Marks that were real mistakes (precision) | 41/55 (75%) |
| Skipped words found | 16/18 |
| Swapped words found | 16/18 |
| Misread words found | 9/18 |
| Words scored | 781 |

Misread words are the hard case: the recogniser sometimes "hears" the correct word even when a syllable is missing. That is the gap the blind checks are there to measure.

One run looks wrong: en-story-A found 0 of 3. A clean reading of the same story, re-run afterwards, came back word for word, so the pipeline itself works on that passage. The result is left in as it came out rather than re-run until it looks better.

| Passage | Words | Planted found | False alarms |
|---|---|---|---|
| te-para-A | 23 | 3/3 | 0 |
| te-para-B | 21 | 3/3 | 0 |
| te-para-C | 21 | 3/3 | 0 |
| te-story-A | 47 | 3/3 | 3 |
| te-story-B | 48 | 3/3 | 0 |
| te-story-C | 47 | 3/3 | 1 |
| hi-para-A | 36 | 2/3 | 0 |
| hi-para-B | 35 | 3/3 | 1 |
| hi-para-C | 37 | 2/3 | 0 |
| hi-story-A | 62 | 2/3 | 0 |
| hi-story-B | 64 | 3/3 | 1 |
| hi-story-C | 63 | 1/3 | 2 |
| en-para-A | 27 | 2/3 | 0 |
| en-para-B | 28 | 2/3 | 2 |
| en-para-C | 26 | 2/3 | 0 |
| en-story-A | 66 | 0/3 | 0 |
| en-story-B | 66 | 3/3 | 0 |
| en-story-C | 64 | 1/3 | 4 |
