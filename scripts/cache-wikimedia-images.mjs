import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.resolve(repoRoot, "public/images/birds");
const manifestPath = path.resolve(repoRoot, "src/data/imageManifest.ts");
const args = parseArgs(process.argv.slice(2));
const cleanOutput = args.clean === true;
const userAgent = "TalkeetnaBirdLearner/0.1 local image cache script";

const { imageManifest } = await import(pathToFileURL(manifestPath).href);
const allThumbnailsAreLocal = Object.values(imageManifest)
  .flat()
  .every((image) => isLocalThumbnail(image.thumbnailUrl));

if (cleanOutput && allThumbnailsAreLocal) {
  throw new Error(
    "Image manifest already points at local cached files. Run npm run fetch:images to refresh from Commons, or run npm run cache:images without --clean to verify the cache.",
  );
}

if (cleanOutput) {
  await rm(outputRoot, { force: true, recursive: true });
}

await mkdir(outputRoot, { recursive: true });

const nextManifest = {};
let totalImages = 0;

for (const [birdId, images] of Object.entries(imageManifest)) {
  nextManifest[birdId] = [];

  for (const image of images) {
    if (isLocalThumbnail(image.thumbnailUrl)) {
      const outputPath = path.join(repoRoot, "public", image.thumbnailUrl.slice(1));

      if (!(await hasUsableFile(outputPath))) {
        throw new Error(`Missing cached image file for ${image.id}: ${image.thumbnailUrl}`);
      }

      nextManifest[birdId].push(image);
      totalImages += 1;
      continue;
    }

    const sourceUrl = cacheDownloadUrl(image.thumbnailUrl);
    const extension = extensionFromUrl(sourceUrl);
    const birdDir = path.join(outputRoot, birdId);
    const outputPath = path.join(birdDir, `${image.id}${extension}`);
    const publicPath = `/${path.relative(path.join(repoRoot, "public"), outputPath).split(path.sep).join("/")}`;

    await mkdir(birdDir, { recursive: true });

    if (!(await hasUsableFile(outputPath))) {
      const response = await fetchImage(sourceUrl);
      await writeFile(outputPath, Buffer.from(await response.arrayBuffer()));
    }

    nextManifest[birdId].push({
      ...image,
      thumbnailUrl: publicPath,
    });

    totalImages += 1;
  }

  console.log(`${images[0]?.commonName ?? birdId}: ${images.length} cached image${images.length === 1 ? "" : "s"}`);
}

await writeFile(manifestPath, renderManifest(nextManifest), "utf8");

console.log(
  JSON.stringify(
    {
      birds: Object.keys(nextManifest).length,
      totalImages,
      outputRoot: path.relative(repoRoot, outputRoot),
      manifest: path.relative(repoRoot, manifestPath),
    },
    null,
    2,
  ),
);

function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const part = argv[index];
    if (!part.startsWith("--")) {
      continue;
    }

    const key = part.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith("--")) {
      parsed[key] = true;
    } else {
      parsed[key] = next;
      index += 1;
    }
  }

  return parsed;
}

async function fetchImage(url) {
  let response;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    await delay(350);
    response = await fetch(url, {
      headers: {
        "User-Agent": userAgent,
      },
    });

    if (response.ok) {
      return response;
    }

    if (response.status !== 429 && response.status < 500) {
      break;
    }

    await delay(retryDelay(response, attempt));
  }

  throw new Error(`Could not download image ${url}: ${response?.status ?? "no response"}`);
}

async function hasUsableFile(filePath) {
  try {
    const fileStat = await stat(filePath);
    return fileStat.size > 1_000;
  } catch {
    return false;
  }
}

function cacheDownloadUrl(url) {
  if (!/^https?:\/\//i.test(url)) {
    throw new Error(`Image thumbnail URL must be http(s) or a cached local path: ${url}`);
  }

  return url;
}

function isLocalThumbnail(url) {
  return url.startsWith("/images/birds/");
}

function retryDelay(response, attempt) {
  const retryAfter = Number.parseInt(response.headers.get("retry-after") ?? "", 10);
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return retryAfter * 1_000;
  }

  return 8_000 * (attempt + 1);
}

function extensionFromUrl(url) {
  const extension = path.extname(new URL(url).pathname).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"].includes(extension)) {
    return extension === ".jpeg" ? ".jpg" : extension;
  }

  return ".jpg";
}

function renderManifest(data) {
  return `import type { BirdImageManifest } from "../types";

export const imageManifest: BirdImageManifest = ${JSON.stringify(data, null, 2)};
`;
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
