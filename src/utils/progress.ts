import type { Bird } from "../types";
import type { Mastery, ProgressMap, ProgressRecord } from "../types";

const storageKey = "talkeetna-bird-progress-v1";

export function emptyRecord(): ProgressRecord {
  return {
    mastery: "new",
    correct: 0,
    attempts: 0,
  };
}

export function loadProgress(birds: Bird[]): ProgressMap {
  const fallback = Object.fromEntries(birds.map((bird) => [bird.id, emptyRecord()]));

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw) as ProgressMap;
    return Object.fromEntries(
      birds.map((bird) => {
        const existing = parsed[bird.id];
        return [bird.id, existing ? normalizeRecord(existing) : emptyRecord()];
      }),
    );
  } catch {
    return fallback;
  }
}

export function saveProgress(progress: ProgressMap) {
  window.localStorage.setItem(storageKey, JSON.stringify(progress));
}

export function updateMastery(
  progress: ProgressMap,
  birdId: string,
  mastery: Mastery,
): ProgressMap {
  const current = progress[birdId] ?? emptyRecord();
  return {
    ...progress,
    [birdId]: {
      ...current,
      mastery,
    },
  };
}

export function recordAnswer(progress: ProgressMap, birdId: string, isCorrect: boolean): ProgressMap {
  const current = progress[birdId] ?? emptyRecord();
  const correct = current.correct + (isCorrect ? 1 : 0);
  const attempts = current.attempts + 1;
  const mastery: Mastery = correct >= 3 ? "known" : attempts > 0 ? "learning" : current.mastery;

  return {
    ...progress,
    [birdId]: {
      mastery,
      correct,
      attempts,
    },
  };
}

export function resetProgress(birds: Bird[]): ProgressMap {
  const fresh = Object.fromEntries(birds.map((bird) => [bird.id, emptyRecord()]));
  saveProgress(fresh);
  return fresh;
}

function normalizeRecord(record: ProgressRecord): ProgressRecord {
  const mastery = ["new", "learning", "known"].includes(record.mastery) ? record.mastery : "new";
  return {
    mastery,
    correct: Number.isFinite(record.correct) ? record.correct : 0,
    attempts: Number.isFinite(record.attempts) ? record.attempts : 0,
  };
}
