import type { Lang, Level, Passage } from '../core/passages';
import type { ReadingScore, AserLevel } from '../core/score';
import type { PlanStep, PracticeTargets } from '../core/practice';

export type Kind = 'pre' | 'post' | 'practice' | 'try';

export interface ReadResult {
  sessionId: string;
  heard: string;
  passage: Passage;
  score: ReadingScore;
  step: { next: Level } | { final: AserLevel } | { retry: true; attemptsLeft: number } | { review: true };
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Something went wrong (${res.status})`);
  return body as T;
}

const json = (body: unknown, pin?: string): RequestInit => ({
  method: 'POST',
  headers: { 'content-type': 'application/json', ...(pin ? { 'x-pin': pin } : {}) },
  body: JSON.stringify(body),
});

export const api = {
  passage: (lang: Lang, level: Level, form = 'C') => call<Passage>(`/api/passage?lang=${lang}&level=${level}&form=${form}`),
  read(audio: Blob, o: { lang: Lang; level: Level; kind: Kind; speechSeconds: number; childId?: string; pin?: string; runner?: string }) {
    const f = new FormData();
    f.append('audio', new File([audio], 'reading', { type: audio.type }));
    f.append('lang', o.lang);
    f.append('level', o.level);
    f.append('kind', o.kind);
    f.append('speechSeconds', String(o.speechSeconds));
    if (o.childId) f.append('childId', o.childId);
    if (o.runner) f.append('runner', o.runner);
    return call<ReadResult>('/api/read', { method: 'POST', body: f, headers: o.pin ? { 'x-pin': o.pin } : {} });
  },
  plan: (o: { lang: Lang; level: Level | 'beginner'; childId?: string; missed?: Record<string, number> }, pin?: string) =>
    call<{ targets: PracticeTargets; source: 'drafted' | 'bank'; plan: PlanStep[] }>('/api/plan', json(o, pin)),
  tts: (text: string, lang: Lang) => call<{ audio: string; mime: string }>('/api/tts', json({ text, lang })),
  createClass: (o: { name: string; lang: Lang; pin: string }) => call<{ code: string }>('/api/class', json(o)),
  getClass: (code: string, pin: string) => call<ClassView>(`/api/class/${code}`, { headers: { 'x-pin': pin } }),
  addChild: (code: string, pin: string, o: { nickname: string; grade: number; lang: Lang; consent: boolean; keepAudio: boolean; witness: string }) =>
    call<{ id: string; arm: string }>(`/api/class/${code}/child`, json(o, pin)),
  nextCheck: (code: string, pin: string) =>
    call<{ done?: boolean; sessionId?: string; runner?: string; lang?: Lang; words?: string[]; mime?: string; audio?: string }>(`/api/class/${code}/check`, { headers: { 'x-pin': pin } }),
  submitCheck: (code: string, pin: string, o: { sessionId: string; marks: string[]; checker: string; seconds?: number }) => call<{ ok: boolean }>(`/api/class/${code}/check`, json(o, pin)),
  logMinutes: (code: string, pin: string, childId: string, kind: 'practice' | 'storybook', minutes: number) => call<{ ok: boolean }>(`/api/class/${code}/child/${childId}/minutes`, json({ kind, minutes }, pin)),
  withdraw: (code: string, pin: string, childId: string) => call<{ ok: boolean }>(`/api/class/${code}/child/${childId}`, { method: 'DELETE', headers: { 'x-pin': pin } }),
  impact: () => call<Impact>('/api/impact'),
};

export interface ChildRow { id: string; nickname: string; grade: number; lang: Lang; consent_keep_audio: number; arm: 'practice' | 'waitlist'; form_order: 'AB' | 'BA' }
export interface SessionRow { child_id: string; kind: Kind; level: Level; wcpm: number | null; passed: number; final_level: AserLevel | null; missed: string; review: string; created_at: number }
export interface ClassView { name: string; lang: Lang; code: string; demo: boolean; minGapDays: number; children: ChildRow[]; sessions: SessionRow[]; toCheck: number }

export interface Impact {
  updatedAt: string;
  classes: number;
  children: number;
  childrenAssessed: number;
  childrenPracticed: number;
  readings: number;
  publicTries: number;
  prePost: { pairs: number; meanGain: number | null; medianGain: number | null; ci95: [number, number] | null; levelMoves: { up: number; same: number; down: number } };
  byGroup: { practice: GroupStats; waitlist: GroupStats; difference: number | null; differenceCi95: [number, number] | null; minutes: { group: string; kind: string; minutes: number; children: number }[] };
  agreement: Agreement;
  agreementFlagged: Agreement;
  practiceDrafts: { total: number; passedChecker: number };
}

export interface Agreement { recordings: number; words: number; wordAgreement: number | null; kappa: number | null; errorRecall: number | null; errorPrecision: number | null; iccPerMinute: number | null; bias: number | null; limits: [number, number] | null }

export interface GroupStats { pairs: number; meanGain: number | null; medianGain: number | null; ci95: [number, number] | null; levelMoves: { up: number; same: number; down: number }; medianPracticeReadings: number | null; belowParagraph: { pairs: number; meanGain: number | null } }

export function playBase64Wav(b64: string, mime = 'audio/wav'): HTMLAudioElement {
  const a = new Audio(`data:${mime};base64,${b64}`);
  void a.play();
  return a;
}
