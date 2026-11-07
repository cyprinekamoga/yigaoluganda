/**
 * Content model. All learning content lives in /content as JSON so it can be
 * edited without touching code. `npm test` validates every file.
 */

export type Lang = 'en' | 'sv';
/** A piece of text in every interface language. */
export type T = Record<Lang, string>;

/** Dictionary / phrasebook groups ("daily situations"). */
export type Situation =
  | 'greet'
  | 'polite'
  | 'elders'
  | 'leaving'
  | 'me'
  | 'family'
  | 'intro'
  | 'asking'
  | 'feelings'
  | 'stuck'
  | 'around'
  | 'table'
  | 'sounds';

export interface Phrase {
  /** kebab-case, unique. Also the audio file name: assets/audio/<id>.m4a */
  id: string;
  /** Luganda, as shown to the learner. */
  lg: string;
  /** Natural meaning. */
  tr: T;
  /** Word-for-word meaning, when it helps. */
  literal?: T;
  note?: T;
  category: Situation;
  /** Other spellings that count as correct (e.g. typed without ŋ). */
  variants?: string[];
  /** Something a native speaker should confirm. Shown in CONTENT_REPORT, never in the app. */
  check?: string;
}

/** A sentence for the word-bank builder and dictation. `{name}` = the learner's name. */
export interface Sentence {
  id: string;
  lg: string;
  tr: T;
  /** Extra wrong tiles. If omitted, tiles from other sentences in the unit are used. */
  distractors?: string[];
  check?: string;
}

/** Two words that differ only in sound length (siba / siiba). Used by the Sound & Vowel Matcher. */
export interface SoundPair {
  id: string;
  a: string; // phrase id
  b: string; // phrase id
}

export type TipIcon = 'sound' | 'heart' | 'bow' | 'chat' | 'moon' | 'people' | 'drum' | 'question' | 'market' | 'boda' | 'food' | 'star';

export interface Tip {
  id: string;
  icon: TipIcon;
  title: T;
  body: T;
}

export type CastRole = 'ngaali' | 'elder' | 'friend' | 'parent' | 'rider' | 'seller';
export interface CastMember {
  name: string;
  role: CastRole;
}

export type DialogueLine =
  | { kind: 'narrate'; text: T }
  | { kind: 'say'; who: string; lg: string; tr: T; slow?: boolean }
  | {
      kind: 'choose';
      prompt: T;
      options: { lg: string; tr: T; correct?: boolean; why?: T }[];
    };

export interface Dialogue {
  id: string;
  title: T;
  setting: T;
  cast: Record<string, CastMember>;
  lines: DialogueLine[];
}

export interface Lesson {
  id: string;
  title: T;
  /** New phrases taught in this lesson (phrase ids). */
  phrases: string[];
  /** Earlier phrases mixed in for review. */
  review?: string[];
  sentences?: string[];
  sounds?: string[];
  tip?: string;
  dialogue?: string;
}

export type SceneId =
  | 'sounds'
  | 'courtesy'
  | 'wave'
  | 'bow'
  | 'night'
  | 'pointing'
  | 'nametag'
  | 'question'
  | 'feelings'
  | 'boda'
  | 'meal'
  | 'journey';

export type Hue = 'sun' | 'leaf' | 'lake' | 'clay' | 'plum' | 'teal';

export interface Chapter {
  id: string;
  n: number;
  /** Luganda chapter title, from the PRD. */
  lgTitle: string;
  title: T;
  /** Short scenario line shown on the tile: "Greet an elder". */
  scenario: T;
  scene: SceneId;
  hue: Hue;
  lessons: Lesson[];
  /** Checkpoint chapters unlock only when every other chapter in the unit is complete. */
  checkpoint?: boolean;
}

export interface Root {
  id: string;
  form: string;
  meaning: T;
  explain: T;
  /** Phrase ids that show the root. */
  examples: string[];
}

export interface Unit {
  id: string;
  n: number;
  lgTitle: string;
  title: T;
  chapters: Chapter[];
  phrases: Phrase[];
  sentences: Sentence[];
  soundPairs: SoundPair[];
  tips: Tip[];
  dialogues: Dialogue[];
  roots: Root[];
}
