import { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const audioExtensions = new Set([".mp3", ".ogg", ".wav", ".flac", ".m4a"]);

const args = parseArgs(process.argv.slice(2));
const sourceRoot = path.resolve(repoRoot, args.source ?? "data/audio-source");
const outputRoot = path.resolve(repoRoot, args.output ?? "public/audio/birds");
const manifestPath = path.resolve(repoRoot, args.manifest ?? "src/data/localAudioManifest.ts");
const cleanOutput = args.clean === true;
const dryRun = args["dry-run"] === true;
const limitPerBird = Number.parseInt(String(args["limit-per-bird"] ?? "4"), 10);
const minRating = Number.parseFloat(String(args["min-rating"] ?? "0"));
const workRoot = path.resolve(repoRoot, args.work ?? ".audio-ingest-work");

const { birds } = await import(pathToFileURL(path.join(repoRoot, "src/data/birds.ts")).href);
const birdIndex = buildBirdIndex(birds);
const archiveFiles = await findFiles(sourceRoot, [".zip", ".tar", ".tgz", ".gz"]);
const unpackRoot = await unpackArchives(archiveFiles, workRoot);
const scanRoots = unpackRoot ? [sourceRoot, unpackRoot] : [sourceRoot];
const metadataFiles = (await Promise.all(scanRoots.map((root) => findFiles(root, [".csv", ".tsv"])))).flat();
const audioFiles = (await Promise.all(scanRoots.map((root) => findFiles(root, [...audioExtensions])))).flat();
const metadataRows = [];

for (const file of metadataFiles) {
  metadataRows.push(...(await readMetadata(file, sourceRoot)));
}

const candidates = metadataRows.length > 0 ? rowsToCandidates(metadataRows, audioFiles) : [];
const directCandidates = audioFiles.map((audioPath) => directCandidate(audioPath, sourceRoot));
const matched = matchCandidates([...candidates, ...directCandidates], birdIndex);
const selected = selectTracks(matched, limitPerBird, minRating);

if (cleanOutput && !dryRun) {
  await rm(outputRoot, { force: true, recursive: true });
}

if (!dryRun) {
  await mkdir(outputRoot, { recursive: true });
}

const manifest = {};

for (const track of selected) {
  const birdDir = path.join(outputRoot, track.bird.id);
  const extension = path.extname(track.audioPath).toLowerCase();
  const outputFileName = `${track.id}${extension}`;
  const outputPath = path.join(birdDir, outputFileName);
  const url = `/${path.relative(path.join(repoRoot, "public"), outputPath).split(path.sep).join("/")}`;

  if (!dryRun) {
    await mkdir(birdDir, { recursive: true });
    await copyFile(track.audioPath, outputPath);
  }

  manifest[track.bird.id] ??= [];
  manifest[track.bird.id].push({
    id: track.id,
    birdId: track.bird.id,
    commonName: track.bird.commonName,
    scientificName: track.bird.scientificName,
    url,
    originalPath: path.relative(repoRoot, track.audioPath),
    dataset: track.dataset,
    sourceUrl: track.sourceUrl,
    license: track.license,
    credit: track.credit,
    rating: track.rating,
    notes: track.notes,
  });
}

if (!dryRun) {
  await writeFile(manifestPath, renderManifest(manifest), "utf8");
}

const summary = {
  sourceRoot: path.relative(repoRoot, sourceRoot),
  metadataFiles: metadataFiles.length,
  archiveFiles: archiveFiles.length,
  audioFiles: audioFiles.length,
  matchedTracks: matched.length,
  writtenTracks: selected.length,
  birdsWithAudio: Object.keys(manifest).length,
  manifest: path.relative(repoRoot, manifestPath),
  dryRun,
};

console.log(JSON.stringify(summary, null, 2));

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

async function findFiles(root, extensions) {
  try {
    const rootStat = await stat(root);
    if (!rootStat.isDirectory()) {
      return [];
    }
  } catch {
    return [];
  }

  const matches = [];
  const entries = await readdir(root, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      matches.push(...(await findFiles(fullPath, extensions)));
      continue;
    }

    if (extensions.includes(path.extname(entry.name).toLowerCase())) {
      matches.push(fullPath);
    }
  }

  return matches;
}

