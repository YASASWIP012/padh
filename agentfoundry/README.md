# Padh in AgentFoundry

Padh is opened as an AgentFoundry project from the repository root. The AgentFoundry files live in `.codenow/agent-studio/` (where the IDE reads them); this note explains them.

- `.codenow/agent-studio/agents/padh-practice-writer.json` is the agent manifest.
- `.codenow/agent-studio/prompts/padh-practice-writer.md` is its instructions. Production uses this exact text, and a unit test (`src/worker/prompt.test.ts`) fails if the two drift apart.
- `.codenow/agent-studio/evals/padh-practice-writer.json` is the eval suite: 16 cases covering target-word use in Telugu, Hindi and English, and refusals (off-task requests, personal data, medical advice, unkind text, an instruction hidden in the input).

Runs from the AgentFoundry IDE's Agents panel land in `.codenow/agent-studio/evals/results/` and are committed there.

Model evals check the drafting step. They cannot check the parts written as plain code, so those have unit tests instead (`npm test`): the reading scorer and the checker that every draft must pass before a child sees it (`checkPracticeText` in `src/core/practice.ts`).

Latest run: 16 of 16 cases passed against the production model (Cloudflare Workers AI, Llama 3.3 70B) and prompt, run with `scripts/run-evals.mts` on 15 Nov 2026. That run was a local script, not the IDE, and its result file says so in its `runner` field.
