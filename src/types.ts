export type Likelihood = "common" | "possible" | "uncommon";

export type HabitatTag =
  | "woods"
  | "river"
  | "wetland"
  | "lake"
  | "alpine"
  | "edge"
  | "town"
  | "train-window";

export type LearningTag =
  | "learn-first"
  | "sound-first"
  | "forest-song"
  | "waterbird"
  | "shoreline"
  | "raptor"
  | "sparrow"
  | "warbler"
  | "resident"
  | "confusing-pair"
  | "alpine"
  | "train-window";

export interface MediaSource {
  kind: "embedded" | "external" | "placeholder";
  sourceName: string;
  sourceUrl: string;
  license: string;
  credit: string;
  notes: string;
}

export interface SoundProfile {
  description: string;
  mnemonic: string;
  listenFor: string;
  source: MediaSource;
  audioUrl?: string;
  localAudio?: LocalAudioTrack[];
}

export interface Bird {
  id: string;
  commonName: string;
  scientificName: string;
  likelihood: Likelihood;
  priority: number;
  appearance: string;
  habitat: string;
  habitats: HabitatTag[];
  fieldMarks: string[];
  quickHint: string;
  confusion: string;
  memoryHook: string;
  sound: SoundProfile;
  image: MediaSource;
  learningTags: LearningTag[];
  sourceNotes: string;
  researchSources: string[];
}

export type BirdImageLifeStage = "adult" | "juvenile" | "immature" | "unknown";

export type BirdImageSex = "male" | "female" | "pair" | "unknown";

export interface BirdImage {
  id: string;
  birdId: string;
  commonName: string;
  scientificName: string;
  label: string;
  lifeStage: BirdImageLifeStage;
  sex: BirdImageSex;
  imageUrl: string;
  thumbnailUrl: string;
  pageUrl: string;
  sourceName: string;
  license: string;
  credit: string;
  notes: string;
}

export type BirdImageManifest = Record<string, BirdImage[]>;

export type Mastery = "new" | "learning" | "known";

export type AppMode = "browse" | "flashcards" | "quiz" | "sound";

export interface ProgressRecord {
  mastery: Mastery;
  correct: number;
  attempts: number;
}

export type ProgressMap = Record<string, ProgressRecord>;

export interface LocalAudioTrack {
  id: string;
  birdId: string;
  commonName: string;
  scientificName: string;
  url: string;
  originalPath: string;
  dataset: string;
  sourceUrl: string;
  license: string;
  credit: string;
  rating: number | null;
  notes: string;
}

export type LocalAudioManifest = Record<string, LocalAudioTrack[]>;