async function unpackArchives(archives, destinationRoot) {
  if (archives.length === 0) {
    return null;
  }

  await rm(destinationRoot, { force: true, recursive: true });
  await mkdir(destinationRoot, { recursive: true });

  for (const archive of archives) {
    const destination = path.join(destinationRoot, stableSlug(path.basename(archive, path.extname(archive))));
    await mkdir(destination, { recursive: true });
    const lower = archive.toLowerCase();
    const command = lower.endsWith(".zip")
      ? ["unzip", ["-q", "-n", archive, "-d", destination]]
      : ["tar", ["-xf", archive, "-C", destination]];
    const result = spawnSync(command[0], command[1], { encoding: "utf8" });

    if (result.status !== 0) {
      throw new Error(`Could not unpack ${path.relative(repoRoot, archive)}:\n${result.stderr}`);
    }
  }

  return destinationRoot;
}

function buildBirdIndex(birdList) {
  const aliases = new Map();

  for (const bird of birdList) {
    const names = [
      bird.id,
      bird.commonName,
      bird.scientificName,
      bird.commonName.replace(/'/g, ""),
      bird.scientificName.split(" ").join("_"),
      bird.commonName.split(" ").join("_"),
      bird.commonName.split(" ").join("-"),
    ];

    for (const name of names) {
      aliases.set(normalize(name), bird);
    }
  }

  return aliases;
}

async function readMetadata(file, root) {
  const content = await readFile(file, "utf8");
  const delimiter = path.extname(file).toLowerCase() === ".tsv" ? "\t" : ",";
  const rows = parseDelimited(content, delimiter);

  return rows.map((row) => ({
    row,
    metadataFile: file,
    dataset: datasetName(file, root),
  }));
}

function parseDelimited(content, delimiter) {
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) {
    return [];
  }

  const headers = parseLine(lines[0], delimiter).map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = parseLine(line, delimiter);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });
}

function parseLine(line, delimiter) {
  const values = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === delimiter && !quoted) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function rowsToCandidates(rows, allAudioFiles) {
  return rows.flatMap(({ row, metadataFile, dataset }) => {
    const filename =
      value(row, "filename") ??
      value(row, "file") ??
      value(row, "path") ??
      value(row, "filepath") ??
      value(row, "audio_path") ??
      value(row, "recording");
    const name =
      value(row, "common_name") ??
      value(row, "commonName") ??
      value(row, "species") ??
      value(row, "primary_label") ??
      value(row, "ebird_code") ??
      value(row, "label");
    const scientificName =
      value(row, "scientific_name") ?? value(row, "scientificName") ?? value(row, "sci_name");
    const matchedFiles = filename
      ? resolveAudioFromMetadata(filename, metadataFile, allAudioFiles)
      : [];

    return matchedFiles.map((audioPath) => ({
      audioPath,
      name,
      scientificName,
      dataset,
      sourceUrl: value(row, "url") ?? value(row, "source_url") ?? value(row, "xc_id") ?? "",
      license: value(row, "license") ?? value(row, "lic") ?? "Unknown; verify dataset terms before publishing.",
      credit: value(row, "author") ?? value(row, "recordist") ?? value(row, "user_name") ?? "",
      rating: parseRating(value(row, "rating") ?? value(row, "quality")),
      notes: `Matched from metadata file ${path.relative(repoRoot, metadataFile)}.`,
    }));
  });
}

