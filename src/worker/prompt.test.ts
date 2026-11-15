import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { PRACTICE_SYSTEM } from './prompt';

it('production prompt matches the AgentFoundry prompt', () => {
  const md = readFileSync('.codenow/agent-studio/prompts/padh-practice-writer.md', 'utf8').trimEnd();
  expect(PRACTICE_SYSTEM).toBe(md);
});
