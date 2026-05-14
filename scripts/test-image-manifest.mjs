import { pathToFileURL } from "node:url";
import path from "node:path";
import { stat } from "node:fs/promises";

const repoRoot = process.cwd();
const { birds } = await import(pathToFileURL(path.join(repoRoot, "src/data/birds.ts")).href);
const { imageManifest } = await import(pathToFileURL(path.join(repoRoot, "src/data/imageManifest.ts")).href);

const missing = [];
const invalid = [];
const labels = new Set();

for (const bird of birds) {
  const images = imageManifest[bird.id] ?? [];

  if (images.length === 0) {
    missing.push(bird.commonName);
    continue;
  }

  for (const image of images) {
    labels.add(image.label);

    if (
      !image.thumbnailUrl ||
      !image.pageUrl ||
      !image.license ||
      !image.credit ||
      !image.label ||
      !/\.(jpg|jpeg|png|webp|gif|tif|tiff|svg)(\?|$)/i.test(image.imageUrl)
    ) {
      invalid.push(`${bird.commonName}: ${image.id}`);
    }

    if (image.thumbnailUrl.startsWith("/images/birds/")) {
      const thumbnailPath = path.join(repoRoot, "public", image.thumbnailUrl.slice(1));
      const thumbnailStat = await safeStat(thumbnailPath);

      if (!thumbnailStat || thumbnailStat.size < 1_000) {
        invalid.push(`${bird.commonName}: ${image.id} missing local thumbnail`);
      }
    } else {
      invalid.push(`${bird.commonName}: ${image.id} thumbnail is not cached locally`);
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
      totalImages: Object.values(imageManifest).flat().length,
      labels: [...labels].sort(),
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
