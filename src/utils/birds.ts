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

export function optionSet(answer: Bird, birds: Bird[], offset: number) {
  const pool = birds.filter((bird) => bird.id !== answer.id);
  const picks: Bird[] = [];

  for (let index = 0; picks.length < 3 && index < pool.length * 2; index += 1) {
    const candidate = pool[(offset + index * 7) % pool.length];
    if (!picks.some((bird) => bird.id === candidate.id)) {
      picks.push(candidate);
    }
  }

  return [...picks, answer].sort((left, right) => left.commonName.localeCompare(right.commonName));
}
