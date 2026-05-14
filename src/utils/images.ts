import { imageManifest } from "../data/imageManifest";
import type { Bird, BirdImage } from "../types";

export function imagesForBird(bird: Bird): BirdImage[] {
  return imageManifest[bird.id] ?? [];
}

export function primaryImageForBird(bird: Bird): BirdImage | undefined {
  return imagesForBird(bird)[0];
}
