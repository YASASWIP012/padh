import type { Lang } from '../core/passages';

/** Words a child or parent sees while reading. */
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

export type Ui = 'en' | 'te' | 'hi';
const U = {
  demo: { en: 'See the demo class (no sign-in)', te: 'డెమో తరగతి చూడండి (లాగిన్ అక్కర్లేదు)', hi: 'डेमो कक्षा देखें (लॉगिन नहीं चाहिए)' },
  openClass: { en: 'Open my class', te: 'నా తరగతి తెరువు', hi: 'मेरी कक्षा खोलें' },
  newClass: { en: 'Start a new class', te: 'కొత్త తరగతి మొదలుపెట్టు', hi: 'नई कक्षा शुरू करें' },
  classCode: { en: 'Class code', te: 'తరగతి కోడ్', hi: 'कक्षा कोड' },
  addChild: { en: 'Add a child', te: 'పిల్లవాడిని చేర్చు', hi: 'बच्चा जोड़ें' },
  signOut: { en: 'Sign out', te: 'బయటకు', hi: 'बाहर निकलें' },
  child: { en: 'Child', te: 'పిల్లలు', hi: 'बच्चा' },
  cls: { en: 'Class', te: 'తరగతి', hi: 'कक्षा' },
  group: { en: 'Group', te: 'గుంపు', hi: 'समूह' },
  firstCheck: { en: 'First check', te: 'మొదటి పరీక్ష', hi: 'पहली जाँच' },
  secondCheck: { en: 'Second check', te: 'రెండో పరీక్ష', hi: 'दूसरी जाँच' },
  practiceDays: { en: 'Practice days', te: 'సాధన రోజులు', hi: 'अभ्यास के दिन' },
  practise: { en: 'Practise', te: 'సాధన', hi: 'अभ्यास' },
  notYet: { en: 'Not yet', te: 'ఇంకా లేదు', hi: 'अभी नहीं' },
  after7: { en: 'After 7+ days', te: '7 రోజుల తర్వాత', hi: '7 दिन बाद' },
  withdraw: { en: 'Withdraw', te: 'తొలగించు', hi: 'हटाएँ' },
  recordAgain: { en: 'Record it once more', te: 'మళ్ళీ ఒకసారి రికార్డ్ చేయి', hi: 'एक बार फिर रिकॉर्ड करें' },
  showResult: { en: 'Show the result (adults)', te: 'ఫలితం చూపించు (పెద్దలకు)', hi: 'नतीजा दिखाएँ (बड़ों के लिए)' },
  nextChild: { en: 'Next child', te: 'తర్వాతి పిల్లవాడు', hi: 'अगला बच्चा' },
  checkRecordings: { en: 'Check recordings', te: 'రికార్డింగ్‌లు చూడు', hi: 'रिकॉर्डिंग जाँचें' },
  practiceNow: { en: 'Practice now', te: 'ఇప్పుడే సాధన', hi: 'अभी अभ्यास' },
  waitlist: { en: 'Storybook first', te: 'ముందు కథల పుస్తకం', hi: 'पहले कहानी की किताब' },
} as const;
export type UKey = keyof typeof U;
export function getUi(): Ui {
  try { const v = localStorage.getItem('padh.ui'); return v === 'te' || v === 'hi' ? v : 'en'; } catch { return 'en'; }
}
export function setUi(v: Ui) {
  try { localStorage.setItem('padh.ui', v); } catch { /* private mode */ }
  location.reload();
}
export const u = (k: UKey) => U[k][getUi()];
