import type { Lang } from '../core/passages';

/** Words a child or parent sees while reading. The teacher screens stay in English for now. */
const T = {
  readThis: { en: 'Read this out loud', hi: 'इसे ज़ोर से पढ़ो', te: 'దీన్ని గట్టిగా చదువు' },
  tapToStart: { en: 'Tap the button, then start reading', hi: 'बटन दबाओ, फिर पढ़ना शुरू करो', te: 'బటన్ నొక్కి, చదవడం మొదలుపెట్టు' },
  tapWhenDone: { en: 'Tap again when you finish', hi: 'पढ़ लो तो फिर से दबाओ', te: 'చదివాక మళ్ళీ నొక్కు' },
  listening: { en: 'Listening…', hi: 'सुन रहे हैं…', te: 'వింటున్నాం…' },
  checking: { en: 'Checking your reading…', hi: 'पढ़ाई जाँच रहे हैं…', te: 'చదువు చూస్తున్నాం…' },
  wellDone: { en: 'Well done for reading.', hi: 'शाबाश, तुमने पढ़ा।', te: 'బాగా చదివావు.' },
  listen: { en: 'Listen', hi: 'सुनो', te: 'విను' },
} as const;

export type Key = keyof typeof T;
export const t = (k: Key, lang: Lang) => T[k][lang];

export const LANG_LABEL: Record<Lang, string> = { te: 'తెలుగు', hi: 'हिन्दी', en: 'English' };
export const LEVEL_LABEL = { beginner: 'Beginner', letter: 'Letters', word: 'Words', para: 'Paragraph', story: 'Story' } as const;
