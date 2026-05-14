import { imageManifest } from "../data/imageManifest";
import type { Bird, BirdImage } from "../types";

export function imagesForBird(bird: Bird): BirdImage[] {
  return imageManifest[bird.id] ?? [];
}

export function primaryImageForBird(bird: Bird): BirdImage | undefined {
  return imagesForBird(bird)[0];
}

export function displayImageUrl(image: BirdImage): string {
  if (/^[a-z][a-z\d+\-.]*:/i.test(image.thumbnailUrl)) {
    return image.thumbnailUrl;
  }

  const basePath = import.meta.env.BASE_URL || "/";

  if (image.thumbnailUrl.startsWith("/")) {
    return `${basePath.replace(/\/$/, "")}${image.thumbnailUrl}`;
  }

  return `${basePath}${image.thumbnailUrl}`;
}
