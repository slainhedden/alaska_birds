# Talkeetna Bird Learner

Interactive bird-learning deck for a mid-June cabin/train trip near Indian River, the Talkeetna Mountains, and Southcentral Alaska boreal/wetland habitats.

## Run

```bash
npm install
npm run dev
```

The app runs on `http://localhost:5173` by default.

## Validate

```bash
npm run validate
```

This runs ESLint, image and sound manifest checks, the audio-ingest fixture test, TypeScript/Vite build, and Playwright browser tests.

## Deploy To GitHub Pages

This repo includes a GitHub Actions workflow at `.github/workflows/deploy.yml`.

After you create and initialize the GitHub repo:

1. Push this project to the repo's `main` branch.
2. In GitHub, open **Settings -> Pages**.
3. Set **Build and deployment -> Source** to **GitHub Actions**.
4. Push to `main` or run **Deploy to GitHub Pages** from the Actions tab.

The Vite base path is detected automatically from `GITHUB_REPOSITORY`. A normal project repo deploys under `https://<owner>.github.io/<repo>/`; a user/org Pages repo named `<owner>.github.io` deploys at `/`.

For a custom Pages path, set `VITE_BASE_PATH` in the workflow or run locally with:

```bash
VITE_BASE_PATH=/your-repo-name/ npm run build
```

## Local Audio Datasets

The checked-in local sound manifest is generated from licensed Wikimedia Commons and Xeno-canto download/source metadata:

```bash
npm run fetch:sounds
npm run test:sounds
```

If you later want to use manually downloaded BirdCLEF/Kaggle/Xeno-canto-style datasets, place them in `data/audio-source/`, then run:

```bash
npm run ingest:audio
```

Details and licensing caveats are in `docs/audio-ingest.md`.

## Project Shape

- `src/data/birds.ts` contains the researched static bird deck.
- `src/data/imageManifest.ts` contains Wikimedia Commons image metadata for every bird, with checked-in local thumbnails under `public/images/birds/`.
- `src/data/localAudioManifest.ts` contains local audio metadata for every bird.
- `src/components/` contains the browsing, detail, flashcard, quiz, sound quiz, and progress UI.
- `docs/research-log.md` records sources, species criteria, assumptions, and media licensing notes.
- `docs/progress-log.md` records checkpoint progress and validation commands.
- `docs/audio-ingest.md` records local audio dataset ingest instructions.

## Image Refresh

The checked-in image manifest is generated from Wikimedia Commons metadata and cached locally so GitHub Pages does not depend on external thumbnail hosts at runtime:

```bash
npm run fetch:images
npm run test:images
```

`npm run fetch:images` refreshes Commons metadata, downloads reusable thumbnails into `public/images/birds/`, and rewrites the manifest to local paths. `npm run cache:images` verifies an existing local cache without re-querying Commons.

The app displays card thumbnails and a labeled detail gallery with adult, male, female, juvenile, immature, or pair labels when those cues are available in Commons titles/descriptions.
