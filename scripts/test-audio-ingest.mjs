import { mkdir, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const testRoot = path.join(repoRoot, ".audio-ingest-test");
const outputRoot = path.join(testRoot, "public-audio");
const manifestPath = path.join(testRoot, "localAudioManifest.ts");
const zipSource = path.join(testRoot, "zip-source");
const zipOutputRoot = path.join(testRoot, "zip-public-audio");
const zipManifestPath = path.join(testRoot, "zipLocalAudioManifest.ts");

await rm(testRoot, { force: true, recursive: true });
await mkdir(testRoot, { recursive: true });

const result = spawnSync(
  process.execPath,
  [
    "scripts/ingest-audio.mjs",
    "--source",
    "data/audio-fixtures",
    "--output",
    path.relative(repoRoot, outputRoot),
    "--manifest",
    path.relative(repoRoot, manifestPath),
    "--clean",
    "--limit-per-bird",
    "2",
  ],
  {
    cwd: repoRoot,
    encoding: "utf8",
  },
);

if (result.status !== 0) {
  throw new Error(`ingest-audio failed:\n${result.stdout}\n${result.stderr}`);
}

const summary = JSON.parse(result.stdout);

if (summary.writtenTracks !== 1 || summary.birdsWithAudio !== 1) {
  throw new Error(`unexpected ingest summary: ${result.stdout}`);
}

const copiedPath = path.join(outputRoot, "common-raven", "common-raven-common-raven-sample.ogg");
await stat(copiedPath);

const manifest = await readFile(manifestPath, "utf8");

if (!manifest.includes("Common Raven") || !manifest.includes("/../.audio-ingest-test")) {
  throw new Error("generated manifest does not include the expected Common Raven test track");
}

await mkdir(zipSource, { recursive: true });
const zipResult = spawnSync("zip", ["-qr", path.join(zipSource, "birdclef-fixture.zip"), "birdclef"], {
  cwd: path.join(repoRoot, "data/audio-fixtures"),
  encoding: "utf8",
});

if (zipResult.status !== 0) {
  throw new Error(`could not create zip fixture:\n${zipResult.stderr}`);
}

const archiveResult = spawnSync(
  process.execPath,
  [
    "scripts/ingest-audio.mjs",
    "--source",
    path.relative(repoRoot, zipSource),
    "--output",
    path.relative(repoRoot, zipOutputRoot),
    "--manifest",
    path.relative(repoRoot, zipManifestPath),
    "--clean",
  ],
  {
    cwd: repoRoot,
    encoding: "utf8",
  },
);

if (archiveResult.status !== 0) {
  throw new Error(`archive ingest failed:\n${archiveResult.stdout}\n${archiveResult.stderr}`);
}

const archiveSummary = JSON.parse(archiveResult.stdout);

if (archiveSummary.archiveFiles !== 1 || archiveSummary.writtenTracks !== 1) {
  throw new Error(`unexpected archive ingest summary: ${archiveResult.stdout}`);
}

console.log("audio ingest fixture passed");
