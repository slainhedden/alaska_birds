import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.resolve(repoRoot, "public/audio/birds");
const manifestPath = path.resolve(repoRoot, "src/data/localAudioManifest.ts");
const args = parseArgs(process.argv.slice(2));
const cleanOutput = args.clean === true;
const dryRun = args["dry-run"] === true;
const reuseExisting = args["reuse-existing"] === true;
const limitPerBird = Number.parseInt(String(args["limit-per-bird"] ?? "1"), 10);
const userAgent = "TalkeetnaBirdLearner/0.1 local research script (audio metadata preservation)";

const audioMimes = new Set([
  "application/ogg",
  "audio/flac",
  "audio/mpeg",
  "audio/mp3",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "audio/x-wav",
]);

const aliasMap = {
  "black-billed-magpie": ["Pica pica hudsonia"],
  "canada-jay": ["Gray Jay"],
  "yellow-rumped-warbler": ["Myrtle Warbler", "Dendroica coronata"],
  "common-redpoll": ["Carduelis flammea"],
  "spruce-grouse": ["Falcipennis canadensis"],
  "trumpeter-swan": ["Olor buccinator"],
  "bald-eagle": ["American Bald Eagle"],
  "northern-flicker": ["Yellow-shafted Flicker"],
  "short-billed-gull": ["Mew Gull", "Larus canus brachyrhynchus"],
  "northern-harrier": ["Circus cyaneus hudsonius", "Marsh Hawk"],
  "northern-goshawk": ["American Goshawk", "Accipiter atricapillus"],
  "gray-cheeked-thrush": ["Grey-cheeked Thrush"],
  "townsends-solitaire": ["Townsend's Solitaire"],
};

const { birds } = await import(pathToFileURL(path.join(repoRoot, "src/data/birds.ts")).href);
const existingManifest = reuseExisting ? await readExistingManifest() : {};
const manifest = {};
const failures = [];

if (cleanOutput && !dryRun) {
  await rm(outputRoot, { force: true, recursive: true });
}

if (!dryRun) {
  await mkdir(outputRoot, { recursive: true });
}

for (const bird of birds) {
  if (reuseExisting && existingManifest[bird.id]?.length > 0) {
    manifest[bird.id] = existingManifest[bird.id];
    console.log(`${bird.commonName}: reused ${existingManifest[bird.id].length} existing audio clip`);
    continue;
  }

  const candidates = await findAudioForBird(bird);
  const selected = candidates.slice(0, limitPerBird);

  if (selected.length === 0) {
    failures.push(bird.commonName);
    manifest[bird.id] = [];
    console.log(`${bird.commonName}: no licensed Commons audio found`);
    continue;
  }

  manifest[bird.id] = [];

  for (const [index, candidate] of selected.entries()) {
    const id = `${bird.id}-commons-audio-${index + 1}`;
    const birdDir = path.join(outputRoot, bird.id);
    let outputPath = path.join(birdDir, `${id}${extensionFor(candidate)}`);
    const publicUrl = `/${path.relative(path.join(repoRoot, "public"), outputPath).split(path.sep).join("/")}`;

    if (!dryRun) {
      await mkdir(birdDir, { recursive: true });
      outputPath = await downloadAudio(candidate.downloadUrl, birdDir, id, candidate);
    }

    const resolvedPublicUrl = `/${path.relative(path.join(repoRoot, "public"), outputPath).split(path.sep).join("/")}`;

    manifest[bird.id].push({
      id,
      birdId: bird.id,
      commonName: bird.commonName,
      scientificName: bird.scientificName,
      url: dryRun ? publicUrl : resolvedPublicUrl,
      originalPath: candidate.downloadUrl,
      dataset: "Wikimedia Commons audio",
      sourceUrl: candidate.sourceUrl,
      license: candidate.license,
      credit: candidate.credit,
      rating: null,
      notes: candidate.notes,
    });
  }

  console.log(
    `${bird.commonName}: ${selected.length} audio clip${selected.length === 1 ? "" : "s"} (${selected[0].license})`,
  );
}

if (!dryRun) {
  await writeFile(manifestPath, renderManifest(manifest), "utf8");
}

const totalTracks = Object.values(manifest).reduce((sum, tracks) => sum + tracks.length, 0);
const summary = {
  birds: birds.length,
  birdsWithAudio: Object.values(manifest).filter((tracks) => tracks.length > 0).length,
  totalTracks,
  failures,
  manifest: path.relative(repoRoot, manifestPath),
  outputRoot: path.relative(repoRoot, outputRoot),
  dryRun,
};

