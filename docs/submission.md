### Team / Project name
Padh (Yasaswi Paruchuri, solo)

### Team members (names + GitHub handles)
Yasaswi Paruchuri (@YASASWIP012)

### Problem statement
In 2024 only 23.4% of Class 3 children in India's government schools could read a Class 2 text, and only 44.8% of Class 5 children could (ASER 2024). To know where a child is stuck you have to listen to them read, word by word, and a teacher with forty children rarely has time to. So a child who keeps misreading ళ్ళ or स्कू goes unnoticed for months. Padh is for primary teachers and parents of children in Classes 1 to 5 who read Telugu, Hindi or English.

### What you built
Padh is a reading check and practice planner that runs in any browser.

- **The check.** A child reads a short passage aloud. The check moves up and down an ASER-style ladder: letters, words, paragraph, story. Speech is transcribed verbatim, without giving the recogniser the passage. Code then aligns what was heard with the print, word by word and akshara by akshara. It handles oral-reading conventions (repeats and self-corrections are not errors), spelling variants, and words the recogniser splits or joins.
- **When Padh is unsure.** Silence, impossible speed or off-passage speech is flagged and handed to a person instead of being scored.
- **Practice.** Each child gets ten minutes of practice at their own level, built around the aksharas they miss most often for how often they meet them. A language model drafts practice text from target words only, and code rejects any draft with the wrong script or length, too many unfamiliar words, or words that appear only in the test passages.
- **The pilot, enforced in code.** Children are randomised in blocks to a practice group or a storybook comparison group. Forms A and B are matched and counterbalanced. The second check opens after 7 days. Recordings are drawn at random for a blind re-score by a second adult. The analysis was committed before any data (docs/pre-registration.md).
- **Evidence.** The live evidence page reports group gains with bootstrap intervals, the group difference, kappa, error recall and precision, ICC and Bland-Altman figures. Until there is data, it says "waiting".
- **Safeguarding.** Nickname only. Signed parent consent in three languages, naming the processors. Withdraw-and-delete. Most audio is discarded right after scoring.

How I used AgentFoundry: the project is an AgentFoundry project (`.codenow/agent-studio/`) with the practice-writer agent's manifest, prompt and a 16-case eval suite covering target words in three languages and refusals. Production uses the same prompt file, and a test fails if they drift apart.

Stack: Cloudflare Workers + D1, ElevenLabs Scribe for speech, Cloudflare Workers AI for drafts, Preact. 57 unit tests, CI on every push.

### GitHub repository URL
https://github.com/YASASWIP012/padh

### Demo URL (live app or video)
https://padh.padh-read.workers.dev (no login; "No microphone? Open a sample result" shows a scored reading; Teachers → "Open the demo class" shows the teacher view; a 5-minute path is in JUDGES.md)

### Scale & severity of the problem
- ASER 2024: 23.4% of Class 3 children in government schools could read a Class 2 text; 44.8% of Class 5 children could. https://www.millenniumpost.in/big-stories/aser-2024-reading-arithmetic-skills-improve-among-class-3-and-5-students-led-by-govt-schools-596643
- NIPUN Bharat targets 45 to 60 correct words per minute in Class 2 and at least 60 by the end of Class 3. https://en.vikaspedia.in/education/policies-and-schemes/nipun-bharat-programme

### Deployment & impact data
Deployed at https://padh.padh-read.workers.dev. At the time of filing, no child has used Padh. A school pilot with children aged 6 to 11 starts after filing, following the plan committed in docs/pre-registration.md. Its results appear live at https://padh.padh-read.workers.dev/#/evidence: children checked, both groups' gains, the difference between them, and how often a second adult agreed with Padh's marks. Null or disappointing results will be shown too.

### Track / category
Education

### Contact email
2300030830cseh@gmail.com
