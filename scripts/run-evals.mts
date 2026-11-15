// Runs the AgentFoundry eval suite for the practice writer against the production model and prompt,
// outside the IDE, and saves the result next to the suite. Labelled "local" so it is never mistaken
// for a run from the AgentFoundry IDE.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const suite = JSON.parse(readFileSync('.codenow/agent-studio/evals/padh-practice-writer.json', 'utf8')) as {
  name: string; system: string; cases: { name: string; input: string; expected_any_contains: string[] }[];
};
const env = readFileSync('.env.local', 'utf8');
const token = env.match(/^CLOUDFLARE_API_TOKEN=(.+)$/m)![1].trim();
const account = process.env.CLOUDFLARE_ACCOUNT_ID ?? '214ba9f2bdce36f9e9a3741755376875';
const model = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

const started = Date.now();
const cases = [];
for (const c of suite.cases) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${model}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'system', content: suite.system }, { role: 'user', content: c.input }], max_tokens: 400, temperature: 0.6 }),
  });
  const body = (await res.json()) as { result?: { response?: string }; errors?: unknown[] };
  const output = body.result?.response ?? `ERROR ${JSON.stringify(body.errors)}`;
  const pass = c.expected_any_contains.some((s) => output.includes(s));
  cases.push({ name: c.name, input: c.input, expected_any_contains: c.expected_any_contains, output, pass });
  console.log(pass ? 'PASS' : 'FAIL', c.name);
}
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
mkdirSync('.codenow/agent-studio/evals/results', { recursive: true });
const out = { eval: suite.name, runner: 'local script (scripts/run-evals.mts), not the AgentFoundry IDE', model, timestamp: started, totalMs: Date.now() - started, passed: cases.filter((c) => c.pass).length, total: cases.length, cases };
writeFileSync(`.codenow/agent-studio/evals/results/${suite.name}-local-${stamp}.json`, JSON.stringify(out, null, 2));
console.log(`${out.passed}/${out.total} passed`);
