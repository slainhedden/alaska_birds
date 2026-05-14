import type { Bird, HabitatTag, Likelihood, ProgressMap } from "../types";

export const likelihoodRank: Record<Likelihood, number> = {
  common: 0,
  possible: 1,
  uncommon: 2,
};

export const habitatLabels: Record<HabitatTag, string> = {
  woods: "Woods",
  river: "River",
  wetland: "Wetland",
  lake: "Lake",
  alpine: "Alpine",
  edge: "Edge",
  town: "Town",
  "train-window": "Train",
};

export const likelihoodLabels: Record<Likelihood, string> = {
  common: "Common",
  possible: "Possible",
  uncommon: "Uncommon",
};

export function sortBirds(birds: Bird[]) {
  return [...birds].sort((left, right) => {
    const likelihoodDiff = likelihoodRank[left.likelihood] - likelihoodRank[right.likelihood];
    if (likelihoodDiff !== 0) {
      return likelihoodDiff;
    }

    return left.priority - right.priority;
  });
}

export function progressScore(progress: ProgressMap) {
  const records = Object.values(progress);
  const known = records.filter((record) => record.mastery === "known").length;
  const learning = records.filter((record) => record.mastery === "learning").length;
  const attempts = records.reduce((sum, record) => sum + record.attempts, 0);
  const correct = records.reduce((sum, record) => sum + record.correct, 0);
  return { known, learning, attempts, correct };
}

export function shuffledBirds(birds: Bird[], seed: string | number) {
  return [...birds].sort(
    (left, right) => seededScore(`${seed}:${left.id}`) - seededScore(`${seed}:${right.id}`),
  );
}

export function optionSet(answer: Bird, birds: Bird[], seed: string | number) {
  const pool = birds.filter((bird) => bird.id !== answer.id);
  const picks = shuffledBirds(pool, `${seed}:distractors`).slice(0, 3);
  return shuffledBirds([...picks, answer], `${seed}:answers`);
}

function seededScore(value: string) {
  let hash = 2_166_136_261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }

  return hash >>> 0;
}
