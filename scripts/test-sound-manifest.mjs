import { stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = process.cwd();
const { birds } = await import(pathToFileURL(path.join(repoRoot, "src/data/birds.ts")).href);
const { localAudioManifest } = await import(
  pathToFileURL(path.join(repoRoot, "src/data/localAudioManifest.ts")).href
);

const missing = [];
const invalid = [];

for (const bird of birds) {
  const tracks = localAudioManifest[bird.id] ?? [];

  if (tracks.length === 0) {
    missing.push(bird.commonName);
    continue;
  }

  for (const track of tracks) {
    const publicPath = track.url.startsWith("/") ? track.url.slice(1) : track.url;
    const filePath = path.join(repoRoot, "public", publicPath);
    const fileStat = await safeStat(filePath);

    if (
      !track.id ||
      !track.birdId ||
      !track.commonName ||
      !track.scientificName ||
      !track.sourceUrl ||
      !track.license ||
      !track.credit ||
      !track.notes ||
      !track.url.startsWith("/audio/birds/") ||
      !/\.(ogg|mp3|wav|flac|webm)$/i.test(track.url) ||
      !fileStat ||
      fileStat.size < 1_000
    ) {
      invalid.push(`${bird.commonName}: ${track.id || "missing-id"}`);
    }
  }
}

if (missing.length > 0 || invalid.length > 0) {
  throw new Error(
    JSON.stringify(
      {
        missing,
        invalid,
      },
      null,
      2,
    ),
  );
}

console.log(
  JSON.stringify(
    {
      birds: birds.length,
      birdsWithAudio: Object.keys(localAudioManifest).filter(
        (birdId) => localAudioManifest[birdId].length > 0,
      ).length,
      totalTracks: Object.values(localAudioManifest).flat().length,
    },
    null,
    2,
  ),
);

async function safeStat(filePath) {
  try {
    return await stat(filePath);
  } catch {
    return null;
  }
}
