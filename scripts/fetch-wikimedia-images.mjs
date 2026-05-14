import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.resolve(repoRoot, "src/data/imageManifest.ts");
const { birds } = await import(pathToFileURL(path.join(repoRoot, "src/data/birds.ts")).href);

const manifest = {};
const failures = [];

for (const bird of birds) {
  const images = await findImagesForBird(bird);
  if (images.length === 0) {
    failures.push(bird.commonName);
  }
  manifest[bird.id] = images;
  console.log(`${bird.commonName}: ${images.length} image${images.length === 1 ? "" : "s"}`);
}

if (failures.length > 0) {
  throw new Error(`No Wikimedia Commons images found for: ${failures.join(", ")}`);
}

await mkdir(path.dirname(manifestPath), { recursive: true });
await writeFile(manifestPath, renderManifest(manifest), "utf8");

console.log(
  JSON.stringify(
    {
      birds: birds.length,
      birdsWithImages: Object.keys(manifest).filter((id) => manifest[id].length > 0).length,
      totalImages: Object.values(manifest).reduce((sum, images) => sum + images.length, 0),
      manifest: path.relative(repoRoot, manifestPath),
    },
    null,
    2,
  ),
);

async function findImagesForBird(bird) {
  const queries = [
    `"${bird.scientificName}"`,
    `"${bird.commonName}" bird`,
    `${bird.scientificName} male`,
    `${bird.scientificName} female`,
    `${bird.scientificName} juvenile`,
    `${bird.commonName} male`,
    `${bird.commonName} female`,
    `${bird.commonName} juvenile`,
  ];
  const seen = new Set();
  const candidates = [];

  for (const query of queries) {
    const results = await commonsSearch(query, 12);

    for (const result of results) {
      if (seen.has(result.pageid)) {
        continue;
      }

      seen.add(result.pageid);
      const image = toBirdImage(result, bird);
      if (!image || !looksRelevant(image, bird)) {
        continue;
      }
      candidates.push(image);
    }

    if (variantScore(candidates) >= 3 || candidates.length >= 5) {
      break;
    }
  }

  return candidates
    .sort((left, right) => imageSortScore(right) - imageSortScore(left))
    .slice(0, 5)
    .map((image, index) => ({ ...image, id: `${bird.id}-image-${index + 1}` }));
}

async function commonsSearch(query, limit) {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");
  url.searchParams.set("generator", "search");
  url.searchParams.set("gsrnamespace", "6");
  url.searchParams.set("gsrlimit", String(limit));
  url.searchParams.set("gsrsearch", query);
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "url|mime|extmetadata");
  url.searchParams.set("iiurlwidth", "900");

  let response;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    await delay(1_200);
    response = await fetch(url, {
      headers: {
        "User-Agent": "TalkeetnaBirdLearner/0.1 local research script",
      },
    });

    if (response.ok) {
      break;
    }

    if (response.status !== 429 && response.status < 500) {
      break;
    }

    await delay(8_000 * (attempt + 1));
  }

  if (!response.ok) {
    throw new Error(`Commons API failed for ${query}: ${response.status}`);
  }

  const body = await response.json();
  return Object.values(body.query?.pages ?? {});
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function toBirdImage(page, bird) {
  const info = page.imageinfo?.[0];
  if (!info?.thumburl || !info?.url) {
    return null;
  }

  if (!String(info.mime ?? "").startsWith("image/")) {
    return null;
  }

  const metadata = info.extmetadata ?? {};
  const title = page.title.replace(/^File:/, "");
  const plainDescription = stripHtml(metadata.ImageDescription?.value ?? "");
  const titleAndDescription = `${title} ${plainDescription}`;
  const sex = inferSex(titleAndDescription);
  const lifeStage = inferLifeStage(titleAndDescription);
  const label = labelFor(sex, lifeStage);
  const license =
    stripHtml(metadata.LicenseShortName?.value ?? metadata.License?.value ?? "") ||
    "Wikimedia Commons license metadata unavailable";
  const credit =
    stripHtml(metadata.Artist?.value ?? metadata.Credit?.value ?? metadata.Attribution?.value ?? "") ||
    "Wikimedia Commons contributor";

  return {
    birdId: bird.id,
    commonName: bird.commonName,
    scientificName: bird.scientificName,
    label,
    lifeStage,
    sex,
    imageUrl: info.url,
    thumbnailUrl: info.thumburl,
    pageUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replaceAll(" ", "_"))}`,
    sourceName: "Wikimedia Commons",
    license,
    credit,
    notes: `Commons file: ${title}`,
    _matchText: normalize(titleAndDescription),
    _title: title,
  };
}

function looksRelevant(image, bird) {
  const text = image._matchText;
  const title = image._title.toLowerCase();
  const common = normalize(bird.commonName);
  const scientific = normalize(bird.scientificName);
  const genus = normalize(bird.scientificName.split(" ")[0]);
  const species = normalize(bird.scientificName.split(" ")[1]);

  if (/\bband\b|\balbum\b|\blogo\b|\bcoat of arms\b|\bdistribution map\b|\brange map\b|\bstamp\b|\bskull\b|\bnest hole\b/i.test(title)) {
    return false;
  }

  return (
    text.includes(common) ||
    text.includes(scientific) ||
    (text.includes(genus) && text.includes(species))
  );
}

function imageSortScore(image) {
  let score = 0;
  if (image.lifeStage === "adult") score += 4;
  if (image.sex !== "unknown") score += 3;
  if (image.lifeStage === "juvenile" || image.lifeStage === "immature") score += 2;
  if (!/egg|nest|skull|map|plate|drawing|stamp|range/i.test(image._title)) score += 3;
  if (/featured|quality|valued/i.test(image._title)) score += 1;
  return score;
}

function variantScore(images) {
  const labels = new Set(images.map((image) => image.label));
  return labels.size;
}

function inferSex(text) {
  const lower = text.toLowerCase();
  if (/\bpair\b|\bmated\b|\bcouple\b/.test(lower)) return "pair";
  if (/\bfemale\b|\bhen\b/.test(lower)) return "female";
  if (/\bmale\b|\bcock\b/.test(lower)) return "male";
  return "unknown";
}

function inferLifeStage(text) {
  const lower = text.toLowerCase();
  if (/\bjuvenile\b|\bjuvenal\b|\bfledgling\b|\bchick\b|\byoung\b/.test(lower)) return "juvenile";
  if (/\bimmature\b|\bsubadult\b|\bfirst[- ]winter\b/.test(lower)) return "immature";
  if (/\badult\b|\bmale\b|\bfemale\b|\bbreeding\b/.test(lower)) return "adult";
  return "unknown";
}

function labelFor(sex, lifeStage) {
  const life = lifeStage === "unknown" ? "adult/unspecified" : lifeStage;
  if (sex === "unknown") {
    return life;
  }
  return `${sex} ${life}`;
}

function renderManifest(data) {
  return `import type { BirdImageManifest } from "../types";

export const imageManifest: BirdImageManifest = ${JSON.stringify(stripInternal(data), null, 2)};
`;
}

function stripInternal(data) {
  return Object.fromEntries(
    Object.entries(data).map(([birdId, images]) => [
      birdId,
      images.map(({ _matchText, _title, ...image }) => image),
    ]),
  );
}

function stripHtml(value) {
  return String(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}
