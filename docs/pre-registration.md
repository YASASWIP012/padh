# Pilot plan, written before any child data

This file is committed before the first child reads, so its git timestamp shows the plan came first. Any change after that is listed at the bottom with a date and a reason.

## Questions

1. Validity. Does Padh's word-by-word marking agree with a second adult who listens to the same recording?
2. Feasibility and effect. Over about a week, do children who practise with Padh gain more in correct words per minute than children who spend the same time reading storybooks with an adult?

Question 1 is the main claim. Question 2 is a small feasibility trial and is reported as such.

## Who

- Children aged 6 to 11 (Classes 1 to 5) at one school.
- Inclusion requires a signed parent form (v1) and the child agreeing to read on the day.
- A child who is upset or says no is not tested.

## Design

- Each child is placed in one of two groups as they are added, using permuted blocks of four within each class and grade (two of each group per block, in an order derived from a hash the teacher can't see).
  - Practice group: Padh practice, about 10 minutes on school days, run by one adult on a shared phone or laptop.
  - Comparison group: the same adult time reading storybooks aloud together. This group starts Padh practice after the second check.
- First check, then a second check at least 7 days later. Each child reads one of two matched forms (A or B) at each check. The order (A then B, or B then A) is balanced within each group and grade.
- The check moves through an ASER-style ladder: it starts at a paragraph, moves up to a story, or moves down to words and then letters.
- A reading Padh flags as unclear gets one re-record. If it is still unclear, an adult who listened sets the level, and it is recorded as set by a person and reported separately. Silence on the letter list twice is recorded as "beginner", as in ASER.
- The server decides each next level on the ladder. A check that isn't finished within 3 hours can't be restarted, so no child sees a test passage on two days.

## Measures

- Correct words per minute on the paragraph or story the child reached, scored by Padh.
- Correct items per minute on word and letter lists for children below paragraph level.
- ASER-style level (beginner, letter, word, paragraph, story).
- Practice dose: number of practice readings between the checks.
- Adult time: minutes of Padh practice (practice group) and storybook reading (comparison group), logged per child per day.
- Validity sample: where the parent allowed it, every reading has a 1 in 2 random draw, whether or not it was flagged. Flagged readings are also kept, outside the random sample.
  - A second adult, a school teacher and never the builder or the adult who ran the reading, marks every word as right, wrong, skipped or not reached, without seeing Padh's marks, and times the reading.

## Analysis

Validity is reported on the random draws only. Flagged recordings outside the random draw are reported separately. Rates are compared only when the checker timed the reading.
- Word-level agreement and Cohen's kappa.
- Recall and precision of Padh's error marks against the checker's.
- ICC(2,1) and Bland-Altman bias and limits on correct words per minute.

Effect:
- Mean change in correct words per minute for each group, with a bootstrap 95% interval (5,000 resamples, seed 20261115).
- The difference between the two groups, with a two-sample bootstrap 95% interval (5,000 resamples, seed 20261115).
- Children below paragraph level: change in correct items a minute on the same word or letter list, reported separately with the number of children in each group.
- The share of children who moved up at least one level.
- With the expected sample, a difference smaller than about 0.9 standard deviations cannot be reliably detected, so a null or small result is reported plainly as inconclusive.

Integrity rules, enforced in code:
- Only the first second-check counts.
- Readings Padh flagged as unclear are left out of the outcome calculations.
- The second check can't open before 7 days.
- Demo classes and visitors on the try page are excluded.

Everything, including null results, appears on the public evidence page.

## Changes after data collection began

None yet.