console.log(JSON.stringify(summary, null, 2));

if (failures.length > 0) {
  throw new Error(`Missing Commons audio for: ${failures.join(", ")}`);
}

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

async function findAudioForBird(bird) {
  const aliases = [bird.commonName, bird.scientificName, ...(aliasMap[bird.id] ?? [])];
  const queries = buildQueries(bird, aliases);
  const seen = new Set();
  const candidates = [];

  for (const query of queries) {
    const results = await commonsSearch(query, 25);

    for (const page of results) {
      if (seen.has(page.pageid)) {
        continue;
      }

      seen.add(page.pageid);
      const candidate = toAudioCandidate(page, bird, aliases);

      if (!candidate) {
        continue;
      }

      candidates.push(candidate);
    }

    if (candidates.some((candidate) => candidate.strongMatch) && candidates.length >= limitPerBird) {
      break;
    }
  }

  if (candidates.length === 0) {
    candidates.push(...(await findXenoAudioForBird(bird, aliases)));
  }

  return candidates.sort((left, right) => right.score - left.score);
}

function buildQueries(bird, aliases) {
  const queryParts = [
    `"${bird.scientificName}" xeno-canto`,
    `"${bird.scientificName}" audio`,
    `"${bird.scientificName}" call`,
    `"${bird.commonName}" bird sound`,
    `"${bird.commonName}" xeno-canto`,
  ];

  for (const alias of aliases.slice(2)) {
    queryParts.push(`"${alias}" audio`);
    queryParts.push(`"${alias}" xeno-canto`);
  }

  return [...new Set(queryParts)];
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

  let response;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    await delay(1_400);
    response = await fetch(url, {
      headers: {
        "User-Agent": userAgent,
      },
    });

    if (response.ok) {
      break;
    }

    if (response.status !== 429 && response.status < 500) {
      break;
    }

    await delay(6_000 * (attempt + 1));
  }

  if (!response.ok) {
    throw new Error(`Commons API failed for ${query}: ${response.status}`);
  }

  const body = await response.json();
  return Object.values(body.query?.pages ?? {});
}

async function findXenoAudioForBird(bird, aliases) {
  const [genus, species] = bird.scientificName.split(" ");
  const queries = [
    `gen:${genus.toLowerCase()} sp:${species.toLowerCase()}`,
    `en:"=${bird.commonName}"`,
    ...aliases.slice(2).map((alias) => `en:"=${alias}"`),
  ];
  const seen = new Set();
  const candidates = [];

  for (const query of queries) {
    const html = await xenoExploreSearch(query);
    const matches = toXenoCandidatesFromHtml(html, bird, aliases);

    for (const match of matches) {
      if (seen.has(match.xcId)) {
        continue;
      }

      seen.add(match.xcId);
      candidates.push(match);
    }

    if (candidates.length >= limitPerBird) {
      break;
    }
  }

  return candidates;
}

async function xenoExploreSearch(query) {
  const url = new URL("https://xeno-canto.org/explore");
  url.searchParams.set("query", query);
  url.searchParams.set("dir", "0");
  url.searchParams.set("order", "cnt");

  let response;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    await delay(1_400);
    response = await fetch(url, {
      headers: {
        "User-Agent": userAgent,
      },
    });

    if (response.ok) {
      break;
    }

    if (response.status !== 429 && response.status < 500) {
      break;
    }

    await delay(retryDelay(response, attempt));
  }

  if (!response.ok) {
    throw new Error(`Xeno-canto search failed for ${query}: ${response.status}`);
  }

  const html = await response.text();
  if (/Making sure you're not a bot|Anubis/i.test(html)) {
    return "";
  }

  return html;
}

