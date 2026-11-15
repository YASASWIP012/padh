-- Classes are created by a teacher. The teacher PIN is stored hashed.
CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  lang TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- Children are known only by a nickname the teacher chooses. No real names, no photos.
CREATE TABLE IF NOT EXISTS children (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES classes(id),
  nickname TEXT NOT NULL,
  grade INTEGER NOT NULL,
  lang TEXT NOT NULL,
  consent_at INTEGER NOT NULL,          -- teacher confirmed a signed parent form is on file
  consent_keep_audio INTEGER NOT NULL,  -- parent allowed a recording to be kept for a teacher check
  consent_version TEXT NOT NULL DEFAULT 'v1',
  consent_witness TEXT NOT NULL DEFAULT '', -- the adult who collected the signed form
  arm TEXT NOT NULL DEFAULT 'practice',  -- practice | waitlist, from permuted blocks of 4 within each class and grade
  form_order TEXT NOT NULL DEFAULT 'AB', -- AB or BA, balanced within each group and grade
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  child_id TEXT REFERENCES children(id),
  class_id TEXT REFERENCES classes(id),
  kind TEXT NOT NULL,                   -- pre | post | practice | try
  lang TEXT NOT NULL,
  level TEXT NOT NULL,
  form TEXT NOT NULL,
  passage_id TEXT NOT NULL,
  heard TEXT NOT NULL,
  speech_seconds REAL NOT NULL,
  correct INTEGER NOT NULL,
  attempted INTEGER NOT NULL,
  total_words INTEGER NOT NULL,
  wcpm INTEGER,
  passed INTEGER NOT NULL,
  review TEXT NOT NULL,                 -- JSON array of reasons a person should listen
  words TEXT NOT NULL,                  -- JSON word-by-word result
  missed TEXT NOT NULL,                 -- JSON akshara -> count
  exposed TEXT NOT NULL DEFAULT '{}',   -- JSON akshara -> times met in attempted words
  final_level TEXT,                     -- set on the last step of an assessment
  runner TEXT NOT NULL DEFAULT '',      -- adult who ran this reading
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_child ON sessions(child_id, created_at);
CREATE INDEX IF NOT EXISTS sessions_class ON sessions(class_id, created_at);

-- Recordings kept only for the blind teacher check, deleted once checked or after 14 days.
CREATE TABLE IF NOT EXISTS audio (
  session_id TEXT PRIMARY KEY REFERENCES sessions(id),
  flagged INTEGER NOT NULL DEFAULT 0,
  random_pick INTEGER NOT NULL DEFAULT 0, -- 1 if drawn at random (whether or not it was also flagged)
  mime TEXT NOT NULL,
  data BLOB NOT NULL,
  expires_at INTEGER NOT NULL
);

-- A teacher's own word-by-word marks, made without seeing the machine's marks.
CREATE TABLE IF NOT EXISTS rescores (
  session_id TEXT PRIMARY KEY REFERENCES sessions(id),
  marks TEXT NOT NULL,                  -- JSON per printed word: 'correct' | 'error' | 'skipped' | 'not_reached'
  checker TEXT NOT NULL DEFAULT '',     -- name of the adult who scored it; must not be the one who ran the session
  human_seconds REAL,                   -- reading time the checker measured from the audio
  flagged INTEGER NOT NULL DEFAULT 0,   -- 1 if Padh flagged the reading as unclear
  random_pick INTEGER NOT NULL DEFAULT 0, -- 1 if the recording was drawn at random; headline agreement uses these
  created_at INTEGER NOT NULL
);

-- Adult time with each child between checks: Padh practice or storybook reading (comparison group).
CREATE TABLE IF NOT EXISTS activity (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES children(id),
  kind TEXT NOT NULL,                   -- practice | storybook
  minutes INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tts_cache (
  key TEXT PRIMARY KEY,
  audio TEXT NOT NULL,                  -- base64 wav
  created_at INTEGER NOT NULL
);

-- Every practice text the model drafted, with the checker's verdict. Published on the evidence page.
CREATE TABLE IF NOT EXISTS drafts (
  id TEXT PRIMARY KEY,
  lang TEXT NOT NULL,
  level TEXT NOT NULL,
  targets TEXT NOT NULL,
  text TEXT NOT NULL,
  ok INTEGER NOT NULL,
  problems TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
