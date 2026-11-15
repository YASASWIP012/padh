import type { Lang, Level } from '../core/passages';
import type { PracticeTargets } from '../core/practice';
import { PRACTICE_SYSTEM } from './prompt';

const LANG_NAME: Record<Lang, string> = { te: 'Telugu', hi: 'Hindi', en: 'English' };

export interface LlmEnv {
  LLM_API_KEY?: string;
  LLM_PROVIDER?: string; // 'workers-ai' (default when the AI binding exists) | 'anthropic' | 'openai'
  LLM_MODEL?: string;
  AI?: { run: (model: string, input: unknown) => Promise<unknown> };
}

const WORKERS_AI_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

export function modelReady(env: LlmEnv): boolean {
  return !!env.AI || (!!env.LLM_API_KEY && !!env.LLM_MODEL);
}

/** The request in the same shape the AgentFoundry eval cases use. Only target words reach the model, never child data. */
export function draftPrompt(lang: Lang, level: Level, t: PracticeTargets, exampleText: string, feedback?: string[]): string {
  return [
    `Language: ${LANG_NAME[lang]}.${level === 'story' ? ' Write a story.' : level === 'word' ? ' Write only 2 or 3 very short sentences.' : ''}`,
    `Target words: ${t.words.join(', ') || '(none)'}.`,
    t.aksharas.length ? `Target aksharas: ${t.aksharas.join(', ')}.` : '',
    `Sample of the words this child meets in class: ${exampleText}`,
    feedback?.length ? `A checker rejected the last draft: ${feedback.join('; ')}. Fix that.` : '',
    'Write a practice text.',
  ].filter(Boolean).join('\n');
}

export async function draftText(env: LlmEnv, prompt: string): Promise<string> {
  const provider = env.LLM_PROVIDER ?? (env.AI ? 'workers-ai' : 'anthropic');
  // Cloudflare Workers AI runs on the same account under its free daily allowance. If the allowance
  // runs out the call fails, and the caller falls back to the passage bank.
  if (provider === 'workers-ai' && env.AI) {
    const out = (await env.AI.run(env.LLM_MODEL || WORKERS_AI_MODEL, {
      messages: [{ role: 'system', content: PRACTICE_SYSTEM }, { role: 'user', content: prompt }],
      max_tokens: 600,
      temperature: 0.6,
    })) as { response?: string };
    return (out.response ?? '').trim();
  }
  if (!env.LLM_API_KEY || !env.LLM_MODEL) throw new Error('no model configured');
  if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.LLM_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: env.LLM_MODEL, messages: [{ role: 'system', content: PRACTICE_SYSTEM }, { role: 'user', content: prompt }], temperature: 0.7 }),
    });
    if (!res.ok) throw new Error(`model ${res.status}`);
    const b = (await res.json()) as { choices: { message: { content: string } }[] };
    return b.choices[0].message.content.trim();
  }
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': env.LLM_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: env.LLM_MODEL, max_tokens: 600, system: PRACTICE_SYSTEM, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) throw new Error(`model ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const b = (await res.json()) as { content: { type: string; text?: string }[] };
  return b.content.filter((c) => c.type === 'text').map((c) => c.text).join('').trim();
}