function resolveAudioFromMetadata(filename, metadataFile, allAudioFiles) {
  const normalizedFile = filename.replaceAll("\\", "/");
  const metadataDir = path.dirname(metadataFile);
  const possible = [
    path.resolve(metadataDir, normalizedFile),
    path.resolve(metadataDir, "train_audio", normalizedFile),
    path.resolve(metadataDir, "..", normalizedFile),
    path.resolve(metadataDir, "..", "train_audio", normalizedFile),
    path.resolve(sourceRoot, normalizedFile),
    path.resolve(sourceRoot, "train_audio", normalizedFile),
  ];

  const basename = path.basename(normalizedFile).toLowerCase();
  const suffix = normalizedFile.toLowerCase();
  const byName = allAudioFiles.filter((audioPath) => {
    const relative = path.relative(sourceRoot, audioPath).split(path.sep).join("/").toLowerCase();
    return relative.endsWith(suffix) || path.basename(audioPath).toLowerCase() === basename;
  });

  return [...new Set([...possible, ...byName])].filter((audioPath) => allAudioFiles.includes(audioPath));
}

function directCandidate(audioPath, root) {
  const relative = path.relative(root, audioPath);
  const parts = relative.split(path.sep);
  const parent = parts.length > 1 ? parts[parts.length - 2] : "";
  const stem = path.basename(audioPath, path.extname(audioPath));

  return {
    audioPath,
    name: `${parent} ${stem}`,
    scientificName: parent,
    dataset: datasetName(audioPath, root),
    sourceUrl: "",
    license: "Unknown; verify dataset terms before publishing.",
    credit: "",
    rating: null,
    notes: "Matched from directory or file name without metadata.",
  };
}

function matchCandidates(candidates, aliases) {
  const seen = new Set();
  const matched = [];

  for (const candidate of candidates) {
    const bird =
      aliases.get(normalize(candidate.name)) ??
      aliases.get(normalize(candidate.scientificName)) ??
      fuzzyNameMatch(candidate.name, aliases);

    if (!bird) {
      continue;
    }

    const key = `${bird.id}:${candidate.audioPath}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    matched.push({
      ...candidate,
      bird,
      id: `${bird.id}-${stableSlug(path.basename(candidate.audioPath, path.extname(candidate.audioPath)))}`,
    });
  }

  return matched;
}

function fuzzyNameMatch(name, aliases) {
  const normalized = normalize(name);
  if (!normalized) {
    return null;
  }

  for (const [alias, bird] of aliases.entries()) {
    if (alias.length >= 5 && (normalized.includes(alias) || alias.includes(normalized))) {
      return bird;
    }
  }

  return null;
}

function selectTracks(tracks, limit, minimumRating) {
  const byBird = new Map();
  const sorted = [...tracks].sort((left, right) => {
    const ratingDiff = (right.rating ?? 0) - (left.rating ?? 0);
    return ratingDiff || left.audioPath.localeCompare(right.audioPath);
  });

  for (const track of sorted) {
    if ((track.rating ?? minimumRating) < minimumRating) {
      continue;
    }

    const current = byBird.get(track.bird.id) ?? [];
    if (current.length >= limit) {
      continue;
    }

    current.push(track);
    byBird.set(track.bird.id, current);
  }

  return [...byBird.values()].flat();
}

function renderManifest(manifest) {
  return `import type { LocalAudioManifest } from "../types";

export const localAudioManifest: LocalAudioManifest = ${JSON.stringify(manifest, null, 2)};
`;
}

function value(row, key) {
  const found = Object.keys(row).find((header) => header.toLowerCase() === key.toLowerCase());
  const result = found ? String(row[found]).trim() : "";
  return result.length > 0 ? result : null;
}

function parseRating(raw) {
  if (!raw) {
    return null;
  }

  const normalized = raw.replace(/[^\d.]/g, "");
  const rating = Number.parseFloat(normalized);
  return Number.isFinite(rating) ? rating : null;
}

function datasetName(file, root) {
  const relative = path.relative(root, file);
  if (relative.startsWith("..")) {
    const workRelative = path.relative(workRoot, file).split(path.sep);
    return workRelative[1] || workRelative[0] || "audio-source";
  }

  const sourceRelative = relative.split(path.sep);
  return sourceRelative[0] || "audio-source";
}

function normalize(valueToNormalize) {
  return String(valueToNormalize ?? "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function stableSlug(valueToSlug) {
  return String(valueToSlug)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}
