# Passage review list

All passages in `src/core/passages.ts` are original. Forms A, B and C of each level are matched within a language. Tests in `src/core/passages.test.ts` enforce the matching:

- aksharas within 5% (largest form divided by smallest is at most 1.05)
- conjuncts within 1
- word counts within 2
- the same number of sentences

| Language and level | A | B | C |
|---|---|---|---|
| Telugu paragraph (aksharas / conjuncts / words) | 57 / 4 / 23 | 58 / 4 / 21 | 58 / 4 / 21 |
| Telugu story | 129 / 16 / 47 | 131 / 15 / 48 | 127 / 16 / 47 |
| Hindi paragraph | 65 / 2 / 36 | 68 / 2 / 35 | 66 / 2 / 37 |
| Hindi story | 128 / 1 / 62 | 124 / 1 / 64 | 128 / 1 / 63 |
| English paragraph (letters / words) | 90 / 27 | 90 / 28 | 91 / 26 |
| English story | 246 / 66 | 249 / 66 | 249 / 64 |

Matching on counts is a start, not proof that two forms are equally hard for children. During the pilot, half the children read A first and half read B first, so any leftover difference between the forms shows up as an order effect and does not pass for progress.

## For a native-speaker teacher to check

Telugu
- Stories still have 15 or 16 conjuncts each, mostly from past-tense verbs (వెళ్ళింది, వచ్చింది, ఏడ్చాడు). Is that fine for Class 2?
- Story C uses కొన్నది. Some speakers say కొంది or కొనింది.
- Story A uses బాగా twice.
- In paragraph A, "ఆవు కడుపు నిండా తిని" may read a little literary.

Hindi
- Paragraph C is in the present progressive, while A and B use the habitual present.
- Paragraph B: "गली के बच्चे भी आ जाते हैं".
- Hindi stories have far fewer conjuncts than Telugu stories. That is normal for the two scripts, but it means levels are compared within a language, never across languages.

English
- Stories run 64 to 66 words, a little longer than the Telugu and Hindi stories.
