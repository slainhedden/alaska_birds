import { localAudioManifest } from "../data/localAudioManifest";
import type { Bird, LocalAudioTrack } from "../types";

export function localTracksForBird(bird: Bird): LocalAudioTrack[] {
  return localAudioManifest[bird.id] ?? [];
}

export function preferredAudioUrl(bird: Bird): string | undefined {
  const localUrl = localTracksForBird(bird)[0]?.url;
  return localUrl ? withBasePath(localUrl) : bird.sound.audioUrl;
}

export function hasAnyAudio(bird: Bird): boolean {
  return Boolean(preferredAudioUrl(bird));
}

function withBasePath(url: string): string {
  if (/^[a-z][a-z\d+\-.]*:/i.test(url)) {
    return url;
  }

  const basePath = import.meta.env.BASE_URL || "/";

  if (url.startsWith("/")) {
    return `${basePath.replace(/\/$/, "")}${url}`;
  }

  return `${basePath}${url}`;
}