function toXenoCandidatesFromHtml(html, bird, aliases) {
  if (!html) {
    return [];
  }

  const candidates = [];
  const downloadMatches = html.matchAll(/https:\/\/xeno-canto\.org\/(\d+)\/download/g);
  const seen = new Set();

  for (const match of downloadMatches) {
    const xcId = match[1];
    if (seen.has(xcId)) {
      continue;
    }

    seen.add(xcId);
    const index = match.index ?? 0;
    const snippet = html.slice(Math.max(0, index - 2_500), index + 2_500);
    const normalizedSnippet = normalize(stripHtml(snippet));
    const aliasHits = aliases.filter((alias) => normalizedSnippet.includes(normalize(alias)));
    const scientificParts = bird.scientificName.split(" ").map(normalize);
    const genusSpeciesHit = scientificParts.every(
      (part) => part.length > 0 && normalizedSnippet.includes(part),
    );

    if (aliasHits.length === 0 && !genusSpeciesHit) {
      continue;
    }

    const downloadTitle =
      stripHtml(
        snippet.match(/Download file &#039;([^']+?)&#039;/)?.[1] ??
          snippet.match(/Download file '([^']+?)'/)?.[1] ??
          `XC${xcId} - ${bird.commonName} - ${bird.scientificName}.mp3`,
      ) || `XC${xcId} - ${bird.commonName} - ${bird.scientificName}.mp3`;
    const recordist =
      stripHtml(snippet.match(new RegExp(`XC${xcId}: [^'"]+ by ([^'"]+)`))?.[1] ?? "") ||
      "Xeno-canto recordist";
    const licenseUrl = snippet.match(/https:\/\/creativecommons\.org\/licenses\/([^'"]+?)\//)?.[0] ?? "";
    const licenseTitle =
      stripHtml(snippet.match(/title="Creative Commons ([^"]+)"/)?.[1] ?? "") ||
      licenseNameFromUrl(licenseUrl);

    let score = 65;
    if (genusSpeciesHit) score += 25;
    if (normalizedSnippet.includes(normalize(bird.commonName))) score += 20;
    if (/song|call|voice|vocal|alarm|flight/i.test(snippet)) score += 10;

    candidates.push({
      downloadUrl: `https://xeno-canto.org/${xcId}/download`,
      sourceUrl: `https://xeno-canto.org/${xcId}`,
      license: licenseTitle,
      credit: recordist,
      mime: mimeFromTitle(downloadTitle),
      title: downloadTitle,
      xcId,
      score,
      strongMatch: true,
      notes: `Xeno-canto recording XC${xcId}; discovered from Xeno-canto tagged search.`,
    });
  }

  return candidates;
}

function toAudioCandidate(page, bird, aliases) {
  const info = page.imageinfo?.[0];
  if (!info?.url) {
    return null;
  }

  const mime = String(info.mime ?? "").toLowerCase();
  const title = page.title.replace(/^File:/, "");

  if (!audioMimes.has(mime) && !/\.(ogg|oga|mp3|wav|flac|webm)$/i.test(title)) {
    return null;
  }

  const metadata = info.extmetadata ?? {};
  const description = stripHtml(metadata.ImageDescription?.value ?? "");
  const titleAndDescription = `${title} ${description}`;
  const matchText = normalize(titleAndDescription);
  const aliasHits = aliases.filter((alias) => matchText.includes(normalize(alias)));
  const scientificParts = bird.scientificName.split(" ").map(normalize);
  const genusSpeciesHit = scientificParts.every((part) => part.length > 0 && matchText.includes(part));

  if (aliasHits.length === 0 && !genusSpeciesHit) {
    return null;
  }

  const titleLower = title.toLowerCase();
  const license =
    stripHtml(metadata.LicenseShortName?.value ?? metadata.License?.value ?? "") ||
    "Wikimedia Commons license metadata unavailable";
  const credit =
    stripHtml(metadata.Artist?.value ?? metadata.Credit?.value ?? metadata.Attribution?.value ?? "") ||
    "Wikimedia Commons contributor";
  const pageUrl = `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replaceAll(" ", "_"))}`;
  const xcId = titleAndDescription.match(/\bXC(\d{3,})\b/i)?.[1] ?? null;
  const downloadUrl = xcId ? `https://xeno-canto.org/${xcId}/download` : info.url;
  const sourceUrl = xcId ? `https://xeno-canto.org/${xcId}` : pageUrl;
  let score = 0;

  if (matchText.includes(normalize(bird.scientificName)) || genusSpeciesHit) score += 60;
  if (matchText.includes(normalize(bird.commonName))) score += 45;
  if (/xeno[- ]?canto|\bxc\d+/i.test(titleAndDescription)) score += 30;
  if (xcId) score += 12;
  if (/song|call|voice|vocal|alarm|flight/i.test(titleAndDescription)) score += 15;
  if (mime === "application/ogg" || mime === "audio/ogg") score += 8;
  if (/captive|zoo|domestic|rehabilitation/i.test(titleAndDescription)) score -= 15;
  if (/distribution|map|spectrogram|sonogram/i.test(titleLower)) score -= 50;

  return {
    downloadUrl,
    sourceUrl,
    license,
    credit,
    mime,
    title,
    xcId,
    score,
    strongMatch: score >= 75,
    notes: xcId
      ? `Commons file: ${title}; downloaded via Xeno-canto recording XC${xcId}.`
      : `Commons file: ${title}`,
  };
}

async function downloadAudio(url, outputDir, outputId, candidate) {
  let response;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    await delay(1_800);
    response = await fetch(url, {
      headers: {
        "User-Agent": userAgent,
      },
    });

    if (response.ok) {
      break;
    }

    if (response.status !== 429 && response.status < 500) {
      break;
    }

    await delay(retryDelay(response, attempt));
  }

  if (!response.ok) {
    throw new Error(`Could not download ${url}: ${response.status}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 1_000) {
    throw new Error(`Downloaded audio was unexpectedly small: ${url}`);
  }

  const extension = extensionFromHeaders(response.headers) ?? extensionFor(candidate);
  const outputPath = path.join(outputDir, `${outputId}${extension}`);
  await writeFile(outputPath, bytes);
  return outputPath;
}

function retryDelay(response, attempt) {
  const retryAfter = Number.parseInt(response.headers.get("retry-after") ?? "", 10);
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return retryAfter * 1_000;
  }

  return 12_000 * (attempt + 1);
}

function extensionFor(candidate) {
  const titleExtension = path.extname(candidate.title).toLowerCase();
  if ([".ogg", ".oga", ".mp3", ".wav", ".flac", ".webm"].includes(titleExtension)) {
    return titleExtension === ".oga" ? ".ogg" : titleExtension;
  }

  const pathnameExtension = path.extname(new URL(candidate.downloadUrl).pathname).toLowerCase();
  if ([".ogg", ".oga", ".mp3", ".wav", ".flac", ".webm"].includes(pathnameExtension)) {
    return pathnameExtension === ".oga" ? ".ogg" : pathnameExtension;
  }

  if (candidate.mime === "audio/mpeg" || candidate.mime === "audio/mp3") return ".mp3";
  if (candidate.mime === "audio/wav" || candidate.mime === "audio/x-wav") return ".wav";
  if (candidate.mime === "audio/flac") return ".flac";
  if (candidate.mime === "audio/webm") return ".webm";
  return ".ogg";
}

function extensionFromHeaders(headers) {
  const disposition = headers.get("content-disposition") ?? "";
  const filenameMatch = disposition.match(/filename="?([^";]+)"?/i);
  const filenameExtension = filenameMatch ? path.extname(filenameMatch[1]).toLowerCase() : "";
  if ([".ogg", ".oga", ".mp3", ".wav", ".flac", ".webm"].includes(filenameExtension)) {
    return filenameExtension === ".oga" ? ".ogg" : filenameExtension;
  }

  const contentType = String(headers.get("content-type") ?? "").toLowerCase().split(";")[0];
  if (contentType === "audio/mpeg" || contentType === "audio/mp3") return ".mp3";
  if (contentType === "audio/wav" || contentType === "audio/x-wav") return ".wav";
  if (contentType === "audio/flac") return ".flac";
  if (contentType === "audio/webm") return ".webm";
  if (contentType === "audio/ogg" || contentType === "application/ogg") return ".ogg";
  return null;
}

function renderManifest(data) {
  return `import type { LocalAudioManifest } from "../types";

export const localAudioManifest: LocalAudioManifest = ${JSON.stringify(data, null, 2)};
`;
}

async function readExistingManifest() {
  try {
    const { localAudioManifest } = await import(pathToFileURL(manifestPath).href);
    return localAudioManifest;
  } catch {
    return {};
  }
}

function mimeFromTitle(title) {
  const extension = path.extname(title).toLowerCase();
  if (extension === ".mp3") return "audio/mpeg";
  if (extension === ".wav") return "audio/wav";
  if (extension === ".flac") return "audio/flac";
  if (extension === ".webm") return "audio/webm";
  return "audio/ogg";
}

function licenseNameFromUrl(url) {
  const normalized = url.toLowerCase();
  if (normalized.includes("/by-nc-sa/4.0")) return "CC BY-NC-SA 4.0";
  if (normalized.includes("/by-nc-sa/3.0")) return "CC BY-NC-SA 3.0";
  if (normalized.includes("/by-sa/4.0")) return "CC BY-SA 4.0";
  if (normalized.includes("/by-sa/3.0")) return "CC BY-SA 3.0";
  if (normalized.includes("/by-nc/4.0")) return "CC BY-NC 4.0";
  if (normalized.includes("/by-nc/3.0")) return "CC BY-NC 3.0";
  if (normalized.includes("/by/4.0")) return "CC BY 4.0";
  if (normalized.includes("/by/3.0")) return "CC BY 3.0";
  return "Xeno-canto license metadata";
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
  return String(value ?? "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
